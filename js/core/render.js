// js/core/render.js - Rendering functions

import { getElementsBounds, connectorMidpoint } from '../utils/geometry.js';
import { zigzagPoints, connectorCorners } from '../utils/zigzag.js';

export class Renderer {
    constructor(app) {
        this.app = app;
    }
    
    // `ink` overrides the default color for uncolored elements (used by
    // export so light-default elements stay visible on a white/transparent
    // background); `panelBg` is the fill behind label/dimension text.
    drawElement(ctx, element, isTemp = false, ink = null, panelBg = null) {
        ctx.save();

        const lightCanvas = !ink && this.app && this.app.theme === 'light';
        let color = isTemp
            ? '#888888'
            : (element.color || ink || getComputedStyle(document.documentElement).getPropertyValue('--text-primary'));
        // On a light canvas, white "ink" (the dark-theme default) would vanish —
        // flip it to dark, mirroring the export behaviour. Picked colours stay.
        if (!isTemp && lightCanvas && /^\s*(#fff(fff)?|white)\s*$/i.test(color)) {
            color = '#1a1a1a';
        }
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        switch (element.type) {
            case 'line':
                this.drawLine(ctx, element);
                if (element.label) this.drawConnectorLabel(ctx, element, ink, panelBg);
                break;
            case 'arrow':
                this.drawLine(ctx, element);
                this.drawArrowHead(ctx, element);
                if (element.label) this.drawConnectorLabel(ctx, element, ink, panelBg);
                break;
            case 'box':
                this.drawBox(ctx, element);
                break;
            case 'ellipse':
                this.drawEllipse(ctx, element);
                break;
            case 'dimension':
                this.drawDimension(ctx, element, ink, panelBg);
                break;
            case 'polyline':
                this.drawPolyline(ctx, element);
                break;
            case 'text':
                this.drawText(ctx, element);
                break;
        }

        ctx.restore();
    }
    
    drawLine(ctx, element) {
        ctx.save();

        if (element.lineStyle === 'zigzag') {
            // Zig-zag is real geometry rather than a dash pattern.
            ctx.setLineDash([]);
            const pts = zigzagPoints(connectorCorners(element));
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
            ctx.restore();
            return;
        }

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
    
    // Draw a connector's label centered on the line.
    drawConnectorLabel(ctx, element, ink = null, panelBg = null) {
        const mid = connectorMidpoint(element);
        this.drawTextPanel(ctx, mid.x, mid.y, element.label, element.labelFontSize || 14, element.color || ink, panelBg);
    }

    // Centered (possibly multi-line) text with a background panel so it stays
    // readable over whatever it sits on. Shared by labels and dimensions.
    drawTextPanel(ctx, cx, cy, text, fontSize, color, panelBg = null) {
        const lines = String(text).split('\n');
        const lineHeight = fontSize * 1.2;

        ctx.save();
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let maxWidth = 0;
        for (const line of lines) maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
        const h = lines.length * lineHeight;

        const bg = panelBg || (getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg') || '').trim() || '#1a1a1a';
        ctx.fillStyle = bg;
        ctx.fillRect(cx - maxWidth / 2 - 3, cy - h / 2 - 1, maxWidth + 6, h + 2);

        ctx.fillStyle = color || getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
        lines.forEach((line, i) => {
            ctx.fillText(line, cx, cy - h / 2 + lineHeight * (i + 0.5));
        });
        ctx.restore();
    }

    // A not-to-scale dimension: a straight line with perpendicular end ticks
    // and a value centered on it.
    drawDimension(ctx, element, ink = null, panelBg = null) {
        ctx.beginPath();
        ctx.moveTo(element.startX, element.startY);
        ctx.lineTo(element.endX, element.endY);
        ctx.stroke();

        const dx = element.endX - element.startX;
        const dy = element.endY - element.startY;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len, py = dx / len; // perpendicular unit
        const t = 5; // tick half-length

        ctx.beginPath();
        ctx.moveTo(element.startX - px * t, element.startY - py * t);
        ctx.lineTo(element.startX + px * t, element.startY + py * t);
        ctx.moveTo(element.endX - px * t, element.endY - py * t);
        ctx.lineTo(element.endX + px * t, element.endY + py * t);
        ctx.stroke();

        if (element.text) {
            const mx = (element.startX + element.endX) / 2;
            const my = (element.startY + element.endY) / 2;
            this.drawTextPanel(ctx, mx, my, element.text, element.fontSize || 14, element.color || ink, panelBg);
        }
    }

    drawPolyline(ctx, element) {
        const pts = element.points || [];
        if (pts.length < 2) return;

        ctx.save();
        const stroke = (points) => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            ctx.stroke();
        };

        if (element.lineStyle === 'zigzag') {
            ctx.setLineDash([]);
            stroke(zigzagPoints(pts));
        } else {
            if (element.lineStyle === 'dashed') ctx.setLineDash([10, 5]);
            else if (element.lineStyle === 'dotted') ctx.setLineDash([2, 4]);
            else ctx.setLineDash([]);
            stroke(pts);
            ctx.setLineDash([]);
        }

        // Optional arrowheads on either end, aimed along the end segment.
        if (element.endArrow && pts.length >= 2) {
            this.drawArrowHeadAt(ctx, pts[pts.length - 1].x, pts[pts.length - 1].y, pts[pts.length - 2].x, pts[pts.length - 2].y);
        }
        if (element.startArrow && pts.length >= 2) {
            this.drawArrowHeadAt(ctx, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        }
        ctx.restore();
    }

    // Draw a V arrowhead whose tip is at (tipX,tipY), pointing away from
    // (fromX,fromY). Shared by arrows and polyline end-arrows.
    drawArrowHeadAt(ctx, tipX, tipY, fromX, fromY) {
        ctx.save();
        ctx.setLineDash([]); // Arrow heads are always solid
        const size = 10;
        const angle = Math.atan2(tipY - fromY, tipX - fromX);
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - size * Math.cos(angle - Math.PI / 6), tipY - size * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - size * Math.cos(angle + Math.PI / 6), tipY - size * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        ctx.restore();
    }

    drawArrowHead(ctx, element) {
        const fromX = element.bendX !== undefined ? element.bendX : element.startX;
        const fromY = element.bendY !== undefined ? element.bendY : element.startY;
        this.drawArrowHeadAt(ctx, element.endX, element.endY, fromX, fromY);
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

    drawEllipse(ctx, element) {
        const x = Math.min(element.startX, element.endX);
        const y = Math.min(element.startY, element.endY);
        const width = Math.abs(element.endX - element.startX);
        const height = Math.abs(element.endY - element.startY);
        const cx = x + width / 2;
        const cy = y + height / 2;
        const rx = width / 2;
        const ry = height / 2;

        if (rx <= 0 || ry <= 0) return;

        const path = () => {
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        };

        // Fill (clipped to the ellipse so patterns don't bleed past the curve)
        if (element.fill && element.fill !== 'none') {
            ctx.save();
            path();
            ctx.clip();

            if (element.fill === 'solid') {
                ctx.fillStyle = element.color || '#ffffff';
                ctx.globalAlpha = 0.3;
                ctx.fillRect(x, y, width, height);
            } else if (element.fill === 'pattern' && element.pattern && element.pattern !== 'none') {
                const pattern = this.createPattern(ctx, element.pattern, element.color || '#ffffff');
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(x, y, width, height);
                }
            }
            ctx.restore();
        }

        // Border
        path();
        ctx.stroke();
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
        const lineHeight = fontSize * 1.2;
        String(element.text).split('\n').forEach((line, i) => {
            ctx.fillText(line, element.x, element.y + i * lineHeight);
        });
    }
    
    getContentBounds() {
        const bounds = getElementsBounds(this.app.elements, this.app.ctx);

        if (!bounds) {
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

        // Add some padding to prevent clipping
        const padding = 10;
        const minX = bounds.minX - padding;
        const minY = bounds.minY - padding;
        const maxX = bounds.maxX + padding;
        const maxY = bounds.maxY + padding;

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}