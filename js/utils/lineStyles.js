// utils/lineStyles.js

export class LineStyleManager {
    constructor(app) {
        this.app = app;
        this.currentStyle = 'solid';
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Line style button listeners
        const styleButtons = document.querySelectorAll('.style-btn');
        styleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setLineStyle(btn.dataset.style);
            });
        });
        
        // Show/hide line style controls based on selected tool
        this.app.eventBus?.on('toolChanged', (tool) => {
            const lineStyleControls = document.getElementById('line-style-controls');
            if (lineStyleControls) {
                // Show controls for line and arrow tools
                lineStyleControls.style.display = (tool === 'line' || tool === 'arrow') ? 'flex' : 'none';
            }
        });
    }
    
    setLineStyle(style) {
        this.currentStyle = style;
        
        // Update button states
        const styleButtons = document.querySelectorAll('.style-btn');
        styleButtons.forEach(btn => {
            if (btn.dataset.style === style) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    getLineStyle() {
        return this.currentStyle;
    }
    
    // Apply line style to canvas context
    applyToContext(ctx, style = this.currentStyle) {
        switch (style) {
            case 'dashed':
                ctx.setLineDash([10, 5]); // 10px dash, 5px gap
                break;
            case 'dotted':
                ctx.setLineDash([2, 4]); // 2px dot, 4px gap
                break;
            case 'solid':
            default:
                ctx.setLineDash([]); // Solid line
                break;
        }
    }
    
    // Get DXF line type name
    getDXFLineType(style) {
        switch (style) {
            case 'dashed':
                return 'DASHED';
            case 'dotted':
                return 'DOT';
            case 'solid':
            default:
                return 'CONTINUOUS';
        }
    }
    
    // Get ASCII representation
    getASCIIChar(style, isHorizontal) {
        if (style === 'dashed') {
            return isHorizontal ? '-' : '¦';
        } else if (style === 'dotted') {
            return isHorizontal ? '·' : ':';
        }
        return isHorizontal ? '-' : '|';
    }
}