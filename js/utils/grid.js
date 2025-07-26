export class Grid {
    constructor(app) {
        this.app = app;
    }
    
    draw() {
        const ctx = this.app.gridCtx;
        ctx.clearRect(0, 0, this.app.gridCanvas.width, this.app.gridCanvas.height);
        
        // Don't draw grid if size is 0
        if (this.app.gridSize === 0) {
            return;
        }
        
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-color');
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        
        const gridSpacing = this.app.gridSize * this.app.zoom;
        const startX = this.app.offsetX % gridSpacing;
        const startY = this.app.offsetY % gridSpacing;
        
        ctx.beginPath();
        for (let x = startX; x < this.app.gridCanvas.width; x += gridSpacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.app.gridCanvas.height);
        }
        for (let y = startY; y < this.app.gridCanvas.height; y += gridSpacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.app.gridCanvas.width, y);
        }
        ctx.stroke();
    }
    
    snapToGrid(value) {
        // If grid size is 0, don't snap (return exact value)
        if (this.app.gridSize === 0) {
            return value;
        }
        return Math.round(value / this.app.gridSize) * this.app.gridSize;
    }
}