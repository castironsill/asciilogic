// js/core/render.js - Rendering functions

export class Renderer {
    constructor(app) {
        this.app = app;
    }
    
    drawElement(ctx, element, isTemp = false) {
        ctx.save();
        
        const color = isTemp ? '#888888' : (element.color || getComputedStyle(document.documentElement).getPropertyValue('--text-primary'));
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
        
        ctx.restore();
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
        
        // Draw fill if specified
        if (element.fill && element.fill !== 'none') {
            ctx.save();
            
            if (element.fill === 'solid') {
                ctx.fillStyle = element.color || '#ffffff';
                ctx.globalAlpha = 0.3; // Semi-transparent to not obscure content
                ctx.fillRect(x, y, width, height);
            } else if (element.fill === 'pattern' && element.pattern && element.pattern !== 'none') {
                // Create pattern
                const pattern = this.createPattern(ctx, element.pattern, element.color || '#ffffff');
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(x, y, width, height);
                }
            }
            
            ctx.restore();
        }
        
        // Draw border - use the current strokeStyle which was set in drawElement
        ctx.strokeRect(x, y, width, height);
    }
    
    createPattern(ctx, patternType, color) {
        const patternCanvas = document.createElement('canvas');
        const patternCtx = patternCanvas.getContext('2d');
        patternCanvas.width = 10;
        patternCanvas.height = 10;
        
        patternCtx.strokeStyle = color;
        patternCtx.fillStyle = color;
        patternCtx.lineWidth = 1;
        patternCtx.globalAlpha = 0.3;
        
        switch (patternType) {
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
                for (let i = 0; i < 10; i += 3) {
                    for (let j = 0; j < 10; j += 3) {
                        patternCtx.fillRect(i, j, 1, 1);
                    }
                }
                break;
                
            case 'medium':
                for (let i = 0; i < 10; i += 2) {
                    for (let j = 0; j < 10; j += 2) {
                        patternCtx.fillRect(i, j, 1, 1);
                    }
                }
                break;
                
            case 'dense':
                for (let i = 0; i < 10; i++) {
                    for (let j = 0; j < 10; j++) {
                        if ((i + j) % 2 === 0) {
                            patternCtx.fillRect(i, j, 1, 1);
                        }
                    }
                }
                break;
        }
        
        return ctx.createPattern(patternCanvas, 'repeat');
    }
    
    drawText(ctx, element) {
        const fontSize = element.fontSize || 16;
        ctx.font = `${fontSize}px monospace`;
        ctx.textBaseline = 'middle';
        ctx.fillText(element.text, element.x, element.y);
    }
    
    getContentBounds() {
        if (this.app.elements.length === 0) {
            // Return default bounds if no elements
            return {
                minX: 0,
                minY: 0,
                maxX: 200,
                maxY: 200,
                width: 200,
                height: 200
            };
        }
        
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        this.app.elements.forEach(element => {
            if (element.type === 'box') {
                minX = Math.min(minX, element.startX, element.endX);
                minY = Math.min(minY, element.startY, element.endY);
                maxX = Math.max(maxX, element.startX, element.endX);
                maxY = Math.max(maxY, element.startY, element.endY);
            } else if (element.type === 'line' || element.type === 'arrow') {
                minX = Math.min(minX, element.startX, element.endX);
                minY = Math.min(minY, element.startY, element.endY);
                maxX = Math.max(maxX, element.startX, element.endX);
                maxY = Math.max(maxY, element.startY, element.endY);
                
                if (element.bendX !== undefined && element.bendY !== undefined) {
                    minX = Math.min(minX, element.bendX);
                    minY = Math.min(minY, element.bendY);
                    maxX = Math.max(maxX, element.bendX);
                    maxY = Math.max(maxY, element.bendY);
                }
            } else if (element.type === 'text') {
                // Estimate text bounds
                const ctx = this.app.ctx;
                ctx.save();
                const fontSize = element.fontSize || 16;
                ctx.font = `${fontSize}px monospace`;
                const lines = element.text.split('\n');
                let maxWidth = 0;
                lines.forEach(line => {
                    maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
                });
                ctx.restore();
                
                minX = Math.min(minX, element.x);
                minY = Math.min(minY, element.y - fontSize);
                maxX = Math.max(maxX, element.x + maxWidth);
                maxY = Math.max(maxY, element.y + (lines.length * fontSize * 1.2));
            }
        });
        
        // Add some padding to prevent clipping
        const padding = 10;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        return {
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}