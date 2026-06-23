// js/tools/BoxTool.js - Rectangle tool

import { LineTool } from './LineTool.js';

export class BoxTool extends LineTool {
    constructor(app) {
        super(app);
        this.elementType = 'box';
    }

    // Boxes drag corner-to-corner with no 90° bend logic.
    handleMouseMove(x, y, e) {
        if (this.isDrawing && this.tempElement) {
            const snappedX = this.app.grid.snapToGrid(x);
            const snappedY = this.app.grid.snapToGrid(y);

            this.tempElement.type = 'box';
            this.tempElement.endX = snappedX;
            this.tempElement.endY = snappedY;
            delete this.tempElement.bendX;
            delete this.tempElement.bendY;

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
        element.color = boxStyle.color;
    }
}
