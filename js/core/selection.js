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

    // Return the drag handle of the selected element under (x, y), or null.
    // Lines/arrows: start/end/bend. Boxes/ellipses: 8 resize handles
    // (nw, n, ne, e, se, s, sw, w).
    getHandleAt(x, y) {
        const sel = this.app.selectedElement;
        if (!sel || sel.type === 'text') return null;

        const threshold = 8 / this.app.zoom;

        if (sel.type === 'line' || sel.type === 'arrow' || sel.type === 'dimension') {
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
        } else if (sel.type === 'box' || sel.type === 'ellipse') {
            for (const h of this.boxHandles(sel)) {
                if (Math.abs(x - h.x) < threshold && Math.abs(y - h.y) < threshold) {
                    return { type: h.name };
                }
            }
        }

        return null;
    }

    // The 8 resize-handle positions of a box/ellipse, by compass name.
    boxHandles(el) {
        const minX = Math.min(el.startX, el.endX);
        const maxX = Math.max(el.startX, el.endX);
        const minY = Math.min(el.startY, el.endY);
        const maxY = Math.max(el.startY, el.endY);
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        return [
            { name: 'nw', x: minX, y: minY },
            { name: 'n', x: midX, y: minY },
            { name: 'ne', x: maxX, y: minY },
            { name: 'e', x: maxX, y: midY },
            { name: 'se', x: maxX, y: maxY },
            { name: 's', x: midX, y: maxY },
            { name: 'sw', x: minX, y: maxY },
            { name: 'w', x: minX, y: midY }
        ];
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
