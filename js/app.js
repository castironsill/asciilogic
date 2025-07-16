// Main DrawingApp Class
class DrawingApp {
    constructor() {
        // Canvas and drawing settings
        this.gridSize = 10;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.currentTool = 'select';
        this.isDrawing = false;
        this.isPanning = false;
        
        // Data storage
        this.elements = [];
        this.history = [];
        this.historyIndex = -1;
        this.selectedElement = null;
        this.selectedElements = [];
        this.tempElement = null;
        
        // Mouse tracking
        this.lastMousePos = { x: 0, y: 0 };
        this.panStart = { x: 0, y: 0 };
        
        // Text input
        this.textInput = null;
        this.textPosition = null;
        
        // Selection and dragging
        this.isDragging = false;
        this.dragStart = null;
        this.dragHandle = null;
        this.originalElement = null;
        this.originalElements = null;
        
        // Selection box
        this.isSelecting = false;
        this.selectionBox = null;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.drawGrid();
        this.saveState();
    }

    setupCanvas() {
        this.gridCanvas = document.getElementById('grid-canvas');
        this.mainCanvas = document.getElementById('main-canvas');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.ctx = this.mainCanvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        
        this.gridCanvas.width = rect.width;
        this.gridCanvas.height = rect.height;
        this.mainCanvas.width = rect.width;
        this.mainCanvas.height = rect.height;
        
        this.drawGrid();
        this.render();
    }

    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                
                if (this.currentTool !== 'select') {
                    this.selectedElement = null;
                    this.selectedElements = [];
                    this.render();
                }
                
                this.updateCursor();
            });
        });

        // Canvas events
        this.mainCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.mainCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.mainCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.mainCanvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Text input
        this.textInput = document.getElementById('text-input');
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.finishTextInput();
            } else if (e.key === 'Escape') {
                this.cancelTextInput();
            }
        });
        this.textInput.addEventListener('blur', () => {
            if (this.textInput.style.display === 'block') {
                this.finishTextInput();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Controls
        document.getElementById('zoom-in').addEventListener('click', () => this.changeZoom(0.1));
        document.getElementById('zoom-out').addEventListener('click', () => this.changeZoom(-0.1));
        document.getElementById('fit-content').addEventListener('click', () => this.fitToContent());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        
        // Grid size
        document.getElementById('grid-size').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.drawGrid();
            this.render();
        });

        // Help button
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'flex';
        });
        
        document.getElementById('close-help').addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'none';
        });
        
        // Show help on first visit
        if (!localStorage.getItem('asciilogic-visited')) {
            document.getElementById('help-modal').style.display = 'flex';
            localStorage.setItem('asciilogic-visited', 'true');
        }
        
        // Export/Import
        document.getElementById('export-btn').addEventListener('click', () => this.showExportModal());
        document.getElementById('import-btn').addEventListener('click', () => this.showImportModal());
        
        // Modal controls
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('export-modal').style.display = 'none';
        });
        
        document.getElementById('close-import-modal').addEventListener('click', () => {
            document.getElementById('import-modal').style.display = 'none';
        });

        document.querySelectorAll('[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-format]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateExportPreview();
            });
        });

        document.getElementById('copy-to-clipboard').addEventListener('click', () => {
            const text = document.getElementById('export-preview').textContent;
            navigator.clipboard.writeText(text).then(() => {
                alert('Copied to clipboard!');
            });
        });

        document.getElementById('import-confirm').addEventListener('click', () => {
            this.importASCII();
        });

        document.getElementById('import-cancel').addEventListener('click', () => {
            document.getElementById('import-modal').style.display = 'none';
        });
    }

    updateCursor() {
        const cursors = {
            select: 'default',
            line: 'crosshair',
            arrow: 'crosshair',
            box: 'crosshair',
            text: 'text'
        };
        this.mainCanvas.style.cursor = cursors[this.currentTool] || 'default';
    }

    handleMouseDown(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.offsetX) / this.zoom;
        const y = (e.clientY - rect.top - this.offsetY) / this.zoom;
        
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.mainCanvas.style.cursor = 'move';
            return;
        }

        if (this.currentTool === 'select') {
            const handle = this.getHandleAt(x, y);
            if (handle) {
                this.isDragging = true;
                this.dragHandle = handle.type;
                this.dragStart = { x, y };
                this.originalElement = JSON.parse(JSON.stringify(this.selectedElement));
                this.updateCursor(handle.type);
            } else {
                const clickedElement = this.getElementAt(x, y);
                
                const isClickingSelected = this.selectedElements.length > 0 ? 
                    this.selectedElements.includes(clickedElement) : 
                    clickedElement === this.selectedElement;
                    
                if (isClickingSelected && clickedElement) {
                    this.isDragging = true;
                    this.dragHandle = 'move';
                    this.dragStart = { x, y };
                    
                    if (this.selectedElements.length > 0) {
                        this.originalElements = this.selectedElements.map(el => 
                            JSON.parse(JSON.stringify(el))
                        );
                    } else {
                        this.originalElement = JSON.parse(JSON.stringify(this.selectedElement));
                    }
                    this.mainCanvas.style.cursor = 'move';
                } else if (clickedElement) {
                    this.selectElement(x, y);
                    this.selectedElements = [];
                } else {
                    this.isSelecting = true;
                    this.selectionBox = {
                        startX: x,
                        startY: y,
                        endX: x,
                        endY: y
                    };
                    this.selectedElement = null;
                    this.selectedElements = [];
                }
            }
        } else if (this.currentTool === 'text') {
            this.startTextInput(e.clientX, e.clientY, x, y);
        } else {
            this.isDrawing = true;
            const snappedX = this.snapToGrid(x);
            const snappedY = this.snapToGrid(y);
            
            this.tempElement = {
                type: this.currentTool,
                startX: snappedX,
                startY: snappedY,
                endX: snappedX,
                endY: snappedY
            };
        }
    }

    handleMouseMove(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.offsetX) / this.zoom;
        const y = (e.clientY - rect.top - this.offsetY) / this.zoom;
        
        if (this.isPanning) {
            this.offsetX += e.clientX - this.panStart.x;
            this.offsetY += e.clientY - this.panStart.y;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.drawGrid();
            this.render();
            return;
        }

        if (this.isSelecting) {
            this.selectionBox.endX = x;
            this.selectionBox.endY = y;
            
            const box = this.getNormalizedBox(this.selectionBox);
            this.selectedElements = this.elements.filter(el => 
                this.isElementInBox(el, box)
            );
            this.selectedElement = null;
            
            this.render();
            return;
        }

        if (this.isDragging && (this.selectedElement || this.selectedElements.length > 0)) {
            const snappedX = this.snapToGrid(x);
            const snappedY = this.snapToGrid(y);
            const dx = snappedX - this.snapToGrid(this.dragStart.x);
            const dy = snappedY - this.snapToGrid(this.dragStart.y);
            
            if (this.dragHandle === 'move') {
                if (this.selectedElements.length > 0) {
                    this.selectedElements.forEach((el, index) => {
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
                    if (this.selectedElement.type === 'text') {
                        this.selectedElement.x = this.originalElement.x + dx;
                        this.selectedElement.y = this.originalElement.y + dy;
                    } else {
                        this.selectedElement.startX = this.originalElement.startX + dx;
                        this.selectedElement.startY = this.originalElement.startY + dy;
                        this.selectedElement.endX = this.originalElement.endX + dx;
                        this.selectedElement.endY = this.originalElement.endY + dy;
                        if (this.selectedElement.bendX !== undefined) {
                            this.selectedElement.bendX = this.originalElement.bendX + dx;
                            this.selectedElement.bendY = this.originalElement.bendY + dy;
                        }
                    }
                }
            } else if (this.dragHandle === 'start') {
                this.selectedElement.startX = snappedX;
                this.selectedElement.startY = snappedY;
                if (this.selectedElement.bendX !== undefined) {
                    this.recalculateBend(this.selectedElement);
                }
            } else if (this.dragHandle === 'end') {
                this.selectedElement.endX = snappedX;
                this.selectedElement.endY = snappedY;
                if (this.selectedElement.bendX !== undefined) {
                    this.recalculateBend(this.selectedElement);
                }
            } else if (this.dragHandle === 'bend') {
                this.selectedElement.bendX = snappedX;
                this.selectedElement.bendY = snappedY;
            }
            
            this.render();
            return;
        }

        if (this.currentTool === 'select' && !this.isDragging && !this.isSelecting) {
            const handle = this.getHandleAt(x, y);
            if (handle) {
                this.updateCursor(handle.type);
            } else if (this.getElementAt(x, y)) {
                this.mainCanvas.style.cursor = 'move';
            } else {
                this.mainCanvas.style.cursor = 'default';
            }
        }

        if (this.isDrawing && this.tempElement) {
            const snappedX = this.snapToGrid(x);
            const snappedY = this.snapToGrid(y);
            
            if (this.currentTool === 'line' || this.currentTool === 'arrow') {
                const dx = snappedX - this.tempElement.startX;
                const dy = snappedY - this.tempElement.startY;
                
                if (!this.tempElement.direction) {
                    if (Math.abs(dx) >= this.gridSize || Math.abs(dy) >= this.gridSize) {
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
                        
                        if (Math.abs(snappedY - this.tempElement.startY) >= this.gridSize) {
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
                        
                        if (Math.abs(snappedX - this.tempElement.startX) >= this.gridSize) {
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
            } else if (this.currentTool === 'box') {
                this.tempElement.endX = snappedX;
                this.tempElement.endY = snappedY;
            }
            
            this.render();
        }
        
        this.lastMousePos = { x, y };
    }

    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
            return;
        }

        if (this.isSelecting) {
            this.isSelecting = false;
            this.selectionBox = null;
            this.render();
            return;
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.dragHandle = null;
            this.dragStart = null;
            this.originalElement = null;
            this.originalElements = null;
            this.saveState();
            this.updateCursor();
            return;
        }

        if (this.isDrawing && this.tempElement) {
            this.isDrawing = false;
            
            if (this.tempElement.direction) {
                delete this.tempElement.direction;
                delete this.tempElement.firstSegmentEnd;
            }
            
            if (this.tempElement.startX !== this.tempElement.endX || 
                this.tempElement.startY !== this.tempElement.endY) {
                this.addElement(this.tempElement);
            }
            
            this.tempElement = null;
            this.render();
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.changeZoom(delta, e.clientX, e.clientY);
    }

    handleKeyDown(e) {
        if (this.textInput.style.display === 'block') {
            return;
        }
        
        const importModal = document.getElementById('import-modal');
        if (importModal.style.display === 'flex') {
            return;
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            this.showImportModal();
            setTimeout(() => {
                document.getElementById('import-textarea').focus();
            }, 100);
            return;
        }
        
        const shortcuts = {
            'v': 'select',
            'l': 'line',
            'a': 'arrow',
            'b': 'box',
            't': 'text'
        };
        
        if (shortcuts[e.key.toLowerCase()]) {
            document.querySelector(`[data-tool="${shortcuts[e.key.toLowerCase()]}"]`).click();
        }
        
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                this.undo();
            } else if (e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        }
        
        if (e.key === 'Delete' && (this.selectedElement || this.selectedElements.length > 0)) {
            this.deleteSelected();
        }
    }

    snapToGrid(value) {
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    selectElement(x, y) {
        this.selectedElement = null;
        
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const el = this.elements[i];
            if (this.isPointNearElement(x, y, el)) {
                this.selectedElement = el;
                break;
            }
        }
        
        this.render();
    }

    getElementAt(x, y) {
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const el = this.elements[i];
            if (this.isPointNearElement(x, y, el)) {
                return el;
            }
        }
        return null;
    }

    getHandleAt(x, y) {
        if (!this.selectedElement || this.selectedElement.type === 'text') return null;
        
        const threshold = 8 / this.zoom;
        
        if (this.selectedElement.type === 'line' || this.selectedElement.type === 'arrow') {
            if (Math.abs(x - this.selectedElement.startX) < threshold && 
                Math.abs(y - this.selectedElement.startY) < threshold) {
                return { type: 'start' };
            }
            
            if (Math.abs(x - this.selectedElement.endX) < threshold && 
                Math.abs(y - this.selectedElement.endY) < threshold) {
                return { type: 'end' };
            }
            
            if (this.selectedElement.bendX !== undefined) {
                if (Math.abs(x - this.selectedElement.bendX) < threshold && 
                    Math.abs(y - this.selectedElement.bendY) < threshold) {
                    return { type: 'bend' };
                }
            }
        }
        
        return null;
    }

    updateCursor(handleType) {
        if (!handleType) {
            this.mainCanvas.style.cursor = this.currentTool === 'select' ? 'default' : 'crosshair';
            return;
        }
        
        switch (handleType) {
            case 'start':
            case 'end':
            case 'bend':
                this.mainCanvas.style.cursor = 'pointer';
                break;
            case 'move':
                this.mainCanvas.style.cursor = 'move';
                break;
            default:
                this.mainCanvas.style.cursor = 'default';
        }
    }

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

    isPointNearElement(x, y, element) {
        const threshold = 5;
        
        if (element.type === 'text') {
            const ctx = this.ctx;
            ctx.save();
            ctx.font = '16px monospace';
            const textWidth = ctx.measureText(element.text).width;
            ctx.restore();
            
            return x >= element.x - threshold && 
                   x <= element.x + textWidth + threshold &&
                   y >= element.y - 20 && 
                   y <= element.y + 10;
        } else if (element.type === 'box') {
            const minX = Math.min(element.startX, element.endX);
            const maxX = Math.max(element.startX, element.endX);
            const minY = Math.min(element.startY, element.endY);
            const maxY = Math.max(element.startY, element.endY);
            
            return x >= minX - threshold && x <= maxX + threshold &&
                   y >= minY - threshold && y <= maxY + threshold &&
                   (Math.abs(x - minX) < threshold || Math.abs(x - maxX) < threshold ||
                    Math.abs(y - minY) < threshold || Math.abs(y - maxY) < threshold);
        } else {
            if (element.bendX !== undefined) {
                return this.distanceToLineSegment(x, y, element.startX, element.startY, element.bendX, element.bendY) < threshold ||
                       this.distanceToLineSegment(x, y, element.bendX, element.bendY, element.endX, element.endY) < threshold;
            } else {
                return this.distanceToLineSegment(x, y, element.startX, element.startY, element.endX, element.endY) < threshold;
            }
        }
    }

    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
        const nearestX = x1 + t * dx;
        const nearestY = y1 + t * dy;
        return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
    }

    getNormalizedBox(box) {
        return {
            minX: Math.min(box.startX, box.endX),
            minY: Math.min(box.startY, box.endY),
            maxX: Math.max(box.startX, box.endX),
            maxY: Math.max(box.startY, box.endY)
        };
    }

    isElementInBox(element, box) {
        if (element.type === 'text') {
            return element.x >= box.minX && element.x <= box.maxX &&
                   element.y >= box.minY && element.y <= box.maxY;
        } else if (element.type === 'box') {
            const elMinX = Math.min(element.startX, element.endX);
            const elMaxX = Math.max(element.startX, element.endX);
            const elMinY = Math.min(element.startY, element.endY);
            const elMaxY = Math.max(element.startY, element.endY);
            
            return !(elMaxX < box.minX || elMinX > box.maxX || 
                     elMaxY < box.minY || elMinY > box.maxY);
        } else {
            const points = [
                { x: element.startX, y: element.startY },
                { x: element.endX, y: element.endY }
            ];
            if (element.bendX !== undefined) {
                points.push({ x: element.bendX, y: element.bendY });
            }
            
            return points.some(p => 
                p.x >= box.minX && p.x <= box.maxX &&
                p.y >= box.minY && p.y <= box.maxY
            );
        }
    }

    deleteSelected() {
        if (this.selectedElements.length > 0) {
            this.selectedElements.forEach(el => {
                const index = this.elements.indexOf(el);
                if (index > -1) {
                    this.elements.splice(index, 1);
                }
            });
            this.selectedElements = [];
        } else if (this.selectedElement) {
            const index = this.elements.indexOf(this.selectedElement);
            if (index > -1) {
                this.elements.splice(index, 1);
                this.selectedElement = null;
            }
        }
        this.saveState();
        this.render();
    }

    addElement(element) {
        this.elements.push(element);
        this.saveState();
        this.render();
    }

    saveState() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(JSON.stringify(this.elements));
        this.historyIndex = this.history.length - 1;
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.elements = JSON.parse(this.history[this.historyIndex]);
            this.selectedElement = null;
            this.render();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.elements = JSON.parse(this.history[this.historyIndex]);
            this.selectedElement = null;
            this.render();
        }
    }

    clearCanvas() {
        this.elements = [];
        this.selectedElement = null;
        this.selectedElements = [];
        this.tempElement = null;
        this.history = [];
        this.historyIndex = -1;
        this.saveState();
        this.render();
    }

    changeZoom(delta, centerX, centerY) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(0.1, Math.min(5, this.zoom + delta));
        
        if (centerX && centerY) {
            const rect = this.mainCanvas.getBoundingClientRect();
            const x = centerX - rect.left;
            const y = centerY - rect.top;
            
            this.offsetX = x - (x - this.offsetX) * (this.zoom / oldZoom);
            this.offsetY = y - (y - this.offsetY) * (this.zoom / oldZoom);
        }
        
        document.getElementById('zoom-level').textContent = Math.round(this.zoom * 100) + '%';
        this.drawGrid();
        this.render();
    }

    fitToContent() {
        if (this.elements.length === 0) {
            this.zoom = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            document.getElementById('zoom-level').textContent = '100%';
            this.drawGrid();
            this.render();
            return;
        }
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.elements.forEach(el => {
            if (el.type === 'text') {
                const textWidth = el.text.length * 10;
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y - 20);
                maxX = Math.max(maxX, el.x + textWidth);
                maxY = Math.max(maxY, el.y + 10);
            } else if (el.type === 'box') {
                minX = Math.min(minX, el.startX, el.endX);
                minY = Math.min(minY, el.startY, el.endY);
                maxX = Math.max(maxX, el.startX, el.endX);
                maxY = Math.max(maxY, el.startY, el.endY);
            } else {
                minX = Math.min(minX, el.startX, el.endX);
                minY = Math.min(minY, el.startY, el.endY);
                maxX = Math.max(maxX, el.startX, el.endX);
                maxY = Math.max(maxY, el.startY, el.endY);
                
                if (el.bendX !== undefined) {
                    minX = Math.min(minX, el.bendX);
                    minY = Math.min(minY, el.bendY);
                    maxX = Math.max(maxX, el.bendX);
                    maxY = Math.max(maxY, el.bendY);
                }
            }
        });
        
        const padding = 50;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const canvasWidth = this.mainCanvas.width;
        const canvasHeight = this.mainCanvas.height;
        
        const zoomX = canvasWidth / contentWidth;
        const zoomY = canvasHeight / contentHeight;
        this.zoom = Math.min(zoomX, zoomY, 2);
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        this.offsetX = canvasWidth / 2 - centerX * this.zoom;
        this.offsetY = canvasHeight / 2 - centerY * this.zoom;
        
        document.getElementById('zoom-level').textContent = Math.round(this.zoom * 100) + '%';
        this.drawGrid();
        this.render();
    }

    drawGrid() {
        const ctx = this.gridCtx;
        ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-color');
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        
        const gridSpacing = this.gridSize * this.zoom;
        const startX = this.offsetX % gridSpacing;
        const startY = this.offsetY % gridSpacing;
        
        ctx.beginPath();
        for (let x = startX; x < this.gridCanvas.width; x += gridSpacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.gridCanvas.height);
        }
        for (let y = startY; y < this.gridCanvas.height; y += gridSpacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.gridCanvas.width, y);
        }
        ctx.stroke();
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.zoom, this.zoom);
        
        this.elements.forEach(el => this.drawElement(ctx, el));
        
        if (this.tempElement) {
            this.drawElement(ctx, this.tempElement, true);
        }
        
        if (this.selectionBox) {
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            const box = this.getNormalizedBox(this.selectionBox);
            ctx.strokeRect(
                box.minX,
                box.minY,
                box.maxX - box.minX,
                box.maxY - box.minY
            );
            ctx.setLineDash([]);
        }
        
        if (this.selectedElements.length > 0) {
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
            ctx.lineWidth = 2;
            
            this.selectedElements.forEach(el => {
                if (el.type === 'box') {
                    ctx.setLineDash([5, 5]);
                    const minX = Math.min(el.startX, el.endX);
                    const maxX = Math.max(el.startX, el.endX);
                    const minY = Math.min(el.startY, el.endY);
                    const maxY = Math.max(el.startY, el.endY);
                    ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10);
                    ctx.setLineDash([]);
                } else if (el.type === 'line' || el.type === 'arrow') {
                    ctx.save();
                    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
                    ctx.lineWidth = 4;
                    ctx.globalAlpha = 0.3;
                    this.drawLine(ctx, el);
                    ctx.restore();
                } else if (el.type === 'text') {
                    ctx.setLineDash([5, 5]);
                    ctx.font = '16px monospace';
                    const textWidth = ctx.measureText(el.text).width;
                    ctx.strokeRect(
                        el.x - 5, 
                        el.y - 20, 
                        textWidth + 10, 
                        30
                    );
                    ctx.setLineDash([]);
                }
            });
        }
        else if (this.selectedElement) {
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            if (this.selectedElement.type === 'box') {
                const minX = Math.min(this.selectedElement.startX, this.selectedElement.endX);
                const maxX = Math.max(this.selectedElement.startX, this.selectedElement.endX);
                const minY = Math.min(this.selectedElement.startY, this.selectedElement.endY);
                const maxY = Math.max(this.selectedElement.startY, this.selectedElement.endY);
                ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10);
            } else if (this.selectedElement.type === 'line' || this.selectedElement.type === 'arrow') {
                ctx.setLineDash([]);
                const handleSize = 6;
                
                ctx.fillRect(
                    this.selectedElement.startX - handleSize/2, 
                    this.selectedElement.startY - handleSize/2, 
                    handleSize, 
                    handleSize
                );
                
                ctx.fillRect(
                    this.selectedElement.endX - handleSize/2, 
                    this.selectedElement.endY - handleSize/2, 
                    handleSize, 
                    handleSize
                );
                
                if (this.selectedElement.bendX !== undefined) {
                    ctx.fillRect(
                        this.selectedElement.bendX - handleSize/2, 
                        this.selectedElement.bendY - handleSize/2, 
                        handleSize, 
                        handleSize
                    );
                }
            } else if (this.selectedElement.type === 'text') {
                ctx.setLineDash([5, 5]);
                ctx.font = '16px monospace';
                const textWidth = ctx.measureText(this.selectedElement.text).width;
                ctx.strokeRect(
                    this.selectedElement.x - 5, 
                    this.selectedElement.y - 20, 
                    textWidth + 10, 
                    30
                );
            }
            
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }

    drawElement(ctx, element, isTemp = false) {
        const color = isTemp ? '#888888' : getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        
        switch (element.type) {
            case 'line':
                this.drawLine(ctx, element);
                break;
            case 'arrow':
                this.drawLine(ctx, element);
                this.drawArrowHead(ctx, element);
                break;
            case 'box':
                this.drawBox(ctx, element);
                break;
            case 'text':
                this.drawText(ctx, element);
                break;
        }
    }

    drawLine(ctx, element) {
        ctx.beginPath();
        ctx.moveTo(element.startX, element.startY);
        
        if (element.bendX !== undefined) {
            ctx.lineTo(element.bendX, element.bendY);
            ctx.lineTo(element.endX, element.endY);
        } else {
            ctx.lineTo(element.endX, element.endY);
        }
        
        ctx.stroke();
    }

    drawArrowHead(ctx, element) {
        const size = 10;
        let angle;
        
        if (element.bendX !== undefined) {
            angle = Math.atan2(element.endY - element.bendY, element.endX - element.bendX);
        } else {
            angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
        }
        
        ctx.beginPath();
        ctx.moveTo(element.endX, element.endY);
        ctx.lineTo(
            element.endX - size * Math.cos(angle - Math.PI / 6),
            element.endY - size * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(element.endX, element.endY);
        ctx.lineTo(
            element.endX - size * Math.cos(angle + Math.PI / 6),
            element.endY - size * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }

    drawBox(ctx, element) {
        const x = Math.min(element.startX, element.endX);
        const y = Math.min(element.startY, element.endY);
        const width = Math.abs(element.endX - element.startX);
        const height = Math.abs(element.endY - element.startY);
        
        ctx.strokeRect(x, y, width, height);
    }

    drawText(ctx, element) {
        ctx.font = `16px monospace`;
        ctx.textBaseline = 'middle';
        ctx.fillText(element.text, element.x, element.y);
    }

    startTextInput(clickX, clickY, canvasX, canvasY) {
        const snappedX = this.snapToGrid(canvasX);
        const snappedY = this.snapToGrid(canvasY);
        
        this.textInput.style.display = 'block';
        this.textInput.style.left = clickX + 'px';
        this.textInput.style.top = (clickY - 10) + 'px';
        this.textInput.value = '';
        
        this.textInput.style.visibility = 'visible';
        this.textInput.style.opacity = '1';
        
        setTimeout(() => {
            this.textInput.focus();
            this.textInput.select();
        }, 10);
        
        this.textPosition = { x: snappedX, y: snappedY };
    }
    
    finishTextInput() {
        const text = this.textInput.value.trim();
        if (text && this.textPosition) {
            this.addElement({
                type: 'text',
                x: this.textPosition.x,
                y: this.textPosition.y,
                text: text
            });
        }
        this.cancelTextInput();
    }
    
    cancelTextInput() {
        this.textInput.style.display = 'none';
        this.textInput.value = '';
        this.textPosition = null;
    }

    showExportModal() {
        document.getElementById('export-modal').style.display = 'flex';
        this.updateExportPreview();
    }

    showImportModal() {
        document.getElementById('import-modal').style.display = 'flex';
        document.getElementById('import-textarea').value = '';
    }

    updateExportPreview() {
        const format = document.querySelector('[data-format].active').dataset.format;
        const ascii = this.exportToASCII(format === 'ascii-extended');
        document.getElementById('export-preview').textContent = ascii;
    }

    exportToASCII(extended = false) {
        if (this.elements.length === 0) return 'No drawing to export';
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.elements.forEach(el => {
            if (el.type === 'text') {
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
                maxX = Math.max(maxX, el.x + el.text.length * this.gridSize);
                maxY = Math.max(maxY, el.y + this.gridSize);
            } else {
                minX = Math.min(minX, el.startX, el.endX);
                minY = Math.min(minY, el.startY, el.endY);
                maxX = Math.max(maxX, el.startX, el.endX);
                maxY = Math.max(maxY, el.startY, el.endY);
                if (el.bendX !== undefined) {
                    minX = Math.min(minX, el.bendX);
                    maxX = Math.max(maxX, el.bendX);
                }
            }
        });
        
        const width = Math.ceil((maxX - minX) / this.gridSize) + 1;
        const height = Math.ceil((maxY - minY) / this.gridSize) + 1;
        const grid = Array(height).fill(null).map(() => Array(width).fill(' '));
        
        this.elements.forEach(el => {
            if (el.type === 'text') {
                const x = Math.round((el.x - minX) / this.gridSize);
                const y = Math.round((el.y - minY) / this.gridSize);
                for (let i = 0; i < el.text.length; i++) {
                    if (x + i < width && y >= 0 && y < height) {
                        grid[y][x + i] = el.text[i];
                    }
                }
            } else if (el.type === 'box') {
                this.renderBoxToGrid(grid, el, minX, minY, extended);
            } else if (el.type === 'line' || el.type === 'arrow') {
                this.renderLineToGrid(grid, el, minX, minY, extended, el.type === 'arrow');
            }
        });
        
        let trimmedGrid = grid.filter(row => row.some(cell => cell !== ' '));
        
        if (trimmedGrid.length === 0) return 'No drawing to export';
        
        trimmedGrid = trimmedGrid.map(row => {
            const lastNonSpace = row.reduce((last, cell, index) => 
                cell !== ' ' ? index : last, -1);
            return row.slice(0, lastNonSpace + 1);
        });
        
        return trimmedGrid.map(row => row.join('')).join('\n');
    }

    renderBoxToGrid(grid, box, offsetX, offsetY, extended) {
        const x1 = Math.round((Math.min(box.startX, box.endX) - offsetX) / this.gridSize);
        const y1 = Math.round((Math.min(box.startY, box.endY) - offsetY) / this.gridSize);
        const x2 = Math.round((Math.max(box.startX, box.endX) - offsetX) / this.gridSize);
        const y2 = Math.round((Math.max(box.startY, box.endY) - offsetY) / this.gridSize);
        
        const chars = extended ? {
            horizontal: '─',
            vertical: '│',
            topLeft: '┌',
            topRight: '┐',
            bottomLeft: '└',
            bottomRight: '┘'
        } : {
            horizontal: '-',
            vertical: '|',
            topLeft: '+',
            topRight: '+',
            bottomLeft: '+',
            bottomRight: '+'
        };
        
        for (let x = x1 + 1; x < x2; x++) {
            grid[y1][x] = chars.horizontal;
            grid[y2][x] = chars.horizontal;
        }
        
        for (let y = y1 + 1; y < y2; y++) {
            grid[y][x1] = chars.vertical;
            grid[y][x2] = chars.vertical;
        }
        
        grid[y1][x1] = chars.topLeft;
        grid[y1][x2] = chars.topRight;
        grid[y2][x1] = chars.bottomLeft;
        grid[y2][x2] = chars.bottomRight;
    }

    renderLineToGrid(grid, line, offsetX, offsetY, extended, hasArrow) {
        const x1 = Math.round((line.startX - offsetX) / this.gridSize);
        const y1 = Math.round((line.startY - offsetY) / this.gridSize);
        const x2 = Math.round((line.endX - offsetX) / this.gridSize);
        const y2 = Math.round((line.endY - offsetY) / this.gridSize);
        
        if (line.bendX !== undefined) {
            const bx = Math.round((line.bendX - offsetX) / this.gridSize);
            const by = Math.round((line.bendY - offsetY) / this.gridSize);
            
            this.drawLineSegment(grid, x1, y1, bx, by, extended, false);
            this.drawLineSegment(grid, bx, by, x2, y2, extended, hasArrow);
            
            if (extended) {
                const h1 = x1 !== bx;
                const h2 = bx !== x2;
                if (h1 && !h2) grid[by][bx] = '└';
                else if (!h1 && h2) grid[by][bx] = '┌';
            } else {
                grid[by][bx] = '+';
            }
        } else {
            this.drawLineSegment(grid, x1, y1, x2, y2, extended, hasArrow);
        }
    }

    drawLineSegment(grid, x1, y1, x2, y2, extended, hasArrow) {
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);
        
        const horizontal = dy === 0;
        const vertical = dx === 0;
        
        const lineChar = extended ? (horizontal ? '─' : '│') : (horizontal ? '-' : '|');
        
        let x = x1, y = y1;
        while (x !== x2 || y !== y2) {
            grid[y][x] = lineChar;
            if (x !== x2) x += dx;
            if (y !== y2) y += dy;
        }
        
        if (hasArrow) {
            if (horizontal) {
                grid[y2][x2] = dx > 0 ? '>' : '<';
            } else {
                grid[y2][x2] = dy > 0 ? 'v' : '^';
            }
        }
    }

    addHorizontalLine(grid, y, startX, endX, visited, scaleX, scaleY, isDashed) {
        const hasLeftArrow = startX > 0 && '<←'.includes(grid[y][startX - 1]);
        const hasRightArrow = endX < grid[y].length - 1 && '>→'.includes(grid[y][endX + 1]);
        
        const finalStartX = hasLeftArrow ? startX - 1 : startX;
        const finalEndX = hasRightArrow ? endX + 1 : endX;
        
        this.elements.push({
            type: hasLeftArrow || hasRightArrow ? 'arrow' : 'line',
            startX: finalStartX * this.gridSize * scaleX,
            startY: y * this.gridSize * scaleY,
            endX: (finalEndX + 1) * this.gridSize * scaleX,
            endY: y * this.gridSize * scaleY
        });
        
        for (let vx = startX; vx <= endX; vx++) {
            if (grid[y][vx] && '-─═'.includes(grid[y][vx])) {
                visited[y][vx] = true;
            }
        }
    }

    importASCII() {
        const text = document.getElementById('import-textarea').value;
        if (!text.trim()) return;
        
        this.elements = [];
        
        const lines = text.split('\n');
        const grid = lines.map(line => line.split(''));
        const height = grid.length;
        const width = Math.max(...lines.map(l => l.length));
        
        grid.forEach(row => {
            while (row.length < width) row.push(' ');
        });
        
        const scaleX = 1.2;
        const scaleY = 1.8;
        
        const visited = Array(height).fill(null).map(() => Array(width).fill(false));
        
        const isBoxChar = (char) => {
            return '+-|┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬'.includes(char);
        };
        
        const isLineChar = (char) => {
            return '-|─│═║'.includes(char);
        };
        
        // Find and trace boxes
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (visited[y][x]) continue;
                
                const char = grid[y][x];
                
                if ('┌╔+'.includes(char)) {
                    let endX = x;
                    let endY = y;
                    
                    for (let nx = x + 1; nx < width; nx++) {
                        if ('┐╗+'.includes(grid[y][nx])) {
                            endX = nx;
                            break;
                        }
                        if (!' -─═'.includes(grid[y][nx])) break;
                    }
                    
                    for (let ny = y + 1; ny < height; ny++) {
                        if ('└╚+'.includes(grid[ny][x])) {
                            endY = ny;
                            break;
                        }
                        if (!' |│║'.includes(grid[ny][x])) break;
                    }
                    
                    if (endX > x && endY > y) {
                        const bottomRightChar = grid[endY]?.[endX];
                        if (bottomRightChar && '┘╝+'.includes(bottomRightChar)) {
                            for (let by = y; by <= endY; by++) {
                                for (let bx = x; bx <= endX; bx++) {
                                    if (by === y || by === endY || bx === x || bx === endX) {
                                        if (isBoxChar(grid[by][bx])) {
                                            visited[by][bx] = true;
                                        }
                                    }
                                }
                            }
                            
                            this.elements.push({
                                type: 'box',
                                startX: x * this.gridSize * scaleX,
                                startY: y * this.gridSize * scaleY,
                                endX: endX * this.gridSize * scaleX,
                                endY: endY * this.gridSize * scaleY
                            });
                        }
                    }
                }
            }
        }
        
        // Find horizontal lines
        for (let y = 0; y < height; y++) {
            let lineStart = null;
            let dashCount = 0;
            let spaceCount = 0;
            let isDashed = false;
            
            for (let x = 0; x < width; x++) {
                const char = grid[y][x];
                const isHorizontal = '-─═'.includes(char) && !visited[y][x];
                const isSpace = char === ' ';
                
                if (isHorizontal) {
                    if (lineStart === null) {
                        lineStart = x;
                        dashCount = 1;
                        spaceCount = 0;
                    } else {
                        dashCount++;
                    }
                } else if (isSpace && lineStart !== null && dashCount > 0) {
                    spaceCount++;
                    if (spaceCount <= 2) {
                        isDashed = true;
                    } else {
                        if (dashCount >= 2) {
                            const endX = x - spaceCount - 1;
                            this.addHorizontalLine(grid, y, lineStart, endX, visited, scaleX, scaleY, isDashed);
                        }
                        lineStart = null;
                        dashCount = 0;
                        spaceCount = 0;
                        isDashed = false;
                    }
                } else {
                    if (lineStart !== null && dashCount >= 2) {
                        const endX = x - spaceCount - 1;
                        this.addHorizontalLine(grid, y, lineStart, endX, visited, scaleX, scaleY, isDashed);
                    }
                    lineStart = null;
                    dashCount = 0;
                    spaceCount = 0;
                    isDashed = false;
                    
                    if (char === '<' && x + 4 < width) {
                        let arrowEnd = x;
                        let foundArrow = false;
                        
                        for (let ax = x + 1; ax < Math.min(x + 20, width); ax++) {
                            if (grid[y][ax] === '>') {
                                let validArrow = true;
                                for (let cx = x + 1; cx < ax; cx++) {
                                    if (!'-─ '.includes(grid[y][cx])) {
                                        validArrow = false;
                                        break;
                                    }
                                }
                                if (validArrow) {
                                    arrowEnd = ax;
                                    foundArrow = true;
                                    break;
                                }
                            }
                        }
                        
                        if (foundArrow) {
                            this.elements.push({
                                type: 'arrow',
                                startX: x * this.gridSize * scaleX,
                                startY: y * this.gridSize * scaleY,
                                endX: (arrowEnd + 1) * this.gridSize * scaleX,
                                endY: y * this.gridSize * scaleY
                            });
                            
                            for (let vx = x; vx <= arrowEnd; vx++) {
                                visited[y][vx] = true;
                            }
                        }
                    }
                }
            }
            
            if (lineStart !== null && dashCount >= 2) {
                const endX = width - 1;
                this.addHorizontalLine(grid, y, lineStart, endX, visited, scaleX, scaleY, isDashed);
            }
        }
        
        // Find vertical lines
        for (let x = 0; x < width; x++) {
            let lineStart = null;
            let consecutiveCount = 0;
            
            for (let y = 0; y < height; y++) {
                const char = grid[y][x];
                const isVertical = '|│║'.includes(char) && !visited[y][x];
                
                if (isVertical) {
                    if (lineStart === null) {
                        lineStart = y;
                        consecutiveCount = 1;
                    } else {
                        consecutiveCount++;
                    }
                } else {
                    if (lineStart !== null && consecutiveCount >= 2) {
                        const hasUpArrow = lineStart > 0 && '^↑'.includes(grid[lineStart - 1][x]);
                        const hasDownArrow = y < height && 'v↓'.includes(grid[y][x]);
                        
                        const startY = hasUpArrow ? lineStart - 1 : lineStart;
                        const endY = hasDownArrow ? y : y - 1;
                        
                        this.elements.push({
                            type: hasUpArrow || hasDownArrow ? 'arrow' : 'line',
                            startX: x * this.gridSize * scaleX,
                            startY: startY * this.gridSize * scaleY,
                            endX: x * this.gridSize * scaleX,
                            endY: (endY + 1) * this.gridSize * scaleY
                        });
                        
                        for (let vy = lineStart; vy <= endY; vy++) {
                            if (grid[vy][x] && '|│║'.includes(grid[vy][x])) {
                                visited[vy][x] = true;
                            }
                        }
                    }
                    lineStart = null;
                    consecutiveCount = 0;
                }
            }
            
            if (lineStart !== null && consecutiveCount >= 2) {
                const hasUpArrow = lineStart > 0 && '^↑'.includes(grid[lineStart - 1][x]);
                const startY = hasUpArrow ? lineStart - 1 : lineStart;
                
                this.elements.push({
                    type: hasUpArrow ? 'arrow' : 'line',
                    startX: x * this.gridSize * scaleX,
                    startY: startY * this.gridSize * scaleY,
                    endX: x * this.gridSize * scaleX,
                    endY: height * this.gridSize * scaleY
                });
                
                for (let vy = lineStart; vy < height; vy++) {
                    if (grid[vy][x] && '|│║'.includes(grid[vy][x])) {
                        visited[vy][x] = true;
                    }
                }
            }
        }
        
        // Find text
        for (let y = 0; y < height; y++) {
            let textStart = null;
            let text = '';
            
            for (let x = 0; x < width; x++) {
                const char = grid[y][x];
                
                if (!visited[y][x] && char !== ' ' && char !== '\t') {
                    if (textStart === null) {
                        textStart = x;
                        text = char;
                    } else {
                        text += char;
                    }
                    visited[y][x] = true;
                } else if (textStart !== null) {
                    if (char === ' ' && x + 1 < width && grid[y][x + 1] !== ' ' && !visited[y][x + 1]) {
                        text += ' ';
                    } else {
                        if (text.trim()) {
                            this.elements.push({
                                type: 'text',
                                x: textStart * this.gridSize * scaleX,
                                y: y * this.gridSize * scaleY + this.gridSize,
                                text: text.trim()
                            });
                        }
                        textStart = null;
                        text = '';
                    }
                }
            }
            
            if (textStart !== null && text.trim()) {
                this.elements.push({
                    type: 'text',
                    x: textStart * this.gridSize * scaleX,
                    y: y * this.gridSize * scaleY + this.gridSize,
                    text: text.trim()
                });
            }
        }
        
        document.getElementById('import-modal').style.display = 'none';
        this.saveState();
        this.fitToContent();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new DrawingApp();
});