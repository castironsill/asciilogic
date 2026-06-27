import { getElementsBounds } from '../utils/geometry.js';

export class SelectTool {
    static RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    constructor(app) {
        this.app = app;
        this.isDragging = false;
        this.dragStart = null;
        this.dragHandle = null;
        this.originalElement = null;
        this.originalElements = null;
        this.isSelecting = false;
        this.selectionBox = null;
        this.additiveSelection = false;
        this.baseSelection = [];
    }
    
    handleMouseDown(x, y, e) {
        // With a selection modifier held, never grab a resize handle —
        // the click is meant to add/remove from the selection.
        const modifier = e && (e.shiftKey || e.ctrlKey || e.metaKey);

        // A corner handle of a multi-element selection: start a group resize.
        const groupHandle = modifier ? null : this.app.getGroupHandleAt(x, y);
        if (groupHandle) {
            this.isDragging = true;
            this.dragHandle = groupHandle.type;
            this.dragStart = { x, y };
            this.groupBounds = getElementsBounds(this.app.selectedElements, this.app.ctx);
            this.originalElements = this.app.selectedElements.map(el =>
                JSON.parse(JSON.stringify(el))
            );
            this.updateCursor(groupHandle.type);
            return;
        }

        const handle = modifier ? null : this.app.getHandleAt(x, y);
        if (handle) {
            this.isDragging = true;
            this.dragHandle = handle.type;
            this.dragStart = { x, y };
            // Detach a bound connector endpoint so it can be dragged freely;
            // it re-binds on drop (handleMouseUp).
            const sel = this.app.selectedElement;
            if (sel && handle.type === 'start') sel.startBinding = null;
            if (sel && handle.type === 'end') sel.endBinding = null;
            this.originalElement = JSON.parse(JSON.stringify(this.app.selectedElement));
            this.updateCursor(handle.type);
        } else {
            const clickedElement = this.app.getElementAt(x, y);
            const additive = e && (e.shiftKey || e.ctrlKey || e.metaKey);

            // Shift/Ctrl/Cmd + click toggles an element in/out of the selection.
            if (additive && clickedElement) {
                this.toggleInSelection(clickedElement);
                return;
            }

            const isClickingSelected = this.app.selectedElements.length > 0 ?
                this.app.selectedElements.includes(clickedElement) :
                clickedElement === this.app.selectedElement;

            if (isClickingSelected && clickedElement) {
                this.isDragging = true;
                this.dragHandle = 'move';
                this.dragStart = { x, y };

                if (this.app.selectedElements.length > 0) {
                    this.originalElements = this.app.selectedElements.map(el =>
                        JSON.parse(JSON.stringify(el))
                    );
                } else {
                    this.originalElement = JSON.parse(JSON.stringify(this.app.selectedElement));
                }
                this.app.mainCanvas.style.cursor = 'move';
            } else if (clickedElement) {
                this.app.selectElement(x, y);
                this.app.selectedElements = [];
            } else {
                // Empty click: start a rubber-band box. With a modifier held,
                // add to the existing selection instead of replacing it.
                this.isSelecting = true;
                this.additiveSelection = additive;
                this.baseSelection = additive ? this.currentSelectionList() : [];
                this.selectionBox = {
                    startX: x,
                    startY: y,
                    endX: x,
                    endY: y
                };
                if (!additive) {
                    this.app.selectedElement = null;
                    this.app.selectedElements = [];
                }
            }
        }
    }

    // The current selection as a flat array (handles single or multi).
    currentSelectionList() {
        if (this.app.selectedElements.length > 0) return [...this.app.selectedElements];
        return this.app.selectedElement ? [this.app.selectedElement] : [];
    }

    // Add the element if absent, remove it if already selected.
    toggleInSelection(el) {
        const sel = this.currentSelectionList();
        const idx = sel.indexOf(el);
        if (idx >= 0) sel.splice(idx, 1);
        else sel.push(el);
        this.app.selectedElement = null;
        this.app.selectedElements = sel;
        this.app.render();
    }
    
    handleMouseMove(x, y, e) {
        if (this.isSelecting) {
            this.selectionBox.endX = x;
            this.selectionBox.endY = y;

            const box = this.app.getNormalizedBox(this.selectionBox);
            const inBox = this.app.elements.filter(el =>
                this.app.isElementInBox(el, box)
            );

            if (this.additiveSelection) {
                // Union the box contents with the pre-drag selection.
                const merged = [...this.baseSelection];
                inBox.forEach(el => { if (!merged.includes(el)) merged.push(el); });
                this.app.selectedElements = merged;
            } else {
                this.app.selectedElements = inBox;
            }
            this.app.selectedElement = null;

            this.app.render();
            return;
        }

        if (this.isDragging && (this.app.selectedElement || this.app.selectedElements.length > 0)) {
            const snappedX = this.app.grid.snapToGrid(x);
            const snappedY = this.app.grid.snapToGrid(y);
            const dx = snappedX - this.app.grid.snapToGrid(this.dragStart.x);
            const dy = snappedY - this.app.grid.snapToGrid(this.dragStart.y);
            
            if (this.dragHandle === 'move') {
                if (this.app.selectedElements.length > 0) {
                    this.app.selectedElements.forEach((el, index) => {
                        this.moveElement(el, this.originalElements[index], dx, dy);
                    });
                } else {
                    this.moveElement(this.app.selectedElement, this.originalElement, dx, dy);
                }
            } else if (this.dragHandle === 'start') {
                this.app.selectedElement.startX = snappedX;
                this.app.selectedElement.startY = snappedY;
                if (this.app.selectedElement.bendX !== undefined) {
                    this.app.recalculateBend(this.app.selectedElement);
                }
            } else if (this.dragHandle === 'end') {
                this.app.selectedElement.endX = snappedX;
                this.app.selectedElement.endY = snappedY;
                if (this.app.selectedElement.bendX !== undefined) {
                    this.app.recalculateBend(this.app.selectedElement);
                }
            } else if (this.dragHandle === 'bend') {
                this.app.selectedElement.bendX = snappedX;
                this.app.selectedElement.bendY = snappedY;
            } else if (SelectTool.RESIZE_HANDLES.includes(this.dragHandle)) {
                this.resizeBox(this.dragHandle, snappedX, snappedY);
            } else if (this.dragHandle && this.dragHandle.startsWith('group-')) {
                // Use raw (unsnapped) coords for smooth proportional scaling.
                this.scaleGroup(this.dragHandle, x, y);
            }

            this.app.render();
            return;
        }

        if (!this.isDragging && !this.isSelecting) {
            const handle = this.app.getHandleAt(x, y) || this.app.getGroupHandleAt(x, y);
            if (handle) {
                this.updateCursor(handle.type);
            } else if (this.app.getElementAt(x, y)) {
                this.app.mainCanvas.style.cursor = 'move';
            } else {
                this.app.mainCanvas.style.cursor = 'default';
            }
        }
    }
    
    handleMouseUp(x, y, e) {
        if (this.isSelecting) {
            this.isSelecting = false;
            this.selectionBox = null;
            this.additiveSelection = false;
            this.baseSelection = [];
            this.app.render();
            return;
        }

        if (this.isDragging) {
            const draggedHandle = this.dragHandle;
            const sel = this.app.selectedElement;

            this.isDragging = false;
            this.dragHandle = null;
            this.dragStart = null;
            this.originalElement = null;
            this.originalElements = null;

            // A dropped connector endpoint binds to whatever shape it's over
            // (dimensions are not connectors, so they never bind).
            if (sel && this.app.connectors && this.app.connectors.isConnector(sel) &&
                (draggedHandle === 'start' || draggedHandle === 'end')) {
                this.app.connectors.bindEndpoint(sel, draggedHandle);
            }

            this.app.history.saveState();
            this.updateCursor();
            return;
        }
    }
    
    // Translate an element by (dx,dy) from its original geometry.
    moveElement(el, original, dx, dy) {
        if (el.type === 'text') {
            el.x = original.x + dx;
            el.y = original.y + dy;
        } else if (el.type === 'polyline') {
            el.points = original.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        } else {
            el.startX = original.startX + dx;
            el.startY = original.startY + dy;
            el.endX = original.endX + dx;
            el.endY = original.endY + dy;
            if (el.bendX !== undefined) {
                el.bendX = original.bendX + dx;
                el.bendY = original.bendY + dy;
            }
        }
    }

    // Resize a box/ellipse by dragging the named handle; the opposite
    // edge(s) stay anchored. Works off the original (pre-drag) geometry.
    resizeBox(handle, snappedX, snappedY) {
        const o = this.originalElement;
        const el = this.app.selectedElement;
        if (!o || !el) return;

        let minX = Math.min(o.startX, o.endX);
        let maxX = Math.max(o.startX, o.endX);
        let minY = Math.min(o.startY, o.endY);
        let maxY = Math.max(o.startY, o.endY);

        if (handle.includes('w')) minX = snappedX;
        if (handle.includes('e')) maxX = snappedX;
        if (handle.includes('n')) minY = snappedY;
        if (handle.includes('s')) maxY = snappedY;

        // Normalize so dragging an edge past the opposite one just flips it.
        el.startX = Math.min(minX, maxX);
        el.endX = Math.max(minX, maxX);
        el.startY = Math.min(minY, maxY);
        el.endY = Math.max(minY, maxY);
    }

    // Proportionally scale the whole selection about the corner opposite the
    // dragged handle. The factor follows the pointer's projection along the
    // bounding box's diagonal, so corner dragging feels natural.
    scaleGroup(handle, x, y) {
        const b = this.groupBounds;
        if (!b) return;
        const anchors = {
            'group-nw': { x: b.maxX, y: b.maxY },
            'group-ne': { x: b.minX, y: b.maxY },
            'group-se': { x: b.minX, y: b.minY },
            'group-sw': { x: b.maxX, y: b.minY }
        };
        const corners = {
            'group-nw': { x: b.minX, y: b.minY },
            'group-ne': { x: b.maxX, y: b.minY },
            'group-se': { x: b.maxX, y: b.maxY },
            'group-sw': { x: b.minX, y: b.maxY }
        };
        const a = anchors[handle], c = corners[handle];
        const ox = c.x - a.x, oy = c.y - a.y;
        const denom = ox * ox + oy * oy;
        if (denom === 0) return;
        let s = ((x - a.x) * ox + (y - a.y) * oy) / denom;
        s = Math.max(0.05, s);

        this.app.selectedElements.forEach((el, i) => {
            this.scaleElement(el, this.originalElements[i], s, a.x, a.y);
        });
    }

    // Scale one element about (ax, ay) by factor s, from its original geometry.
    scaleElement(el, o, s, ax, ay) {
        const sx = (v) => ax + (v - ax) * s;
        const sy = (v) => ay + (v - ay) * s;
        if (el.type === 'text') {
            el.x = sx(o.x);
            el.y = sy(o.y);
            el.fontSize = Math.max(4, (o.fontSize || 16) * s);
        } else if (el.type === 'polyline') {
            el.points = o.points.map(p => ({ x: sx(p.x), y: sy(p.y) }));
        } else {
            el.startX = sx(o.startX);
            el.startY = sy(o.startY);
            el.endX = sx(o.endX);
            el.endY = sy(o.endY);
            if (o.bendX !== undefined) {
                el.bendX = sx(o.bendX);
                el.bendY = sy(o.bendY);
            }
        }
    }

    updateCursor(handleType) {
        const cursors = {
            start: 'pointer', end: 'pointer', bend: 'pointer', move: 'move',
            nw: 'nwse-resize', se: 'nwse-resize',
            ne: 'nesw-resize', sw: 'nesw-resize',
            n: 'ns-resize', s: 'ns-resize',
            e: 'ew-resize', w: 'ew-resize',
            'group-nw': 'nwse-resize', 'group-se': 'nwse-resize',
            'group-ne': 'nesw-resize', 'group-sw': 'nesw-resize'
        };
        this.app.mainCanvas.style.cursor = cursors[handleType] || 'default';
    }
}