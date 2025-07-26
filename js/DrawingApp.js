// js/DrawingApp.js - Main application class

import { SelectTool, LineTool, TextTool } from './tools/index.js';
import { Grid } from './utils/grid.js';
import { ExportManager } from './utils/export.js';
import { History } from './core/history.js';
import { Storage } from './core/storage.js';
import { Renderer } from './core/render.js';
import { ModalManager } from './ui/modals.js';
import { ControlsManager } from './ui/controls.js';
import { LineStyleManager } from './utils/lineStyles.js';
import { notifications } from './ui/notifications.js';
import { isPointNearElement, isElementInBox, getNormalizedBox, distanceToLineSegment } from './utils/geometry.js';

export class DrawingApp {
    constructor() {
        // Canvas and drawing settings
        this.gridSize = 10;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.currentTool = 'select';
        this.fontSize = 16;
        this.isDrawing = false;
        this.isPanning = false;
        
        // Data storage
        this.elements = [];
        this.selectedElement = null;
        this.selectedElements = [];
        this.tempElement = null;
        
        // Mouse tracking
        this.lastMousePos = { x: 0, y: 0 };
        this.panStart = { x: 0, y: 0 };
        
        // Text input
        this.textInput = null;
        this.textPosition = null;
        this.editingElement = null;
        
        // Initialize canvas references first
        this.gridCanvas = document.getElementById('grid-canvas');
        this.mainCanvas = document.getElementById('main-canvas');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.ctx = this.mainCanvas.getContext('2d');
        
        // Initialize components before setting up canvas
        this.initializeComponents();
        
        // Setup tools before canvas (since render() might be called)
        this.setupTools();
        
        // Now setup canvas and other components
        this.setupCanvas();
        this.setupEventListeners();

        // Initial render
        this.grid.draw();
        this.history.saveState();
        
        // Check for saved data
        if (this.storage.hasData()) {
            if (confirm('Restore previous drawing?')) {
                this.storage.load();
                this.render();
            }
        }
    }
    
    setupCanvas() {
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
        
        // Only call grid.draw() if grid exists
        if (this.grid) {
            this.grid.draw();
        }
        this.render();
    }
    
    initializeComponents() {
        // Create event bus first
        this.eventBus = {
            listeners: {},
            on(event, callback) {
                if (!this.listeners[event]) this.listeners[event] = [];
                this.listeners[event].push(callback);
            },
            emit(event, data) {
                if (this.listeners[event]) {
                    this.listeners[event].forEach(cb => cb(data));
                }
            }
        };
        
        this.grid = new Grid(this);
        this.exportManager = new ExportManager(this);
        this.history = new History(this);
        this.storage = new Storage(this);
        this.renderer = new Renderer(this);
        this.modalManager = new ModalManager(this);
        this.controlsManager = new ControlsManager(this);
        this.lineStyleManager = new LineStyleManager(this);
    }
    
    setupTools() {
        this.tools = {
            select: new SelectTool(this),
            line: new LineTool(this),
            text: new TextTool(this),
            arrow: new LineTool(this), // Arrow uses LineTool logic
            box: new LineTool(this)    // Box will use LineTool logic for now
        };
        
        // Modify arrow tool behavior
        this.tools.arrow.tempElementType = 'arrow';
        
        // Modify box tool behavior  
        const boxTool = this.tools.box;
        boxTool.handleMouseMove = function(x, y, e) {
            if (this.isDrawing && this.tempElement) {
                const snappedX = this.app.grid.snapToGrid(x);
                const snappedY = this.app.grid.snapToGrid(y);
                
                this.tempElement.type = 'box';
                this.tempElement.endX = snappedX;
                this.tempElement.endY = snappedY;
                delete this.tempElement.bendX;
                delete this.tempElement.bendY;
                
                this.app.tempElement = this.tempElement;
                this.app.render();
            }
        };
        
        // Modify arrow creation
        const arrowTool = this.tools.arrow;
        const originalMouseDown = arrowTool.handleMouseDown.bind(arrowTool);
        arrowTool.handleMouseDown = function(x, y, e) {
            originalMouseDown(x, y, e);
            if (this.tempElement) {
                this.tempElement.type = 'arrow';
            }
        };
        
        // Modify line/arrow tool to include line style
        const originalLineTool = this.tools.line;
        const originalLineMouseUp = originalLineTool.handleMouseUp.bind(originalLineTool);
        originalLineTool.handleMouseUp = function(x, y, e) {
            // Add line style to temp element before finalizing
            if (this.tempElement) {
                this.tempElement.lineStyle = this.app.lineStyleManager.getLineStyle();
            }
            originalLineMouseUp(x, y, e);
        };
        
        // Same for arrow tool
        const originalArrowMouseUp = arrowTool.handleMouseUp.bind(arrowTool);
        arrowTool.handleMouseUp = function(x, y, e) {
            // Add line style to temp element before finalizing
            if (this.tempElement) {
                this.tempElement.lineStyle = this.app.lineStyleManager.getLineStyle();
            }
            originalArrowMouseUp(x, y, e);
        };
    }
    
    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                
                // Emit tool change event
                this.eventBus.emit('toolChanged', this.currentTool);
                
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
        this.mainCanvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
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
        
        // Auto-save
        setInterval(() => {
            this.storage.save();
        }, 30000); // Save every 30 seconds
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
        
        const tool = this.tools[this.currentTool];
        if (tool) {
            tool.handleMouseDown(x, y, e);
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
            this.grid.draw();
            this.render();
            return;
        }
        
        const tool = this.tools[this.currentTool];
        if (tool) {
            tool.handleMouseMove(x, y, e);
        }
        
        this.lastMousePos = { x, y };
    }
    
    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
            return;
        }
        
        const rect = this.mainCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.offsetX) / this.zoom;
        const y = (e.clientY - rect.top - this.offsetY) / this.zoom;
        
        const tool = this.tools[this.currentTool];
        if (tool) {
            tool.handleMouseUp(x, y, e);
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.changeZoom(delta, e.clientX, e.clientY);
    }
    
    handleDoubleClick(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.offsetX) / this.zoom;
        const y = (e.clientY - rect.top - this.offsetY) / this.zoom;
        
        const element = this.getElementAt(x, y);
        if (element && element.type === 'text') {
            this.selectedElement = element;
            this.editTextElement(element, e.clientX, e.clientY);
        }
    }
    
    handleKeyDown(e) {
        if (this.textInput.style.display === 'block') {
            return;
        }
        
        const importModal = document.getElementById('import-modal');
        if (importModal.style.display === 'flex') {
            return;
        }
        
        const exportModal = document.getElementById('export-modal');
        if (exportModal && exportModal.style.display === 'flex') {
            return; // Don't process shortcuts when export modal is open
        }
        
        // Check if user is typing in any input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            this.modalManager.showImportModal();
            return;
        }
        
        const shortcuts = {
            'v': 'select',
            'l': 'line',
            'a': 'arrow',
            'b': 'box',
            't': 'text'
        };
        
        if (e.key && shortcuts[e.key.toLowerCase()]) {
            const button = document.querySelector(`[data-tool="${shortcuts[e.key.toLowerCase()]}"]`);
            if (button) button.click();
        }
        
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                this.history.undo();
            } else if (e.key === 'y') {
                e.preventDefault();
                this.history.redo();
            } else if (e.key === 's') {
                e.preventDefault();
                this.storage.save();
                notifications.show('Drawing saved');
            }
        }
        
        if (e.key === 'Delete' && (this.selectedElement || this.selectedElements.length > 0)) {
            this.deleteSelected();
        }
    }
    
    updateCursor() {
        const tool = this.tools[this.currentTool];
        if (tool && tool.getCursor) {
            this.mainCanvas.style.cursor = tool.getCursor();
        } else {
            const cursors = {
                select: 'default',
                line: 'crosshair',
                arrow: 'crosshair',
                box: 'crosshair',
                text: 'text'
            };
            this.mainCanvas.style.cursor = cursors[this.currentTool] || 'default';
        }
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
        
        this.controlsManager.updateZoomDisplay();
        this.grid.draw();
        this.render();
    }
    
    fitToContent() {
        if (this.elements.length === 0) {
            this.zoom = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            this.controlsManager.updateZoomDisplay();
            this.grid.draw();
            this.render();
            return;
        }
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.elements.forEach(el => {
            if (el.type === 'text') {
                const fontSize = el.fontSize || 16;
                const charWidth = fontSize * 0.6;
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y - fontSize);
                maxX = Math.max(maxX, el.x + el.text.length * charWidth);
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
        
        this.controlsManager.updateZoomDisplay();
        this.grid.draw();
        this.render();
    }
    
    clearCanvas() {
        this.elements = [];
        this.selectedElement = null;
        this.selectedElements = [];
        this.tempElement = null;
        this.history.clear();
        this.storage.clear();
        this.render();
        notifications.show('Canvas cleared');
    }
    
    selectElement(x, y) {
        this.selectedElement = null;
        
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const el = this.elements[i];
            if (isPointNearElement(x, y, el, this.ctx, this.fontSize)) {
                this.selectedElement = el;
                break;
            }
        }
        
        this.render();
    }
    
    getElementAt(x, y) {
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const el = this.elements[i];
            if (isPointNearElement(x, y, el, this.ctx, this.fontSize)) {
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
    
    getNormalizedBox(box) {
        return getNormalizedBox(box);
    }
    
    isElementInBox(element, box) {
        return isElementInBox(element, box);
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
        this.history.saveState();
        this.render();
    }
    
    addElement(element) {
        this.elements.push(element);
        this.history.saveState();
        this.storage.save();
        this.render();
    }
    
    editTextElement(element, clickX, clickY) {
        this.textInput.style.display = 'block';
        this.textInput.style.left = clickX + 'px';
        this.textInput.style.top = (clickY - 10) + 'px';
        this.textInput.value = element.text;
        
        this.textInput.style.visibility = 'visible';
        this.textInput.style.opacity = '1';
        
        this.editingElement = element;
        
        setTimeout(() => {
            this.textInput.focus();
            this.textInput.select();
        }, 10);
    }
    
    startTextInput(clickX, clickY, canvasX, canvasY) {
        const snappedX = this.grid.snapToGrid(canvasX);
        const snappedY = this.grid.snapToGrid(canvasY);
        
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
        
        if (this.editingElement) {
            if (text) {
                this.editingElement.text = text;
                this.editingElement.fontSize = this.fontSize;
                this.history.saveState();
                this.render();
            }
            this.editingElement = null;
        } else if (text && this.textPosition) {
            this.addElement({
                type: 'text',
                x: this.textPosition.x,
                y: this.textPosition.y,
                text: text,
                fontSize: this.fontSize
            });
        }
        this.cancelTextInput();
    }
    
    cancelTextInput() {
        this.textInput.style.display = 'none';
        this.textInput.value = '';
        this.textPosition = null;
        this.editingElement = null;
    }
    
    render() {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.zoom, this.zoom);
        
        // Draw all elements
        this.elements.forEach(el => this.renderer.drawElement(ctx, el));
        
        // Draw temp element
        if (this.tempElement) {
            // Apply line style to temp element if it's a line or arrow
            if ((this.tempElement.type === 'line' || this.tempElement.type === 'arrow') && !this.tempElement.lineStyle) {
                this.tempElement.lineStyle = this.lineStyleManager.getLineStyle();
            }
            this.renderer.drawElement(ctx, this.tempElement, true);
        }
        
        // Draw selection box
        if (this.tools && this.tools.select && this.tools.select.selectionBox) {
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            const box = this.getNormalizedBox(this.tools.select.selectionBox);
            ctx.strokeRect(
                box.minX,
                box.minY,
                box.maxX - box.minX,
                box.maxY - box.minY
            );
            ctx.setLineDash([]);
        }
        
        // Draw selection highlights
        this.renderSelectionHighlights(ctx);
        
        ctx.restore();
    }
    
    renderSelectionHighlights(ctx) {
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
                    this.renderer.drawLine(ctx, el);
                    ctx.restore();
                } else if (el.type === 'text') {
                    ctx.setLineDash([5, 5]);
                    const fontSize = el.fontSize || 16;
                    ctx.font = `${fontSize}px monospace`;
                    const textWidth = ctx.measureText(el.text).width;
                    ctx.strokeRect(
                        el.x - 5, 
                        el.y - fontSize - 4, 
                        textWidth + 10, 
                        fontSize + 14
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
                const fontSize = this.selectedElement.fontSize || 16;
                ctx.font = `${fontSize}px monospace`;
                const textWidth = ctx.measureText(this.selectedElement.text).width;
                ctx.strokeRect(
                    this.selectedElement.x - 5, 
                    this.selectedElement.y - fontSize - 4, 
                    textWidth + 10, 
                    fontSize + 14
                );
            }
            
            ctx.setLineDash([]);
        }
    }
    
    importASCII(text) {
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
        
        // Store text elements to process after boxes
        const textElements = [];
        
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
                            // Mark box borders as visited
                            for (let by = y; by <= endY; by++) {
                                for (let bx = x; bx <= endX; bx++) {
                                    if (by === y || by === endY || bx === x || bx === endX) {
                                        if (isBoxChar(grid[by][bx])) {
                                            visited[by][bx] = true;
                                        }
                                    }
                                }
                            }
                            
                            const box = {
                                type: 'box',
                                startX: x * this.gridSize * scaleX,
                                startY: y * this.gridSize * scaleY,
                                endX: endX * this.gridSize * scaleX,
                                endY: endY * this.gridSize * scaleY
                            };
                            
                            this.elements.push(box);
                            
                            // Collect text inside this box to center it later
                            let boxText = '';
                            let textY = -1;
                            
                            for (let ty = y + 1; ty < endY; ty++) {
                                let lineText = '';
                                for (let tx = x + 1; tx < endX; tx++) {
                                    if (!visited[ty][tx] && grid[ty][tx] !== ' ') {
                                        lineText += grid[ty][tx];
                                        visited[ty][tx] = true;
                                    } else if (lineText.length > 0 && grid[ty][tx] === ' ') {
                                        lineText += ' ';
                                    }
                                }
                                lineText = lineText.trim();
                                if (lineText) {
                                    boxText = lineText;
                                    textY = ty;
                                }
                            }
                            
                            // If we found text, center it in the box
                            if (boxText && textY !== -1) {
                                const boxCenterX = (box.startX + box.endX) / 2;
                                const boxCenterY = (box.startY + box.endY) / 2;
                                const fontSize = 16;
                                const charWidth = fontSize * 0.6;
                                const textWidth = boxText.length * charWidth;
                                
                                textElements.push({
                                    type: 'text',
                                    x: boxCenterX - textWidth / 2,
                                    y: boxCenterY + fontSize / 4, // Slight vertical adjustment
                                    text: boxText,
                                    fontSize: fontSize
                                });
                            }
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
                                text: text.trim(),
                                fontSize: 16
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
                    text: text.trim(),
                    fontSize: 16
                });
            }
        }
        
        // Add all centered text elements at the end
        this.elements.push(...textElements);
        
        this.history.saveState();
        this.fitToContent();
        notifications.show('ASCII drawing imported successfully!');
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
            endY: y * this.gridSize * scaleY,
            lineStyle: isDashed ? 'dashed' : 'solid'
        });
        
        for (let vx = startX; vx <= endX; vx++) {
            if (grid[y][vx] && '-─═'.includes(grid[y][vx])) {
                visited[y][vx] = true;
            }
        }
    }
}