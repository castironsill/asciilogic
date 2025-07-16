export class SelectTool {
    constructor(app) {
        this.app = app;
        this.isDragging = false;
        this.dragStart = null;
        this.dragHandle = null;
        this.originalElement = null;
        this.originalElements = null;
        this.isSelecting = false;
        this.selectionBox = null;
    }
    
    handleMouseDown(x, y, e) {
        const handle = this.app.getHandleAt(x, y);
        if (handle) {
            this.isDragging = true;
            this.dragHandle = handle.type;
            this.dragStart = { x, y };
            this.originalElement = JSON.parse(JSON.stringify(this.app.selectedElement));
            this.updateCursor(handle.type);
        } else {
            const clickedElement = this.app.getElementAt(x, y);
            
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
                this.isSelecting = true;
                this.selectionBox = {
                    startX: x,
                    startY: y,
                    endX: x,
                    endY: y
                };
                this.app.selectedElement = null;
                this.app.selectedElements = [];
            }
        }
    }
    
    handleMouseMove(x, y, e) {
        if (this.isSelecting) {
            this.selectionBox.endX = x;
            this.selectionBox.endY = y;
            
            const box = this.app.getNormalizedBox(this.selectionBox);
            this.app.selectedElements = this.app.elements.filter(el => 
                this.app.isElementInBox(el, box)
            );
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
                        const original = this.originalElements[index];
                        if (el.type === 'text') {
                            el.x = original.x + dx;
                            el.y = original.y + dy;
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
                    });
                } else {
                    if (this.app.selectedElement.type === 'text') {
                        this.app.selectedElement.x = this.originalElement.x + dx;
                        this.app.selectedElement.y = this.originalElement.y + dy;
                    } else {
                        this.app.selectedElement.startX = this.originalElement.startX + dx;
                        this.app.selectedElement.startY = this.originalElement.startY + dy;
                        this.app.selectedElement.endX = this.originalElement.endX + dx;
                        this.app.selectedElement.endY = this.originalElement.endY + dy;
                        if (this.app.selectedElement.bendX !== undefined) {
                            this.app.selectedElement.bendX = this.originalElement.bendX + dx;
                            this.app.selectedElement.bendY = this.originalElement.bendY + dy;
                        }
                    }
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
            }
            
            this.app.render();
            return;
        }

        if (!this.isDragging && !this.isSelecting) {
            const handle = this.app.getHandleAt(x, y);
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
            this.app.render();
            return;
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.dragHandle = null;
            this.dragStart = null;
            this.originalElement = null;
            this.originalElements = null;
            this.app.history.saveState();
            this.updateCursor();
            return;
        }
    }
    
    updateCursor(handleType) {
        if (!handleType) {
            this.app.mainCanvas.style.cursor = 'default';
            return;
        }
        
        switch (handleType) {
            case 'start':
            case 'end':
            case 'bend':
                this.app.mainCanvas.style.cursor = 'pointer';
                break;
            case 'move':
                this.app.mainCanvas.style.cursor = 'move';
                break;
            default:
                this.app.mainCanvas.style.cursor = 'default';
        }
    }
}