// js/DrawingApp.js - Main application class

import { SelectTool, LineTool, TextTool, ArrowTool, BoxTool, EllipseTool } from './tools/index.js';
import { Grid } from './utils/grid.js';
import { ExportManager } from './utils/export.js';
import { AsciiImporter } from './utils/asciiImport.js';
import { Clipboard } from './core/clipboard.js';
import { Selection } from './core/selection.js';
import { History } from './core/history.js';
import { Storage } from './core/storage.js';
import { Renderer } from './core/render.js';
import { ModalManager } from './ui/modals.js';
import { ControlsManager } from './ui/controls.js';
import { LineStyleManager } from './utils/lineStyles.js';
import { BoxStyleManager } from './utils/boxStyles.js';
import { notifications } from './ui/notifications.js';
import { getElementsBounds, getTextDimensions } from './utils/geometry.js';

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
        this.asciiImporter = new AsciiImporter(this);
        this.clipboardManager = new Clipboard(this);
        this.selection = new Selection(this);
        this.history = new History(this);
        this.storage = new Storage(this);
        this.renderer = new Renderer(this);
        this.modalManager = new ModalManager(this);
        this.controlsManager = new ControlsManager(this);
        this.lineStyleManager = new LineStyleManager(this);
        this.boxStyleManager = new BoxStyleManager(this);
    }
    
    setupTools() {
        this.tools = {
            select: new SelectTool(this),
            line: new LineTool(this),
            text: new TextTool(this),
            arrow: new ArrowTool(this),
            box: new BoxTool(this),
            ellipse: new EllipseTool(this)
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
            // Enter inserts a new line (default textarea behavior).
            // Esc or Ctrl/Cmd+Enter finishes; clicking elsewhere also finishes.
            if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                this.finishTextInput();
            }
            // Keep keystrokes from reaching the global shortcut handler.
            e.stopPropagation();
        });
        // Grow the textarea to fit its content as the user types.
        this.textInput.addEventListener('input', () => this.autoSizeTextInput());
        this.textInput.addEventListener('blur', () => {
            if (this.textInput.style.display === 'block') {
                this.finishTextInput();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Grid toggle button
        const toggleGridBtn = document.getElementById('toggle-grid');
        if (toggleGridBtn) {
            let previousGridSize = this.gridSize || 10;
            
            toggleGridBtn.addEventListener('click', () => {
                const gridSizeInput = document.getElementById('grid-size');
                
                if (this.gridSize === 0) {
                    // Turn grid back on
                    this.gridSize = previousGridSize;
                    gridSizeInput.value = previousGridSize;
                    toggleGridBtn.style.opacity = '1';
                } else {
                    // Turn grid off
                    previousGridSize = this.gridSize;
                    this.gridSize = 0;
                    gridSizeInput.value = 0;
                    toggleGridBtn.style.opacity = '0.5';
                }
                
                this.grid.draw();
                this.render();
            });
        }
        
        // Auto-save every 30 seconds. Back off if storage repeatedly fails
        // (e.g. quota exceeded) so we don't spin and spam the console.
        let saveFailures = 0;
        this.autoSaveTimer = setInterval(() => {
            const ok = this.storage.save();
            if (ok) {
                saveFailures = 0;
            } else if (++saveFailures >= 3) {
                clearInterval(this.autoSaveTimer);
                notifications.show('Auto-save disabled: browser storage is full');
            }
        }, 30000);
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
        
        // Copy/Paste handling
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            this.copySelected();
            return;
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            if (this.clipboard.length > 0) {
                // Paste from internal clipboard at mouse position
                this.pasteElements();
            } else {
                // No internal clipboard, show message
                notifications.show('Nothing to paste. Use Import ASCII for external content.');
            }
            return;
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            this.duplicateSelected();
            return;
        }
        
        const shortcuts = {
            'v': 'select',
            'l': 'line',
            'a': 'arrow',
            'b': 'box',
            'c': 'ellipse',
            't': 'text'
        };

        // Single-key tool shortcuts must not hijack Ctrl/Cmd combos
        // (e.g. Ctrl+B, Ctrl+A) — those are handled below or by the browser.
        if (!e.ctrlKey && !e.metaKey && e.key && shortcuts[e.key.toLowerCase()]) {
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
                ellipse: 'crosshair',
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
        
        const bounds = getElementsBounds(this.elements, this.ctx);

        const padding = 50;
        const minX = bounds.minX - padding;
        const minY = bounds.minY - padding;
        const maxX = bounds.maxX + padding;
        const maxY = bounds.maxY + padding;
        
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
    
    // Selection / hit-testing is delegated to the Selection module.
    selectElement(x, y) {
        this.selection.selectElement(x, y);
    }

    getElementAt(x, y) {
        return this.selection.getElementAt(x, y);
    }

    getHandleAt(x, y) {
        return this.selection.getHandleAt(x, y);
    }

    getNormalizedBox(box) {
        return this.selection.getNormalizedBox(box);
    }

    isElementInBox(element, box) {
        return this.selection.isElementInBox(element, box);
    }

    recalculateBend(element) {
        this.selection.recalculateBend(element);
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
        this.textInput.style.fontSize = (element.fontSize || this.fontSize) + 'px';
        this.textInput.value = element.text;

        this.textInput.style.visibility = 'visible';
        this.textInput.style.opacity = '1';

        this.editingElement = element;
        this.autoSizeTextInput();

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
        this.textInput.style.fontSize = this.fontSize + 'px';
        this.textInput.value = '';

        this.textInput.style.visibility = 'visible';
        this.textInput.style.opacity = '1';
        this.autoSizeTextInput();

        setTimeout(() => {
            this.textInput.focus();
            this.textInput.select();
        }, 10);

        this.textPosition = { x: snappedX, y: snappedY };
    }

    // Grow the text entry box to fit its content (width + height) so
    // multi-line input stays fully visible.
    autoSizeTextInput() {
        const ta = this.textInput;
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
        ta.style.width = 'auto';
        ta.style.width = Math.max(150, ta.scrollWidth + 4) + 'px';
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
                if (el.type === 'box' || el.type === 'ellipse') {
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
                    const { fontSize, width, lineHeight, lineCount } = getTextDimensions(el, ctx);
                    ctx.strokeRect(
                        el.x - 5,
                        el.y - fontSize - 4,
                        width + 10,
                        fontSize + 14 + (lineCount - 1) * lineHeight
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
            
            if (this.selectedElement.type === 'box' || this.selectedElement.type === 'ellipse') {
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
                const { fontSize, width, lineHeight, lineCount } = getTextDimensions(this.selectedElement, ctx);
                ctx.strokeRect(
                    this.selectedElement.x - 5,
                    this.selectedElement.y - fontSize - 4,
                    width + 10,
                    fontSize + 14 + (lineCount - 1) * lineHeight
                );
            }
            
            ctx.setLineDash([]);
        }
    }
    
    importASCII(text) {
        this.asciiImporter.import(text);
    }
    
    // Clipboard operations are delegated to the Clipboard module.
    get clipboard() {
        return this.clipboardManager.items;
    }

    copySelected() {
        this.clipboardManager.copy();
    }

    pasteElements() {
        this.clipboardManager.paste();
    }

    duplicateSelected() {
        this.clipboardManager.duplicate();
    }
}
