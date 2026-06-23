// js/tools/PolylineTool.js - Multi-point line.
// Click to drop each vertex; Esc/Enter or double-click finishes. Unlike the
// other drawing tools this is click-based, not click-and-drag.

export class PolylineTool {
    constructor(app) {
        this.app = app;
        this.active = false;
        this.points = [];
    }

    handleMouseDown(x, y, e) {
        const sx = this.app.grid.snapToGrid(x);
        const sy = this.app.grid.snapToGrid(y);
        if (!this.active) {
            this.active = true;
            this.points = [{ x: sx, y: sy }];
        } else {
            this.points.push({ x: sx, y: sy });
        }
        this.preview(sx, sy);
    }

    handleMouseMove(x, y, e) {
        if (!this.active) return;
        this.preview(this.app.grid.snapToGrid(x), this.app.grid.snapToGrid(y));
    }

    handleMouseUp(x, y, e) {
        // Vertices are placed on mouse-down; nothing to do here.
    }

    // Show the committed points plus a rubber-band segment to the cursor.
    preview(cx, cy) {
        this.app.tempElement = {
            type: 'polyline',
            points: [...this.points, { x: cx, y: cy }],
            color: this.app.colorManager.getColor(),
            lineStyle: this.app.lineStyleManager.getLineStyle()
        };
        this.app.render();
    }

    // Commit the polyline (if it has at least two distinct points) and reset.
    finish() {
        const pts = this.dedupe(this.points);
        if (pts.length >= 2) {
            this.app.addElement({
                type: 'polyline',
                points: pts,
                color: this.app.colorManager.getColor(),
                lineStyle: this.app.lineStyleManager.getLineStyle()
            });
        }
        this.cancel();
    }

    cancel() {
        this.active = false;
        this.points = [];
        this.app.tempElement = null;
        this.app.render();
    }

    // Drop consecutive duplicate points (e.g. the double-click that finishes).
    dedupe(points) {
        const out = [];
        for (const p of points) {
            const last = out[out.length - 1];
            if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
        }
        return out;
    }

    getCursor() {
        return 'crosshair';
    }
}
