// utils/boxStyles.js

import { COLORS, resolveColor, nameFromHex } from './colors.js';

export class BoxStyleManager {
    constructor(app) {
        this.app = app;
        this.currentFill = 'none';
        this.currentPattern = 'none';
        this.currentColor = '#ffffff';
        // When a box/ellipse is selected, edits apply to it instead of
        // just setting the defaults for new shapes.
        this.editingElement = null;
        
        // Define available patterns
        this.patterns = {
            none: { name: 'None', ascii: ' ' },
            solid: { name: 'Solid', ascii: '█' },
            light: { name: 'Light', ascii: '░' },
            medium: { name: 'Medium', ascii: '▒' },
            dense: { name: 'Dense', ascii: '▓' },
            horizontal: { name: 'Horizontal', ascii: '═' },
            vertical: { name: 'Vertical', ascii: '║' },
            diagonal: { name: 'Diagonal', ascii: '╱' },
            crosshatch: { name: 'Cross', ascii: '╳' }
        };
        
        // Available colors come from the shared palette (colors.js)
        this.colors = COLORS;

        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Visibility is driven by DrawingApp.refreshStyleControls() which
        // considers both the active tool and the current selection.

        // Fill dropdown
        const fillSelect = document.getElementById('box-fill-select');
        if (fillSelect) {
            fillSelect.addEventListener('change', (e) => {
                this.setFill(e.target.value);
            });
        }
        
        // Pattern dropdown
        const patternSelect = document.getElementById('box-pattern-select');
        if (patternSelect) {
            patternSelect.addEventListener('change', (e) => {
                this.setPattern(e.target.value);
            });
        }
        
        // Color dropdown
        const colorSelect = document.getElementById('box-color-select');
        if (colorSelect) {
            colorSelect.addEventListener('change', (e) => {
                this.setColor(e.target.value);
            });
        }
    }
    
    setFill(fill) {
        this.updatePatternVisibility(fill);

        if (this.editingElement) {
            this.editingElement.fill = fill;
            if (fill === 'pattern' && (!this.editingElement.pattern || this.editingElement.pattern === 'none')) {
                this.editingElement.pattern = 'diagonal';
                const patternSelect = document.getElementById('box-pattern-select');
                if (patternSelect) patternSelect.value = 'diagonal';
            }
            this.commitEdit();
        } else {
            this.currentFill = fill;
            if (fill === 'pattern' && this.currentPattern === 'none') {
                this.currentPattern = 'diagonal';
                const patternSelect = document.getElementById('box-pattern-select');
                if (patternSelect) patternSelect.value = 'diagonal';
            }
        }
    }

    setPattern(pattern) {
        if (this.editingElement) {
            this.editingElement.pattern = pattern;
            this.commitEdit();
        } else {
            this.currentPattern = pattern;
        }
    }

    setColor(color) {
        const hex = resolveColor(color);
        if (this.editingElement) {
            this.editingElement.color = hex;
            this.commitEdit();
        } else {
            this.currentColor = hex;
        }
    }

    commitEdit() {
        this.app.history.saveState();
        this.app.render();
    }

    updatePatternVisibility(fill) {
        const patternSelect = document.getElementById('box-pattern-select');
        const patternLabel = document.querySelector('label[for="box-pattern-select"]');
        const show = fill === 'pattern';
        if (patternSelect) patternSelect.style.display = show ? 'block' : 'none';
        if (patternLabel) patternLabel.style.display = show ? 'block' : 'none';
    }

    // Show/populate the box controls based on the current selection and tool.
    // Called by DrawingApp.refreshStyleControls().
    syncControls(selected, tool) {
        const controls = document.getElementById('box-style-controls');
        if (!controls) return;

        const editing = selected && (selected.type === 'box' || selected.type === 'ellipse');
        const drawing = (tool === 'box' || tool === 'ellipse');
        controls.style.display = (editing || drawing) ? 'flex' : 'none';
        this.editingElement = editing ? selected : null;

        if (editing) {
            const fill = selected.fill || 'none';
            const fillSelect = document.getElementById('box-fill-select');
            if (fillSelect) fillSelect.value = fill;
            this.updatePatternVisibility(fill);

            if (selected.pattern && selected.pattern !== 'none') {
                const patternSelect = document.getElementById('box-pattern-select');
                if (patternSelect) patternSelect.value = selected.pattern;
            }

            const colorName = nameFromHex(selected.color);
            const colorSelect = document.getElementById('box-color-select');
            if (colorName && colorSelect) colorSelect.value = colorName;
        } else {
            this.updatePatternVisibility(this.currentFill);
        }
    }

    getBoxStyle() {
        return {
            fill: this.currentFill,
            pattern: this.currentPattern,
            color: this.currentColor
        };
    }
    
    // Create canvas pattern for rendering
    createCanvasPattern(ctx, pattern, color) {
        const patternCanvas = document.createElement('canvas');
        const patternCtx = patternCanvas.getContext('2d');
        patternCanvas.width = 10;
        patternCanvas.height = 10;
        
        patternCtx.strokeStyle = color;
        patternCtx.lineWidth = 1;
        
        switch (pattern) {
            case 'horizontal':
                patternCtx.beginPath();
                patternCtx.moveTo(0, 5);
                patternCtx.lineTo(10, 5);
                patternCtx.stroke();
                break;
                
            case 'vertical':
                patternCtx.beginPath();
                patternCtx.moveTo(5, 0);
                patternCtx.lineTo(5, 10);
                patternCtx.stroke();
                break;
                
            case 'diagonal':
                patternCtx.beginPath();
                patternCtx.moveTo(0, 10);
                patternCtx.lineTo(10, 0);
                patternCtx.stroke();
                break;
                
            case 'crosshatch':
                patternCtx.beginPath();
                patternCtx.moveTo(0, 10);
                patternCtx.lineTo(10, 0);
                patternCtx.moveTo(0, 0);
                patternCtx.lineTo(10, 10);
                patternCtx.stroke();
                break;
                
            case 'light':
            case 'medium':
            case 'dense':
                const density = pattern === 'light' ? 0.2 : pattern === 'medium' ? 0.5 : 0.8;
                for (let i = 0; i < 10; i++) {
                    for (let j = 0; j < 10; j++) {
                        if (Math.random() < density) {
                            patternCtx.fillStyle = color;
                            patternCtx.fillRect(i, j, 1, 1);
                        }
                    }
                }
                break;
        }
        
        return ctx.createPattern(patternCanvas, 'repeat');
    }
    
    // Get ASCII character for pattern
    getASCIIChar(pattern) {
        return this.patterns[pattern]?.ascii || ' ';
    }
    
    // Get DXF hatch pattern name
    getDXFPattern(pattern) {
        const dxfPatterns = {
            horizontal: 'LINE',
            vertical: 'LINE,90',
            diagonal: 'ANSI31',
            crosshatch: 'ANSI37',
            solid: 'SOLID'
        };
        return dxfPatterns[pattern] || 'SOLID';
    }
}