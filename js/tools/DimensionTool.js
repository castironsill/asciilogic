// js/tools/DimensionTool.js - Not-to-scale dimension line.
// Drag a straight line; on release you type the dimension value, which is
// shown centered on the line (with perpendicular end ticks).

export class DimensionTool {
    constructor(app) {
        this.app = app;
        this.isDrawing = false;
        this.tempElement = null;
    }

    handleMouseDown(x, y, e) {
        this.isDrawing = true;
        const sx = this.app.grid.snapToGrid(x);
        const sy = this.app.grid.snapToGrid(y);
        this.tempElement = { type: 'dimension', startX: sx, startY: sy, endX: sx, endY: sy };
    }

    handleMouseMove(x, y, e) {
        if (!this.isDrawing || !this.tempElement) return;
        this.tempElement.endX = this.app.grid.snapToGrid(x);
        this.tempElement.endY = this.app.grid.snapToGrid(y);
        this.app.tempElement = this.tempElement;
        this.app.render();
    }

    handleMouseUp(x, y, e) {
        if (!this.isDrawing || !this.tempElement) return;
        this.isDrawing = false;

        const el = this.tempElement;
        this.tempElement = null;
        this.app.tempElement = null;

        if (el.startX !== el.endX || el.startY !== el.endY) {
            el.color = this.app.colorManager.getColor();
            this.app.addElement(el);
            // Immediately ask for the dimension value.
            const mid = this.dimensionScreenMidpoint(el);
            this.app.editDimensionValue(el, mid.x, mid.y);
        } else {
            this.app.render();
        }
    }

    // Screen position of the line midpoint, for placing the value input.
    dimensionScreenMidpoint(el) {
        const rect = this.app.mainCanvas.getBoundingClientRect();
        const mx = (el.startX + el.endX) / 2;
        const my = (el.startY + el.endY) / 2;
        return {
            x: rect.left + mx * this.app.zoom + this.app.offsetX,
            y: rect.top + my * this.app.zoom + this.app.offsetY
        };
    }

    getCursor() {
        return 'crosshair';
    }
}
