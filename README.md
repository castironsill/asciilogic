# asciilogic

A browser-based tool for sketching diagrams — boxes, lines, arrows, circles,
polylines, dimensions, and text — and exporting them as ASCII or Unicode art
(or PNG, SVG, DXF). Built for simple, quick diagrams you can paste straight
into code comments, READMEs, or chat. No build step, no framework, no runtime
dependencies.

Live: https://asciilogic.com

## Features

- Tools: select, line, arrow, box, ellipse/circle, polyline, dimension, text.
- Lines, arrows, and polylines attach to shapes and (for line/arrow) stay
  connected when you move or resize the shape. While attaching, the nearest
  connection point — the shape's center or an edge midpoint — is previewed with
  a marker and snapped to.
- 90-degree line bends and grid snapping (the grid can be hidden without
  turning off snapping).
- Optional center-line snapping to align shapes of different sizes by their
  centers (toggle in the top bar), with live alignment guides.
- Box and ellipse fills: none, solid, or hatch patterns (diagonal,
  crosshatch, horizontal, vertical, dots).
- Polylines can carry an arrowhead on the start, end, or both.
- One color control (swatches) that applies to any element type.
- Light or dark editor theme (toggle in the top bar; remembered between visits).
- Multi-line text with adjustable font size.
- Resize handles for boxes and circles; group corner handles scale a whole
  multi-selection proportionally.
- Multi-select by drag-box or Shift/Ctrl/Cmd+click; move, resize, nudge (arrow
  keys), reorder (`[` / `]`), or restyle the selection together.
- Copy/paste/duplicate, undo/redo, and autosave to the browser.
- Import existing ASCII art back into editable elements.
- Import DXF (CAD) drawings and symbols — lines, polylines (incl. bulged/
  rounded corners), circles, arcs, ellipses, splines, text, and blocks
  (inserts). Imported elements are selected so you can move or resize them
  immediately. (DWG isn't supported; convert it to DXF first.)
- Export to ASCII (plain or Unicode box-drawing), PNG, SVG, or DXF, with a
  dark, white, or transparent background and an optional watermark.
- Mouse and touch input (one finger draws, two fingers pinch-zoom/pan,
  double-tap edits text).
- Accessibility statement at `/accessibility.html` (see Accessibility below).

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `V` `L` `A` `B` `C` `P` `D` `T` | Select, Line, Arrow, Box, Ellipse, Polyline, Dimension, Text |
| `Ctrl+C` / `Ctrl+V` / `Ctrl+D` | Copy / Paste / Duplicate |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+S` | Save |
| Arrow keys | Nudge selection 1px (`Shift` = one grid step) |
| `]` / `[` | Bring to front / send to back |
| `Delete` | Delete selection |
| `Shift`/`Ctrl`/`Cmd` + Click | Add or remove from selection |
| `Shift+Drag` or middle-mouse | Pan |
| Mouse wheel | Zoom |

When typing text, `Enter` starts a new line; `Esc` or clicking away finishes.

## Running locally

It is a static site with no build step. Serve the folder with any static
server — for example VS Code's Live Server extension (right-click
`index.html` → Open with Live Server), or:

    python -m http.server

then open http://localhost:8000.

## Tests

The pure logic (geometry, export/import, connectors, color, DXF, group
scaling) is covered by Vitest. The shipped site has no runtime dependencies;
the test tooling is a dev dependency only.

    npm install
    npm test

Prefer adding/keeping logic in pure, DOM-free functions so it can be unit
tested (see `js/utils/geometry.js`, `js/core/connectors.js`,
`js/utils/dxfImport.js`). UI wiring lives in the managers and is not unit
tested.

## Project structure

    index.html          Markup, toolbar, and modals (help / export / import)
    accessibility.html  Accessibility statement
    css/style.css       Styles (theme tokens in :root + [data-theme="light"])
    js/
      app.js            Entry point; APP_VERSION lives here
      DrawingApp.js     App controller: state, event wiring, render loop,
                        keyboard, z-order, nudge, align guides, snap markers
      core/
        render.js       Renderer.drawElement and per-type drawing
        selection.js    hit-testing, resize/group handles
        connectors.js   line/arrow <-> shape bindings; anchor (center/edge) snap
        clipboard.js    copy / paste / duplicate
        history.js      undo / redo (state snapshots)
        storage.js      localStorage autosave / load
      tools/            select, line, arrow, box, ellipse, polyline,
                        dimension, text (index.js re-exports them)
      ui/               modals.js, controls.js, notifications.js
      utils/            export.js, asciiImport.js, dxfImport.js, geometry.js,
                        grid.js, colors.js, colorManager.js, boxStyles.js,
                        lineStyles.js, zigzag.js
    tests/              Vitest suites

## Architecture notes (for future changes)

- **Element model.** `app.elements` is a flat, z-ordered array (later = on top).
  Each element is a plain object with a `type` and an `id`:
  - `box` / `ellipse`: `startX,startY,endX,endY, fill, pattern, color`
  - `line` / `arrow`: `startX,startY,endX,endY, bendX?,bendY?, lineStyle,
    color, label?, labelFontSize?, startBinding?, endBinding?`
  - `polyline`: `points:[{x,y}], lineStyle, color, startArrow?, endArrow?`
  - `text`: `x, y, text, fontSize, color`
  - `dimension`: `startX,startY,endX,endY, text?, fontSize?, color`
- **Coordinates.** Elements store world coordinates. `render()` translates by
  `offsetX/offsetY` and scales by `zoom`; screen→world is
  `(clientX - rect.left - offsetX) / zoom`. The grid is a separate canvas
  (`grid-canvas`) under the main canvas.
- **Tools.** Registered in `setupTools()`. Each implements
  `handleMouseDown/Move/Up(x, y, e)` (x,y are world coords) and `getCursor()`.
  `DrawingApp` routes mouse/touch events to the active tool; touch events are
  translated into synthetic mouse events.
- **Connectors.** A line/arrow endpoint may carry a binding
  `{ id, fracX, fracY }`; `connectors.refresh()` (called from `render()`)
  keeps bound endpoints on their shape after moves/resizes. `anchorSnap()`
  finds the nearest connection point (center or edge midpoint).
- **Snapping.** Three independent kinds: grid (`grid.snapToGrid`), shape-center
  alignment for moves (SelectTool, `app.alignSnap`), and connector anchors
  (center/edge midpoints). `app.snapIndicator` / `app.alignGuides` drive the
  live overlays.
- **Managers** (constructed in `initializeComponents()`) own one concern each:
  rendering, selection, connectors, history, storage, export, ASCII/DXF import,
  clipboard, grid, modals, controls, notifications, and the style/color
  controls.
- **Persistence.** Autosave to `localStorage` every 30s and after edits.
  Theme and first-visit flags also live in `localStorage`.

## Conventions

- **Versioning.** Bump `APP_VERSION` in `js/app.js` and mirror it in
  `package.json` for each feature/fix (helps confirm the browser isn't serving
  a stale cached build).
- **Deploy.** Hosted on GitHub Pages with a custom domain via `CNAME`.
  Pushing to `main` deploys to https://asciilogic.com.
- **No dependencies** in the shipped site — keep it vanilla JS, no build step.

## Accessibility

The UI chrome (toolbar, controls, modals) is labelled and keyboard-operable
with visible focus, and a statement is published at `/accessibility.html`.
Known limitation: the freeform drawing **canvas** is not yet operable by
keyboard or screen reader; the ASCII export provides a text alternative. See
the statement for the full picture and the feedback channel.

## Deployment

Hosted on GitHub Pages with a custom domain via the `CNAME` file. Pushing to
`main` deploys.

## License

MIT. See [LICENSE](LICENSE).

## Acknowledgments

Inspired by [ASCIIFlow](https://asciiflow.com). Written in vanilla JavaScript
with no framework.
