// js/tools/LineTool.js - Line drawing tool

export class LineTool {
    constructor(app) {
        this.app = app;
        this.isDrawing = false;
        this.tempElement = null;
    }
    
    handleMouseDown(x, y, e) {
        this.isDrawing = true;
        const snappedX = this.app.grid.snapToGrid(x);
        const snappedY = this.app.grid.snapToGrid(y);
        
        this.tempElement = {
            type: 'line',
            startX: snappedX,
            startY: snappedY,
            endX: snappedX,
            endY: snappedY
        };
    }
    
    handleMouseMove(x, y, e) {
        if (this.isDrawing && this.tempElement) {
            const snappedX = this.app.grid.snapToGrid(x);
            const snappedY = this.app.grid.snapToGrid(y);
            
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
        }
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
                this.app.addElement(this.tempElement);
            }
            
            this.tempElement = null;
            this.app.tempElement = null;
            this.app.render();
        }
    }
    
    getCursor() {
        return 'crosshair';
    }
}