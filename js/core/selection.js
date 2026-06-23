// js/core/selection.js - Hit-testing and selection helpers

import { isPointNearElement, getNormalizedBox, isElementInBox } from '../utils/geometry.js';

export class Selection {
    constructor(app) {
        this.app = app;
    }

    // Select the topmost element under (x, y), or clear if none.
    selectElement(x, y) {
        this.app.selectedElement = null;

        for (let i = this.app.elements.length - 1; i >= 0; i--) {
            const el = this.app.elements[i];
            if (isPointNearElement(x, y, el, this.app.ctx, this.app.fontSize)) {
                this.app.selectedElement = el;
                break;
            }
        }

        this.app.render();
    }

    // Return the topmost element under (x, y) without changing selection.
    getElementAt(x, y) {
        for (let i = this.app.elements.length - 1; i >= 0; i--) {
            const el = this.app.elements[i];
            if (isPointNearElement(x, y, el, this.app.ctx, this.app.fontSize)) {
                return el;
            }
        }
        return null;
    }

    // Return the drag handle (start/end/bend) of the selected line/arrow
    // under (x, y), or null.
    getHandleAt(x, y) {
        const sel = this.app.selectedElement;
        if (!sel || sel.type === 'text') return null;

        const threshold = 8 / this.app.zoom;

        if (sel.type === 'line' || sel.type === 'arrow') {
            if (Math.abs(x - sel.startX) < threshold && Math.abs(y - sel.startY) < threshold) {
                return { type: 'start' };
            }
            if (Math.abs(x - sel.endX) < threshold && Math.abs(y - sel.endY) < threshold) {
                return { type: 'end' };
            }
            if (sel.bendX !== undefined) {
                if (Math.abs(x - sel.bendX) < threshold && Math.abs(y - sel.bendY) < threshold) {
                    return { type: 'bend' };
                }
            }
        }

        return null;
    }

    // Reposition a line's bend point to keep its right-angle after an
    // endpoint moves.
    recalculateBend(element) {
        const dx = Math.abs(element.endX - element.startX);
        const dy = Math.abs(element.endY - element.startY);

        if (dx > dy) {
            element.bendX = element.endX;
            element.bendY = element.startY;
        } else {
            element.bendX = element.startX;
            element.bendY = element.endY;
        }
    }

    getNormalizedBox(box) {
        return getNormalizedBox(box);
    }

    isElementInBox(element, box) {
        return isElementInBox(element, box);
    }
}
