// utils/boxStyles.js
// Manages box/ellipse FILL and PATTERN only. Color is handled globally by
// ColorManager (it applies to every element type).

export class BoxStyleManager {
    constructor(app) {
        this.app = app;
        this.currentFill = 'none';
        this.currentPattern = 'none';
        // When one or more box/ellipse shapes are selected, edits apply to
        // all of them instead of just setting the defaults for new shapes.
        this.editingElements = [];

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
    }
    
    setFill(fill) {
        this.updatePatternVisibility(fill);

        if (this.editingElements.length) {
            this.editingElements.forEach(el => {
                el.fill = fill;
                if (fill === 'pattern' && (!el.pattern || el.pattern === 'none')) {
                    el.pattern = 'diagonal';
                }
            });
            if (fill === 'pattern') {
                const patternSelect = document.getElementById('box-pattern-select');
                if (patternSelect && (patternSelect.value === 'none' || !patternSelect.value)) {
                    patternSelect.value = 'diagonal';
                }
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
        if (this.editingElements.length) {
            this.editingElements.forEach(el => { el.pattern = pattern; });
            this.commitEdit();
        } else {
            this.currentPattern = pattern;
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
    // `selectedList` is the array of selected elements (1 for a single
    // click, many for a rubber-band selection). Called by
    // DrawingApp.refreshStyleControls().
    syncControls(selectedList, tool) {
        const controls = document.getElementById('box-style-controls');
        if (!controls) return;

        const shapes = selectedList.filter(el => el.type === 'box' || el.type === 'ellipse');
        const editing = shapes.length > 0;
        const drawing = (tool === 'box' || tool === 'ellipse');
        controls.style.display = (editing || drawing) ? 'flex' : 'none';
        this.editingElements = editing ? shapes : [];

        if (editing) {
            // Populate from the first selected shape as the representative.
            const rep = shapes[0];
            const fill = rep.fill || 'none';
            const fillSelect = document.getElementById('box-fill-select');
            if (fillSelect) fillSelect.value = fill;
            this.updatePatternVisibility(fill);

            if (rep.pattern && rep.pattern !== 'none') {
                const patternSelect = document.getElementById('box-pattern-select');
                if (patternSelect) patternSelect.value = rep.pattern;
            }
        } else {
            this.updatePatternVisibility(this.currentFill);
        }
    }

    getBoxStyle() {
        return {
            fill: this.currentFill,
            pattern: this.currentPattern
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