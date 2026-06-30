// js/DrawingApp.js - Main application class

import { SelectTool, LineTool, TextTool, ArrowTool, BoxTool, EllipseTool, DimensionTool, PolylineTool } from './tools/index.js';
import { Grid } from './utils/grid.js';
import { ExportManager } from './utils/export.js';
import { AsciiImporter } from './utils/asciiImport.js';
import { DxfImporter } from './utils/dxfImport.js';
import { Clipboard } from './core/clipboard.js';
import { Selection } from './core/selection.js';
import { Connectors } from './core/connectors.js';
import { History } from './core/history.js';
import { Storage } from './core/storage.js';
import { Renderer } from './core/render.js';
import { ModalManager } from './ui/modals.js';
import { ControlsManager } from './ui/controls.js';
import { LineStyleManager } from './utils/lineStyles.js';
import { BoxStyleManager } from './utils/boxStyles.js';
import { ColorManager } from './utils/colorManager.js';
import { notifications } from './ui/notifications.js';
import { getElementsBounds, getTextDimensions, translateElement, reorderForZ } from './utils/geometry.js';

export class DrawingApp {
    constructor() {
        // Canvas and drawing settings
        this.gridSize = 10;
        // Grid visibility and snapping are independent.
        this.showGrid = true;
        this.snapEnabled = true;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.currentTool = 'select';
        this.fontSize = 16;
        // 'dark' (default) or 'light'; set for real by ControlsManager from
        // localStorage. The renderer flips white ink to dark in light mode.
        this.theme = 'dark';
        // Optional: snap a moved shape's center to other shapes' centerlines.
        this.alignSnap = false;
        this.alignGuides = null;   // live centerline guides while dragging
        this.snapIndicator = null; // center marker while attaching a connector
        // Default arrow ends for new polylines (toggled in the top bar).
        this.polylineArrows = { start: false, end: false };
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
        this.editingTextTarget = null;
        
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

        // Sync contextual controls (font size, line/box style, color) to the
        // initial tool/selection so only relevant controls show on load.
        this.refreshStyleControls();

        // Initial render
        this.grid.draw();
        this.history.saveState();
        
        // Check for saved data
        if (this.storage.hasData()) {
            if (confirm('Restore previous drawing?')) {
                this.storage.load();
                this.ensureIds();
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
        this.dxfImporter = new DxfImporter(this);
        this.clipboardManager = new Clipboard(this);
        this.selection = new Selection(this);
        this.connectors = new Connectors(this);
        this.history = new History(this);
        this.storage = new Storage(this);
        this.renderer = new Renderer(this);
        this.modalManager = new ModalManager(this);
        this.controlsManager = new ControlsManager(this);
        this.lineStyleManager = new LineStyleManager(this);
        this.boxStyleManager = new BoxStyleManager(this);
        this.colorManager = new ColorManager(this);
    }
    
    setupTools() {
        this.tools = {
            select: new SelectTool(this),
            line: new LineTool(this),
            text: new TextTool(this),
            arrow: new ArrowTool(this),
            box: new BoxTool(this),
            ellipse: new EllipseTool(this),
            dimension: new DimensionTool(this),
            polyline: new PolylineTool(this)
        };
    }
    
    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                // Abandon an in-progress polyline when changing tools.
                if (this.tools && this.tools.polyline && this.tools.polyline.active &&
                    btn.dataset.tool !== 'polyline') {
                    this.tools.polyline.cancel();
                }
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;

                // Emit tool change event
                this.eventBus.emit('toolChanged', this.currentTool);

                // Clear any hover snap marker left by the previous tool.
                this.snapIndicator = null;

                if (this.currentTool !== 'select') {
                    this.selectedElement = null;
                    this.selectedElements = [];
                }
                this.render();

                this.refreshStyleControls();
                this.updateCursor();
            });
        });
        
        // Canvas events
        this.mainCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.mainCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.mainCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.mainCanvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.mainCanvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        // Clear the hover snap marker when the pointer leaves the canvas.
        this.mainCanvas.addEventListener('mouseleave', () => {
            if (this.snapIndicator) { this.snapIndicator = null; this.render(); }
        });

        // Touch support: one finger draws/selects (routed through the mouse
        // handlers), two fingers pinch-zoom and pan. passive:false so we can
        // preventDefault and stop the browser from scrolling/zooming the page.
        this.mainCanvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.mainCanvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.mainCanvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.mainCanvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
        
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
        // Show-grid toggle (visibility only — does not affect snapping).
        const toggleGridBtn = document.getElementById('toggle-grid');
        if (toggleGridBtn) {
            toggleGridBtn.addEventListener('click', () => {
                this.showGrid = !this.showGrid;
                toggleGridBtn.style.opacity = this.showGrid ? '1' : '0.5';
                toggleGridBtn.classList.toggle('active', this.showGrid);
                toggleGridBtn.setAttribute('aria-pressed', String(this.showGrid));
                this.grid.draw();
            });
        }

        // Snap toggle (snapping only — does not affect grid visibility).
        const toggleSnapBtn = document.getElementById('toggle-snap');
        if (toggleSnapBtn) {
            toggleSnapBtn.addEventListener('click', () => {
                this.snapEnabled = !this.snapEnabled;
                toggleSnapBtn.style.opacity = this.snapEnabled ? '1' : '0.5';
                toggleSnapBtn.classList.toggle('active', this.snapEnabled);
                toggleSnapBtn.setAttribute('aria-pressed', String(this.snapEnabled));
            });
        }

        // Align-to-shapes toggle: snap a moved shape's center to the
        // centerlines of other shapes (off by default).
        const toggleAlignBtn = document.getElementById('toggle-align');
        if (toggleAlignBtn) {
            toggleAlignBtn.style.opacity = this.alignSnap ? '1' : '0.5';
            toggleAlignBtn.addEventListener('click', () => {
                this.alignSnap = !this.alignSnap;
                toggleAlignBtn.style.opacity = this.alignSnap ? '1' : '0.5';
                toggleAlignBtn.classList.toggle('active', this.alignSnap);
                toggleAlignBtn.setAttribute('aria-pressed', String(this.alignSnap));
            });
        }

        // Polyline arrow-end toggles.
        const polyStartBtn = document.getElementById('poly-arrow-start');
        const polyEndBtn = document.getElementById('poly-arrow-end');
        if (polyStartBtn) polyStartBtn.addEventListener('click', () => this.togglePolylineArrow('start'));
        if (polyEndBtn) polyEndBtn.addEventListener('click', () => this.togglePolylineArrow('end'));
        
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
        
        // Middle-mouse always pans. Shift+drag pans too, except where Shift is a
        // tool modifier: the Select tool (selection) and the Box/Ellipse tools
        // (Shift constrains to a square/circle). Middle-mouse still pans there.
        const shiftModifierTools = ['select', 'box', 'ellipse'];
        const shiftPan = e.button === 0 && e.shiftKey && !shiftModifierTools.includes(this.currentTool);
        if (e.button === 1 || shiftPan) {
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
        
        // Double-click also finishes an in-progress polyline.
        const polyTool = this.tools.polyline;
        if (polyTool && polyTool.active) {
            polyTool.finish();
            return;
        }

        const element = this.getElementAt(x, y);
        if (element && element.type === 'text') {
            this.selectedElement = element;
            this.editTextElement(element, e.clientX, e.clientY);
        } else if (element && (element.type === 'line' || element.type === 'arrow')) {
            this.selectedElement = element;
            this.editConnectorLabel(element, e.clientX, e.clientY);
        } else if (element && element.type === 'dimension') {
            this.selectedElement = element;
            this.editDimensionValue(element, e.clientX, e.clientY);
        }
    }
    
    // --- Touch input -------------------------------------------------------
    // We translate touches into the existing mouse handlers via a synthetic
    // event so every tool works on touch without tool-specific changes.
    synthMouseFromTouch(touch) {
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            preventDefault() {},
            stopPropagation() {}
        };
    }

    touchDistance(a, b) {
        return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    }

    touchCenter(a, b) {
        return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            const t = e.touches[0];
            this.touchMode = 'draw';
            this.activeTouchId = t.identifier;
            this.lastTouchPos = { clientX: t.clientX, clientY: t.clientY };
            this.touchStartClient = { x: t.clientX, y: t.clientY };
            this.touchMovedFar = false;
            this.handleMouseDown(this.synthMouseFromTouch(t));
        } else if (e.touches.length === 2) {
            e.preventDefault();
            // If a one-finger draw was in progress, end it before pinching.
            // Tools discard zero-size shapes, so a quick two-finger gesture
            // that started as a tap leaves nothing behind.
            if (this.touchMode === 'draw' && this.lastTouchPos) {
                this.handleMouseUp(this.synthMouseFromTouch(this.lastTouchPos));
            }
            this.touchMode = 'pinch';
            this.activeTouchId = null;
            const [a, b] = e.touches;
            this.pinchStartDist = this.touchDistance(a, b);
            this.pinchStartZoom = this.zoom;
            this.pinchLastCenter = this.touchCenter(a, b);
        }
    }

    handleTouchMove(e) {
        if (this.touchMode === 'draw' && e.touches.length >= 1) {
            e.preventDefault();
            const t = Array.from(e.touches).find(t => t.identifier === this.activeTouchId) || e.touches[0];
            this.lastTouchPos = { clientX: t.clientX, clientY: t.clientY };
            if (this.touchStartClient &&
                Math.hypot(t.clientX - this.touchStartClient.x, t.clientY - this.touchStartClient.y) > 10) {
                this.touchMovedFar = true;
            }
            this.handleMouseMove(this.synthMouseFromTouch(t));
        } else if (this.touchMode === 'pinch' && e.touches.length >= 2) {
            e.preventDefault();
            const [a, b] = e.touches;
            const dist = this.touchDistance(a, b);
            const center = this.touchCenter(a, b);
            // Pan by how far the gesture's midpoint moved.
            this.offsetX += center.x - this.pinchLastCenter.x;
            this.offsetY += center.y - this.pinchLastCenter.y;
            this.pinchLastCenter = center;
            // Zoom by the change in finger spread, centred on the midpoint.
            // changeZoom() applies the centring math and re-renders.
            if (this.pinchStartDist > 0) {
                const targetZoom = Math.max(0.1, Math.min(5, this.pinchStartZoom * (dist / this.pinchStartDist)));
                this.changeZoom(targetZoom - this.zoom, center.x, center.y);
            } else {
                this.grid.draw();
                this.render();
            }
        }
    }

    handleTouchEnd(e) {
        if (this.touchMode === 'draw') {
            e.preventDefault();
            // A tap is a touch that barely moved. Two taps in quick succession
            // at the same spot count as a double-tap and open the same editor
            // a desktop double-click would (text / connector label / dimension).
            let doubleTap = false;
            if (!this.touchMovedFar && this.lastTouchPos) {
                const now = e.timeStamp;
                const near = this.lastTapPos &&
                    Math.hypot(this.lastTouchPos.clientX - this.lastTapPos.x,
                               this.lastTouchPos.clientY - this.lastTapPos.y) < 24;
                if (this.lastTapTime && (now - this.lastTapTime) < 300 && near) {
                    doubleTap = true;
                    this.lastTapTime = 0; // consumed — don't chain into a triple-tap
                } else {
                    this.lastTapTime = now;
                    this.lastTapPos = { x: this.lastTouchPos.clientX, y: this.lastTouchPos.clientY };
                }
            }
            if (this.lastTouchPos) {
                this.handleMouseUp(this.synthMouseFromTouch(this.lastTouchPos));
                if (doubleTap) {
                    this.handleDoubleClick(this.synthMouseFromTouch(this.lastTouchPos));
                }
            }
            this.touchMode = null;
            this.activeTouchId = null;
        } else if (this.touchMode === 'pinch') {
            e.preventDefault();
            // Once a finger lifts, end the gesture. Don't resume drawing with
            // the remaining finger — require a fresh touch to avoid stray marks.
            if (e.touches.length < 2) {
                this.touchMode = null;
                this.activeTouchId = null;
            }
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

        // Finish an in-progress polyline with Esc or Enter.
        const polyTool = this.tools.polyline;
        if (polyTool && polyTool.active && (e.key === 'Escape' || e.key === 'Enter')) {
            e.preventDefault();
            polyTool.finish();
            return;
        }

        // Check if user is typing in any input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const hasSelection = this.selectedElement || this.selectedElements.length > 0;

        // Normalize the key so Ctrl/Cmd shortcuts still match with Caps Lock on
        // or on layouts that report an uppercase e.key (e.key === 'C', not 'c').
        const key = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;

        // Arrow keys nudge the selection (Shift = a whole grid step).
        if (hasSelection && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            const step = e.shiftKey ? this.gridSize : 1;
            const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
            const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
            this.nudgeSelection(dx, dy);
            return;
        }

        // Z-order: ] brings the selection to the front, [ sends it to the back.
        if (hasSelection && !e.ctrlKey && !e.metaKey && (e.key === ']' || e.key === '[')) {
            e.preventDefault();
            if (e.key === ']') this.bringToFront();
            else this.sendToBack();
            return;
        }

        // Copy/Paste handling
        if ((e.ctrlKey || e.metaKey) && key === 'c') {
            e.preventDefault();
            this.copySelected();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && key === 'v') {
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

        if ((e.ctrlKey || e.metaKey) && key === 'd') {
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
            'd': 'dimension',
            'p': 'polyline',
            't': 'text'
        };

        // Single-key tool shortcuts must not hijack Ctrl/Cmd combos
        // (e.g. Ctrl+B, Ctrl+A) — those are handled below or by the browser.
        if (!e.ctrlKey && !e.metaKey && e.key && shortcuts[e.key.toLowerCase()]) {
            const button = document.querySelector(`[data-tool="${shortcuts[e.key.toLowerCase()]}"]`);
            if (button) button.click();
        }
        
        if (e.ctrlKey || e.metaKey) {
            if (key === 'z') {
                e.preventDefault();
                this.history.undo();
            } else if (key === 'y') {
                e.preventDefault();
                this.history.redo();
            } else if (key === 's') {
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
                dimension: 'crosshair',
                polyline: 'crosshair',
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

    getGroupHandleAt(x, y) {
        return this.selection.getGroupHandleAt(x, y);
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
        if (!element.id) element.id = this.genId();
        this.elements.push(element);
        this.history.saveState();
        this.storage.save();
        this.render();
    }

    // The current selection as a flat array (single or multi).
    selectionList() {
        if (this.selectedElements.length > 0) return this.selectedElements;
        return this.selectedElement ? [this.selectedElement] : [];
    }

    // Toggle an arrow end for new polylines and any selected polylines.
    togglePolylineArrow(which) {
        const key = which === 'start' ? 'startArrow' : 'endArrow';
        const polys = this.selectionList().filter(el => el.type === 'polyline');
        const current = polys.length ? !!polys[0][key] : !!this.polylineArrows[which];
        const next = !current;
        this.polylineArrows[which] = next;
        if (polys.length) {
            polys.forEach(el => { el[key] = next; });
            this.history.saveState();
            this.storage.save();
        }
        this.render();
        this.refreshStyleControls();
    }

    bringToFront() { this.reorderZ('front'); }
    sendToBack() { this.reorderZ('back'); }

    reorderZ(dir) {
        const sel = this.selectionList();
        if (!sel.length) return;
        this.elements = reorderForZ(this.elements, new Set(sel), dir);
        this.history.saveState();
        this.storage.save();
        this.render();
    }

    // Move the selection by (dx, dy) in world units (arrow-key nudge).
    nudgeSelection(dx, dy) {
        const sel = this.selectionList();
        if (!sel.length) return;
        sel.forEach(el => translateElement(el, dx, dy));
        this.history.saveState();
        this.storage.save();
        this.render();
    }

    // The world-space bounds of the visible canvas (for full-length guides).
    viewportWorldBounds() {
        return {
            left: -this.offsetX / this.zoom,
            top: -this.offsetY / this.zoom,
            right: (this.mainCanvas.width - this.offsetX) / this.zoom,
            bottom: (this.mainCanvas.height - this.offsetY) / this.zoom
        };
    }

    // Dashed centerlines shown while a shape snaps to another's center.
    drawAlignGuides(ctx) {
        if (!this.alignGuides || !this.alignGuides.length) return;
        const { left, top, right, bottom } = this.viewportWorldBounds();
        ctx.save();
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
        ctx.lineWidth = 1 / this.zoom;
        ctx.setLineDash([5 / this.zoom, 4 / this.zoom]);
        this.alignGuides.forEach(g => {
            ctx.beginPath();
            if (g.type === 'v') { ctx.moveTo(g.x, top); ctx.lineTo(g.x, bottom); }
            else { ctx.moveTo(left, g.y); ctx.lineTo(right, g.y); }
            ctx.stroke();
        });
        ctx.restore();
    }

    // A target marker shown when a connector endpoint will snap to a shape center.
    drawSnapIndicator(ctx) {
        if (!this.snapIndicator) return;
        const { x, y } = this.snapIndicator;
        const r = 6 / this.zoom;
        ctx.save();
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
        ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 1.5 / this.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Stable unique id used to bind connectors to shapes.
    genId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'el-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    // Backfill ids on any elements that lack one (older saved data, imports).
    ensureIds() {
        this.elements.forEach(el => { if (!el.id) el.id = this.genId(); });
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

    // Edit the label that sits in the middle of a line/arrow.
    editConnectorLabel(element, clickX, clickY) {
        this.openTextEditor(element, 'label', clickX, clickY, element.labelFontSize || 14);
    }

    // Edit a dimension's value (stored on `text`).
    editDimensionValue(element, clickX, clickY) {
        this.openTextEditor(element, 'text', clickX, clickY, element.fontSize || 14);
    }

    // Open the floating text editor bound to element[prop].
    openTextEditor(element, prop, clickX, clickY, fontSize) {
        this.textInput.style.display = 'block';
        this.textInput.style.left = clickX + 'px';
        this.textInput.style.top = (clickY - 10) + 'px';
        this.textInput.style.fontSize = fontSize + 'px';
        this.textInput.value = element[prop] || '';

        this.textInput.style.visibility = 'visible';
        this.textInput.style.opacity = '1';

        this.editingTextTarget = { element, prop };
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

        if (this.editingTextTarget) {
            // Empty clears the value.
            const { element, prop } = this.editingTextTarget;
            element[prop] = text || undefined;
            this.editingTextTarget = null;
            this.history.saveState();
            this.render();
            this.cancelTextInput();
            return;
        }

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
                fontSize: this.fontSize,
                color: this.colorManager.getColor()
            });
        }
        this.cancelTextInput();
    }
    
    cancelTextInput() {
        this.textInput.style.display = 'none';
        this.textInput.value = '';
        this.textPosition = null;
        this.editingElement = null;
        this.editingTextTarget = null;
    }
    
    render() {
        if (!this.ctx) return;

        // Keep bound connectors attached to their shapes before drawing.
        if (this.connectors) this.connectors.refresh();

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

        // Alignment guides and the connector center marker (live, drag-time).
        this.drawAlignGuides(ctx);
        this.drawSnapIndicator(ctx);

        ctx.restore();

        // Keep the style panels in sync with the current selection.
        this.refreshStyleControls();
    }

    // Show/populate the box and line style panels based on the active tool
    // and the current selection (single click or rubber-band multi-select).
    refreshStyleControls() {
        if (!this.boxStyleManager || !this.lineStyleManager || !this.colorManager) return;
        const selected = this.selectedElements.length > 0
            ? this.selectedElements
            : (this.selectedElement ? [this.selectedElement] : []);
        this.boxStyleManager.syncControls(selected, this.currentTool);
        this.lineStyleManager.syncControls(selected, this.currentTool);
        this.colorManager.syncControl(selected);

        // Font size only matters for the text tool or when text is selected.
        const fontRow = document.getElementById('font-settings');
        if (fontRow) {
            const showFont = this.currentTool === 'text' || selected.some(el => el.type === 'text');
            fontRow.style.display = showFont ? 'flex' : 'none';
        }

        // Colour applies when drawing (any tool but Select) or editing a
        // selection — hidden in the idle Select-with-nothing state to declutter.
        const colorRow = document.getElementById('color-settings');
        if (colorRow) {
            const showColor = this.currentTool !== 'select' || selected.length > 0;
            colorRow.style.display = showColor ? 'flex' : 'none';
        }

        // Polyline arrow-end toggles: shown for the Polyline tool or when a
        // polyline is selected; reflect the selection (or the new-element default).
        const polyArrows = document.getElementById('polyline-arrow-controls');
        if (polyArrows) {
            const polys = selected.filter(el => el.type === 'polyline');
            const show = this.currentTool === 'polyline' || polys.length > 0;
            polyArrows.style.display = show ? 'flex' : 'none';
            if (show) {
                const startOn = polys.length ? !!polys[0].startArrow : !!this.polylineArrows.start;
                const endOn = polys.length ? !!polys[0].endArrow : !!this.polylineArrows.end;
                const sBtn = document.getElementById('poly-arrow-start');
                const eBtn = document.getElementById('poly-arrow-end');
                if (sBtn) { sBtn.classList.toggle('active', startOn); sBtn.setAttribute('aria-pressed', String(startOn)); }
                if (eBtn) { eBtn.classList.toggle('active', endOn); eBtn.setAttribute('aria-pressed', String(endOn)); }
            }
        }
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
                } else if (el.type === 'polyline') {
                    ctx.save();
                    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
                    ctx.lineWidth = 4;
                    ctx.globalAlpha = 0.3;
                    this.renderer.drawPolyline(ctx, el);
                    ctx.restore();
                } else if (el.type === 'line' || el.type === 'arrow' || el.type === 'dimension') {
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

            // For a multi-element selection, frame the whole group and draw
            // corner handles for proportional resizing.
            if (this.selectedElements.length >= 2) {
                const b = getElementsBounds(this.selectedElements, ctx);
                if (b) {
                    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent');
                    ctx.save();
                    ctx.strokeStyle = accent;
                    ctx.fillStyle = accent;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
                    ctx.setLineDash([]);
                    const hs = 8;
                    [[b.minX, b.minY], [b.maxX, b.minY], [b.maxX, b.maxY], [b.minX, b.maxY]]
                        .forEach(([hx, hy]) => ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs));
                    ctx.restore();
                }
            }
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

                // Resize handles at corners and edge midpoints.
                ctx.setLineDash([]);
                const handleSize = 6;
                const midX = (minX + maxX) / 2;
                const midY = (minY + maxY) / 2;
                [[minX, minY], [midX, minY], [maxX, minY], [maxX, midY],
                 [maxX, maxY], [midX, maxY], [minX, maxY], [minX, midY]].forEach(([hx, hy]) => {
                    ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
                });
            } else if (this.selectedElement.type === 'polyline') {
                ctx.save();
                ctx.lineWidth = 4;
                ctx.globalAlpha = 0.3;
                this.renderer.drawPolyline(ctx, this.selectedElement);
                ctx.restore();
            } else if (this.selectedElement.type === 'line' || this.selectedElement.type === 'arrow' || this.selectedElement.type === 'dimension') {
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

    importDXF(text) {
        this.dxfImporter.import(text);
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
