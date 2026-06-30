// js/core/clipboard.js - Copy / paste / duplicate of selected elements

import { notifications } from '../ui/notifications.js';
import { getElementsBounds } from '../utils/geometry.js';

export class Clipboard {
    constructor(app) {
        this.app = app;
        this.items = [];
        // Center of the selection at copy time, so paste can detect (and avoid)
        // dropping the copy exactly on top of the original.
        this.sourceCenter = null;
    }

    copy() {
        this.items = [];

        // Determine what to copy
        const elementsToCopy = this.app.selectedElements.length > 0
            ? this.app.selectedElements
            : (this.app.selectedElement ? [this.app.selectedElement] : []);

        if (elementsToCopy.length === 0) {
            notifications.show('Nothing selected to copy');
            return;
        }

        // Find the bounds of selected elements to calculate center point
        const bounds = getElementsBounds(elementsToCopy, this.app.ctx);

        // Calculate center point of selection
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        this.sourceCenter = { x: centerX, y: centerY };

        // Deep copy elements with relative positions to center
        elementsToCopy.forEach(el => {
            const copiedEl = JSON.parse(JSON.stringify(el));

            // Store relative position to center
            if (copiedEl.type === 'text') {
                copiedEl._offsetX = copiedEl.x - centerX;
                copiedEl._offsetY = copiedEl.y - centerY;
            } else if (copiedEl.type === 'polyline') {
                copiedEl._pointOffsets = copiedEl.points.map(p => ({ x: p.x - centerX, y: p.y - centerY }));
            } else if (copiedEl.type === 'box') {
                copiedEl._startOffsetX = copiedEl.startX - centerX;
                copiedEl._startOffsetY = copiedEl.startY - centerY;
                copiedEl._endOffsetX = copiedEl.endX - centerX;
                copiedEl._endOffsetY = copiedEl.endY - centerY;
            } else {
                copiedEl._startOffsetX = copiedEl.startX - centerX;
                copiedEl._startOffsetY = copiedEl.startY - centerY;
                copiedEl._endOffsetX = copiedEl.endX - centerX;
                copiedEl._endOffsetY = copiedEl.endY - centerY;
                if (copiedEl.bendX !== undefined) {
                    copiedEl._bendOffsetX = copiedEl.bendX - centerX;
                    copiedEl._bendOffsetY = copiedEl.bendY - centerY;
                }
            }

            this.items.push(copiedEl);
        });

        notifications.show(`Copied ${this.items.length} element${this.items.length > 1 ? 's' : ''}`);
    }

    paste() {
        if (this.items.length === 0) {
            return;
        }

        // Clear current selection
        this.app.selectedElement = null;
        this.app.selectedElements = [];

        // Get current mouse position (use last known position)
        const pasteX = this.app.lastMousePos.x;
        const pasteY = this.app.lastMousePos.y;

        // Snap to grid
        let snappedX = this.app.grid.snapToGrid(pasteX);
        let snappedY = this.app.grid.snapToGrid(pasteY);

        // If the paste would land right on top of the source (e.g. copy then
        // paste without moving the mouse), shift it by one grid step so the
        // new copy is visibly separate instead of looking like nothing happened.
        if (this.sourceCenter) {
            const srcX = this.app.grid.snapToGrid(this.sourceCenter.x);
            const srcY = this.app.grid.snapToGrid(this.sourceCenter.y);
            if (snappedX === srcX && snappedY === srcY) {
                const step = this.app.gridSize || 20;
                snappedX += step;
                snappedY += step;
            }
        }

        // Build the pasted elements, repositioned relative to the cursor.
        const idMap = new Map();
        const newElements = this.items.map(el => {
            const newElement = JSON.parse(JSON.stringify(el));

            // Position relative to cursor
            if (newElement.type === 'text') {
                newElement.x = snappedX + (newElement._offsetX || 0);
                newElement.y = snappedY + (newElement._offsetY || 0);
                delete newElement._offsetX;
                delete newElement._offsetY;
            } else if (newElement.type === 'polyline') {
                newElement.points = (newElement._pointOffsets || []).map(o => ({ x: snappedX + o.x, y: snappedY + o.y }));
                delete newElement._pointOffsets;
            } else if (newElement.type === 'box' || newElement.type === 'ellipse') {
                newElement.startX = snappedX + (newElement._startOffsetX || 0);
                newElement.startY = snappedY + (newElement._startOffsetY || 0);
                newElement.endX = snappedX + (newElement._endOffsetX || 0);
                newElement.endY = snappedY + (newElement._endOffsetY || 0);
                delete newElement._startOffsetX;
                delete newElement._startOffsetY;
                delete newElement._endOffsetX;
                delete newElement._endOffsetY;
            } else {
                newElement.startX = snappedX + (newElement._startOffsetX || 0);
                newElement.startY = snappedY + (newElement._startOffsetY || 0);
                newElement.endX = snappedX + (newElement._endOffsetX || 0);
                newElement.endY = snappedY + (newElement._endOffsetY || 0);
                if (newElement.bendX !== undefined) {
                    newElement.bendX = snappedX + (newElement._bendOffsetX || 0);
                    newElement.bendY = snappedY + (newElement._bendOffsetY || 0);
                    delete newElement._bendOffsetX;
                    delete newElement._bendOffsetY;
                }
                delete newElement._startOffsetX;
                delete newElement._startOffsetY;
                delete newElement._endOffsetX;
                delete newElement._endOffsetY;
            }

            // Give the copy a fresh id, remembering the old->new mapping.
            const oldId = newElement.id;
            newElement.id = this.app.genId();
            if (oldId) idMap.set(oldId, newElement.id);
            return newElement;
        });

        // Remap connector bindings: keep them if the target was copied too,
        // otherwise drop them so a pasted connector doesn't grab the original.
        newElements.forEach(el => {
            ['startBinding', 'endBinding'].forEach(key => {
                if (el[key]) {
                    el[key] = idMap.has(el[key].id)
                        ? { ...el[key], id: idMap.get(el[key].id) }
                        : null;
                }
            });
        });

        newElements.forEach(el => {
            this.app.elements.push(el);
            this.app.selectedElements.push(el);
        });

        // Save state and render
        this.app.history.saveState();
        this.app.render();
        notifications.show(`Pasted ${this.items.length} element${this.items.length > 1 ? 's' : ''}`);
    }

    duplicate() {
        this.copy();
        if (this.items.length > 0) {
            this.paste();
        }
    }
}
