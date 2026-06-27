// js/tools/PolylineTool.js - Multi-point line.
// Click to drop each vertex; Esc/Enter or double-click finishes. Unlike the
// other drawing tools this is click-based, not click-and-drag.

export class PolylineTool {
    constructor(app) {
        this.app = app;
        this.active = false;
        this.points = [];
    }

    // Snap a vertex to a shape's nearest connection point (center / edge
    // midpoint) when close, showing the marker; else fall back to the point.
    anchorSnap(px, py) {
        if (this.app.connectors) {
            const snap = this.app.connectors.anchorSnap(px, py, null, 12 / this.app.zoom);
            if (snap) {
                this.app.snapIndicator = { x: snap.x, y: snap.y };
                return { x: snap.x, y: snap.y };
            }
        }
        this.app.snapIndicator = null;
        return { x: px, y: py };
    }

    snapChanged(a, b) {
        if (!a && !b) return false;
        if (!a || !b) return true;
        return a.x !== b.x || a.y !== b.y;
    }

    handleMouseDown(x, y, e) {
        const p = this.anchorSnap(this.app.grid.snapToGrid(x), this.app.grid.snapToGrid(y));
        if (!this.active) {
            this.active = true;
            this.points = [{ x: p.x, y: p.y }];
        } else {
            this.points.push({ x: p.x, y: p.y });
        }
        this.preview(p.x, p.y);
    }

    handleMouseMove(x, y, e) {
        const had = this.app.snapIndicator;
        const p = this.anchorSnap(this.app.grid.snapToGrid(x), this.app.grid.snapToGrid(y));
        if (!this.active) {
            // Hover preview of connection points before the first click.
            if (this.snapChanged(had, this.app.snapIndicator)) this.app.render();
            return;
        }
        this.preview(p.x, p.y);
    }

    handleMouseUp(x, y, e) {
        // Vertices are placed on mouse-down; nothing to do here.
    }

    // Show the committed points plus a rubber-band segment to the cursor.
    preview(cx, cy) {
        const arrows = this.app.polylineArrows || { start: false, end: false };
        this.app.tempElement = {
            type: 'polyline',
            points: [...this.points, { x: cx, y: cy }],
            color: this.app.colorManager.getColor(),
            lineStyle: this.app.lineStyleManager.getLineStyle(),
            startArrow: !!arrows.start,
            endArrow: !!arrows.end
        };
        this.app.render();
    }

    // Commit the polyline (if it has at least two distinct points) and reset.
    finish() {
        const pts = this.dedupe(this.points);
        if (pts.length >= 2) {
            const arrows = this.app.polylineArrows || { start: false, end: false };
            this.app.addElement({
                type: 'polyline',
                points: pts,
                color: this.app.colorManager.getColor(),
                lineStyle: this.app.lineStyleManager.getLineStyle(),
                startArrow: !!arrows.start,
                endArrow: !!arrows.end
            });
        }
        this.cancel();
    }

    cancel() {
        this.active = false;
        this.points = [];
        this.app.tempElement = null;
        this.app.snapIndicator = null;
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
