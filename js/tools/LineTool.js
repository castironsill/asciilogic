// js/tools/LineTool.js - Line drawing tool

export class LineTool {
    constructor(app) {
        this.app = app;
        this.isDrawing = false;
        this.tempElement = null;
        // Subclasses (ArrowTool, BoxTool) override the element type they create.
        this.elementType = 'line';
    }

    // Lines and arrows attach to shapes; boxes/ellipses (subclasses) do not.
    isConnectorType() {
        return this.elementType === 'line' || this.elementType === 'arrow';
    }

    // Snap a point to a shape's nearest connection point (center or edge
    // midpoint) when close, showing the marker. Applies to both the start and
    // the end of a connector.
    anchorSnap(px, py) {
        if (this.isConnectorType() && this.app.connectors) {
            const snap = this.app.connectors.anchorSnap(px, py, null, 12 / this.app.zoom);
            if (snap) {
                this.app.snapIndicator = { x: snap.x, y: snap.y };
                return { x: snap.x, y: snap.y };
            }
        }
        this.app.snapIndicator = null;
        return { x: px, y: py };
    }

    handleMouseDown(x, y, e) {
        this.isDrawing = true;
        const p = this.anchorSnap(this.app.grid.snapToGrid(x), this.app.grid.snapToGrid(y));
        const snappedX = p.x;
        const snappedY = p.y;

        this.tempElement = {
            type: this.elementType,
            startX: snappedX,
            startY: snappedY,
            endX: snappedX,
            endY: snappedY
        };
    }

    handleMouseMove(x, y, e) {
        if (this.isDrawing && this.tempElement) {
            const p = this.anchorSnap(this.app.grid.snapToGrid(x), this.app.grid.snapToGrid(y));
            const snappedX = p.x;
            const snappedY = p.y;

            const dx = snappedX - this.tempElement.startX;
            const dy = snappedY - this.tempElement.startY;
            
            if (!this.tempElement.direction) {
                if (Math.abs(dx) >= this.app.gridSize || Math.abs(dy) >= this.app.gridSize) {
                    if (Math.abs(dx) > Math.abs(dy)) {
                        this.tempElement.direction = 'horizontal';
                        this.tempElement.firstSegmentEnd = { x: snappedX, y: this.tempElement.startY };
                    } else {
                        this.tempElement.direction = 'vertical';
                        this.tempElement.firstSegmentEnd = { x: this.tempElement.startX, y: snappedY };
                    }
                }
                this.tempElement.endX = this.tempElement.startX;
                this.tempElement.endY = this.tempElement.startY;
            } else {
                if (this.tempElement.direction === 'horizontal') {
                    const firstSegmentX = snappedX;
                    
                    if (Math.abs(snappedY - this.tempElement.startY) >= this.app.gridSize) {
                        this.tempElement.bendX = firstSegmentX;
                        this.tempElement.bendY = this.tempElement.startY;
                        this.tempElement.endX = firstSegmentX;
                        this.tempElement.endY = snappedY;
                    } else {
                        this.tempElement.endX = firstSegmentX;
                        this.tempElement.endY = this.tempElement.startY;
                        delete this.tempElement.bendX;
                        delete this.tempElement.bendY;
                    }
                } else {
                    const firstSegmentY = snappedY;
                    
                    if (Math.abs(snappedX - this.tempElement.startX) >= this.app.gridSize) {
                        this.tempElement.bendX = this.tempElement.startX;
                        this.tempElement.bendY = firstSegmentY;
                        this.tempElement.endX = snappedX;
                        this.tempElement.endY = firstSegmentY;
                    } else {
                        this.tempElement.endX = this.tempElement.startX;
                        this.tempElement.endY = firstSegmentY;
                        delete this.tempElement.bendX;
                        delete this.tempElement.bendY;
                    }
                }
            }
            
            this.app.tempElement = this.tempElement;
            this.app.render();
        } else if (this.isConnectorType()) {
            // Hover preview: show the snap marker for the nearest anchor before
            // the user starts drawing, so connection points are discoverable.
            const had = this.app.snapIndicator;
            this.anchorSnap(this.app.grid.snapToGrid(x), this.app.grid.snapToGrid(y));
            if (this.snapChanged(had, this.app.snapIndicator)) this.app.render();
        }
    }

    snapChanged(a, b) {
        if (!a && !b) return false;
        if (!a || !b) return true;
        return a.x !== b.x || a.y !== b.y;
    }
    
    handleMouseUp(x, y, e) {
        if (this.isDrawing && this.tempElement) {
            this.isDrawing = false;
            
            if (this.tempElement.direction) {
                delete this.tempElement.direction;
                delete this.tempElement.firstSegmentEnd;
            }
            
            if (this.tempElement.startX !== this.tempElement.endX ||
                this.tempElement.startY !== this.tempElement.endY) {
                this.finalizeElement(this.tempElement);
                this.app.addElement(this.tempElement);
            }

            this.tempElement = null;
            this.app.tempElement = null;
            this.app.snapIndicator = null;
            this.app.render();
        }
    }

    // Stamp style onto the element just before it's committed.
    // Overridden by BoxTool to apply fill/pattern instead.
    finalizeElement(element) {
        element.lineStyle = this.app.lineStyleManager.getLineStyle();
        element.color = this.app.colorManager.getColor();
        // Attach either end that lands on a shape so it follows when moved.
        if (this.app.connectors) {
            this.app.connectors.bindEndpoint(element, 'start');
            this.app.connectors.bindEndpoint(element, 'end');
        }
    }

    getCursor() {
        return 'crosshair';
    }
}