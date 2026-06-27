# asciilogic

A browser-based tool for sketching ASCII diagrams — boxes, lines, arrows,
circles, and text — and exporting them as ASCII or Unicode art (or PNG, SVG,
DXF). Built for simple, quick diagrams you can paste straight into code
comments, READMEs, or chat.

Live: https://asciilogic.com

## Features

- Tools: select, line, arrow, box, ellipse/circle, text.
- Lines and arrows attach to shapes and stay connected when you move or
  resize the shape.
- 90-degree line bends and grid snapping (the grid can be hidden without
  turning off snapping).
- Box and ellipse fills: none, solid, or hatch patterns (diagonal,
  crosshatch, horizontal, vertical, dots).
- One color control that applies to any element type.
- Light or dark editor theme (toggle in the top bar; remembered between visits).
- Multi-line text with adjustable font size.
- Resize handles for boxes and circles.
- Multi-select by drag-box or Shift/Ctrl/Cmd+click; move, resize (group
  corner handles), nudge (arrow keys), or restyle the selection together.
- Stacking order: bring to front / send to back (`]` / `[`).
- Optional center-line snapping to align shapes of different sizes, and a
  center marker when attaching a line to a shape.
- Copy/paste/duplicate, undo/redo, and autosave to the browser.
- Import existing ASCII art back into editable elements.
- Import DXF (CAD) drawings and symbols — lines, polylines, circles, arcs,
  ellipses, text, and blocks. (DWG isn't supported; convert it to DXF first.)
- Export to ASCII (plain or Unicode box-drawing), PNG, SVG, or DXF, with a
  dark, white, or transparent background and an optional watermark.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `V` `L` `A` `B` `C` `T` | Select, Line, Arrow, Box, Ellipse, Text |
| `Ctrl+C` / `Ctrl+V` / `Ctrl+D` | Copy / Paste / Duplicate |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+S` | Save |
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

The pure logic (geometry, export/import, connectors, color) is covered by
Vitest. The shipped site has no runtime dependencies; the test tooling is a
dev dependency only.

    npm install
    npm test

## Project structure

    index.html        Markup and toolbar
    css/style.css     Styles
    js/
      app.js          Entry point
      DrawingApp.js   App controller
      core/           render, history, storage, selection, clipboard, connectors
      tools/          select, line, arrow, box, ellipse, text
      utils/          export, ascii import, geometry, grid, colors, styles
    tests/            Vitest suites

## Deployment

Hosted on GitHub Pages with a custom domain via the `CNAME` file. Pushing to
`main` deploys.

## License

MIT. See [LICENSE](LICENSE).

## Acknowledgments

Inspired by [ASCIIFlow](https://asciiflow.com). Written in vanilla JavaScript
with no framework.
