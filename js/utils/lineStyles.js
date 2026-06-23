// utils/lineStyles.js

export class LineStyleManager {
    constructor(app) {
        this.app = app;
        this.currentStyle = 'solid';
        // When a line/arrow is selected, edits apply to it.
        this.editingElement = null;
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
        // Visibility/population is driven by DrawingApp.refreshStyleControls().
    }

    setLineStyle(style) {
        this.setActiveButton(style);

        if (this.editingElement) {
            this.editingElement.lineStyle = style;
            this.app.history.saveState();
            this.app.render();
        } else {
            this.currentStyle = style;
        }
    }

    setActiveButton(style) {
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === style);
        });
    }

    // Show/populate the line controls based on the current selection and tool.
    syncControls(selected, tool) {
        const controls = document.getElementById('line-style-controls');
        if (!controls) return;

        const editing = selected && (selected.type === 'line' || selected.type === 'arrow');
        const drawing = (tool === 'line' || tool === 'arrow');
        controls.style.display = (editing || drawing) ? 'flex' : 'none';
        this.editingElement = editing ? selected : null;

        this.setActiveButton(editing ? (selected.lineStyle || 'solid') : this.currentStyle);
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