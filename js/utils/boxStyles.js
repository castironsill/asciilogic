// utils/boxStyles.js

export class BoxStyleManager {
    constructor(app) {
        this.app = app;
        this.currentFill = 'none';
        this.currentPattern = 'none';
        this.currentColor = '#ffffff';
        
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
        
        // Define available colors
        this.colors = {
            white: { name: 'White', value: '#ffffff' },
            gray: { name: 'Gray', value: '#808080' },
            red: { name: 'Red', value: '#ff4444' },
            blue: { name: 'Blue', value: '#4444ff' },
            green: { name: 'Green', value: '#44ff44' },
            yellow: { name: 'Yellow', value: '#ffff44' },
            cyan: { name: 'Cyan', value: '#44ffff' },
            magenta: { name: 'Magenta', value: '#ff44ff' }
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Show/hide box style controls based on selected tool
        this.app.eventBus?.on('toolChanged', (tool) => {
            const boxStyleControls = document.getElementById('box-style-controls');
            if (boxStyleControls) {
                boxStyleControls.style.display = (tool === 'box') ? 'flex' : 'none';
            }
        });
        
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
        this.currentFill = fill;
        
        // Update pattern dropdown visibility
        const patternSelect = document.getElementById('box-pattern-select');
        const patternLabel = document.querySelector('label[for="box-pattern-select"]');
        
        if (fill === 'pattern') {
            if (patternSelect) patternSelect.style.display = 'block';
            if (patternLabel) patternLabel.style.display = 'block';
            if (this.currentPattern === 'none') {
                this.currentPattern = 'diagonal';
                if (patternSelect) patternSelect.value = 'diagonal';
            }
        } else {
            if (patternSelect) patternSelect.style.display = 'none';
            if (patternLabel) patternLabel.style.display = 'none';
        }
    }
    
    setPattern(pattern) {
        this.currentPattern = pattern;
    }
    
    setColor(color) {
        this.currentColor = this.colors[color]?.value || color;
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