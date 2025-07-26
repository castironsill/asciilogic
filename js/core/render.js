// js/core/render.js - Rendering functions

export class Renderer {
    constructor(app) {
        this.app = app;
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
        ctx.save();
        
        // Apply line style
        if (element.lineStyle === 'dashed') {
            ctx.setLineDash([10, 5]); // 10px dash, 5px gap
        } else if (element.lineStyle === 'dotted') {
            ctx.setLineDash([2, 4]); // 2px dot, 4px gap
        } else {
            ctx.setLineDash([]); // Solid line (default)
        }
        
        ctx.beginPath();
        ctx.moveTo(element.startX, element.startY);
        
        if (element.bendX !== undefined) {
            ctx.lineTo(element.bendX, element.bendY);
            ctx.lineTo(element.endX, element.endY);
        } else {
            ctx.lineTo(element.endX, element.endY);
        }
        
        ctx.stroke();
        
        // Reset line dash
        ctx.setLineDash([]);
        ctx.restore();
    }
    
    drawArrowHead(ctx, element) {
        // Arrow heads are always solid
        ctx.save();
        ctx.setLineDash([]); // Ensure arrow heads are solid
        
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
        
        ctx.restore();
    }
    
    drawBox(ctx, element) {
        const x = Math.min(element.startX, element.endX);
        const y = Math.min(element.startY, element.endY);
        const width = Math.abs(element.endX - element.startX);
        const height = Math.abs(element.endY - element.startY);
        
        ctx.strokeRect(x, y, width, height);
    }
    
    drawText(ctx, element) {
        const fontSize = element.fontSize || 16;
        ctx.font = `${fontSize}px monospace`;
        ctx.textBaseline = 'middle';
        ctx.fillText(element.text, element.x, element.y);
    }
}