// js/tools/BoxTool.js - Rectangle tool

import { LineTool } from './LineTool.js';

export class BoxTool extends LineTool {
    constructor(app) {
        super(app);
        this.elementType = 'box';
    }

    handleMouseDown(x, y, e) {
        super.handleMouseDown(x, y, e);
        // Remember where the drag began. It's the corner for a normal drag and
        // the center when drawing from the center (Alt).
        if (this.tempElement) {
            this.anchorX = this.tempElement.startX;
            this.anchorY = this.tempElement.startY;
        }
    }

    // Boxes (and ellipses) drag corner-to-corner with no 90° bend logic.
    // Modifiers: Shift constrains to a square / circle (equal width & height);
    // Alt draws from the center outward (drag distance = the radius).
    handleMouseMove(x, y, e) {
        if (this.isDrawing && this.tempElement) {
            const snappedX = this.app.grid.snapToGrid(x);
            const snappedY = this.app.grid.snapToGrid(y);

            this.tempElement.type = this.elementType;
            delete this.tempElement.bendX;
            delete this.tempElement.bendY;

            const ax = this.anchorX;
            const ay = this.anchorY;
            let dx = snappedX - ax;
            let dy = snappedY - ay;

            // Shift: equal extent on both axes (square box / circular ellipse),
            // keeping the direction the pointer was dragged on each axis.
            if (e && e.shiftKey) {
                const m = Math.max(Math.abs(dx), Math.abs(dy));
                dx = (dx < 0 ? -1 : 1) * m;
                dy = (dy < 0 ? -1 : 1) * m;
            }

            if (e && e.altKey) {
                // From center: the anchor is the middle, so grow symmetrically.
                this.tempElement.startX = ax - dx;
                this.tempElement.startY = ay - dy;
                this.tempElement.endX = ax + dx;
                this.tempElement.endY = ay + dy;
            } else {
                this.tempElement.startX = ax;
                this.tempElement.startY = ay;
                this.tempElement.endX = ax + dx;
                this.tempElement.endY = ay + dy;
            }

            this.applyBoxStyle(this.tempElement);

            this.app.tempElement = this.tempElement;
            this.app.render();
        }
    }

    finalizeElement(element) {
        this.applyBoxStyle(element);
    }

    applyBoxStyle(element) {
        const boxStyle = this.app.boxStyleManager.getBoxStyle();
        element.fill = boxStyle.fill;
        element.pattern = boxStyle.pattern;
        // Color is shared across all element types (ColorManager).
        element.color = this.app.colorManager.getColor();
    }
}
