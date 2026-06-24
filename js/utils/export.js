// utils/export.js

import { hexToAutocadIndex } from './colors.js';
import { zigzagPoints, connectorCorners } from './zigzag.js';
import { connectorMidpoint } from './geometry.js';

export class ExportManager {
    constructor(app) {
        this.app = app;
        // Note: the Export button click is wired in ControlsManager.
        // Don't add a second listener here or the modal opens twice.
    }

    exportToASCII(useExtended = false, wrapperOptions = {}) {
        if (this.app.elements.length === 0) {
            return 'No drawing to export';
        }
        
        // Get the base ASCII diagram
        const asciiDiagram = this.generateASCIIDiagram(useExtended);
        
        // Apply wrappers based on options
        let wrappedDiagram = asciiDiagram;
        
        // Apply markdown fence
        if (wrapperOptions.markdownFence) {
            wrappedDiagram = '```\n' + wrappedDiagram + '\n```';
        }
        
        // Apply comment style (C-style comments)
        if (wrapperOptions.commentStyle) {
            const lines = wrappedDiagram.split('\n');
            const commentedLines = [
                '/*',
                ...lines.map(line => ' * ' + line),
                ' */'
            ];
            wrappedDiagram = commentedLines.join('\n');
        }
        
        // Apply decorative box frame
        if (wrapperOptions.boxFrame) {
            const lines = wrappedDiagram.split('\n');
            const maxLength = Math.max(...lines.map(line => line.length));
            const topBorder = '╔' + '═'.repeat(maxLength + 2) + '╗';
            const bottomBorder = '╚' + '═'.repeat(maxLength + 2) + '╝';
            
            const framedLines = [
                topBorder,
                ...lines.map(line => '║ ' + line.padEnd(maxLength) + ' ║'),
                bottomBorder
            ];
            
            // Add header
            const header = [
                '',
                '    ASCII Diagram',
                '    Created with asciilogic.com',
                '    ' + new Date().toLocaleDateString(),
                ''
            ];
            
            wrappedDiagram = [...header, ...framedLines].join('\n');
        }
        
        return wrappedDiagram;
    }
    
    generateASCIIDiagram(useExtended) {
        // Use a default grid size if current is 0
        const gridSize = this.app.gridSize || 10;
        
        // ASCII characters are typically 2:1 (height:width)
        // So we need to scale X by 2 relative to Y for proper aspect ratio
        const scaleX = 1.0; // Horizontal spacing between characters
        const scaleY = 2.4; // Vertical spacing between lines
        // One ASCII row spans this many canvas pixels; text lines are placed
        // one row apart so they never collide in the coarser ASCII grid.
        const rowHeight = gridSize * scaleY;

        // Find bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.app.elements.forEach(el => {
            if (el.type === 'text') {
                const fontSize = el.fontSize || 16;
                const charWidth = fontSize * 0.6;
                const lines = String(el.text).split('\n');
                let maxLen = 0;
                lines.forEach(l => { maxLen = Math.max(maxLen, l.length); });
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y - fontSize);
                maxX = Math.max(maxX, el.x + maxLen * charWidth);
                maxY = Math.max(maxY, el.y + (lines.length - 1) * rowHeight);
            } else if (el.type === 'box') {
                minX = Math.min(minX, el.startX, el.endX);
                minY = Math.min(minY, el.startY, el.endY);
                maxX = Math.max(maxX, el.startX, el.endX);
                maxY = Math.max(maxY, el.startY, el.endY);
            } else if (el.type === 'polyline') {
                (el.points || []).forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
            } else {
                minX = Math.min(minX, el.startX, el.endX);
                minY = Math.min(minY, el.startY, el.endY);
                maxX = Math.max(maxX, el.startX, el.endX);
                maxY = Math.max(maxY, el.startY, el.endY);
                
                if (el.bendX !== undefined) {
                    minX = Math.min(minX, el.bendX);
                    minY = Math.min(minY, el.bendY);
                    maxX = Math.max(maxX, el.bendX);
                    maxY = Math.max(maxY, el.bendY);
                }
            }
        });
        
        // Add padding
        const padding = 20;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        // Calculate grid size with aspect ratio correction
        const width = Math.ceil((maxX - minX) / (gridSize * scaleX));
        const height = Math.ceil((maxY - minY) / (gridSize * scaleY));
        
        // Create grid
        const grid = Array(height).fill(null).map(() => Array(width).fill(' '));
        
        // Helper to convert canvas coordinates to grid coordinates
        const toGridX = (x) => Math.round((x - minX) / (gridSize * scaleX));
        const toGridY = (y) => Math.round((y - minY) / (gridSize * scaleY));
        
        // Characters for drawing
        const chars = useExtended ? {
            horizontal: '─',
            vertical: '│',
            topLeft: '┌',
            topRight: '┐',
            bottomLeft: '└',
            bottomRight: '┘',
            cross: '┼',
            teeUp: '┴',
            teeDown: '┬',
            teeLeft: '┤',
            teeRight: '├'
        } : {
            horizontal: '-',
            vertical: '|',
            topLeft: '+',
            topRight: '+',
            bottomLeft: '+',
            bottomRight: '+',
            cross: '+',
            teeUp: '+',
            teeDown: '+',
            teeLeft: '+',
            teeRight: '+'
        };
        
        // Draw elements
        this.app.elements.forEach(el => {
            if (el.type === 'line' || el.type === 'arrow' || el.type === 'dimension') {
                this.drawLineToGrid(grid, el, toGridX, toGridY, chars, useExtended);
            } else if (el.type === 'box') {
                this.drawBoxToGrid(grid, el, toGridX, toGridY, chars);
            } else if (el.type === 'ellipse') {
                this.drawEllipseToGrid(grid, el, toGridX, toGridY, chars);
            } else if (el.type === 'polyline') {
                const pts = el.points || [];
                for (let i = 0; i < pts.length - 1; i++) {
                    this.drawStraightLine(
                        grid,
                        toGridX(pts[i].x), toGridY(pts[i].y),
                        toGridX(pts[i + 1].x), toGridY(pts[i + 1].y),
                        chars
                    );
                }
            } else if (el.type === 'text') {
                this.drawTextToGrid(grid, el, toGridX, toGridY);
            }
        });
        
        // Draw arrows
        this.app.elements.forEach(el => {
            if (el.type === 'arrow') {
                this.drawArrowHeads(grid, el, toGridX, toGridY);
            }
        });

        // Draw connector labels and dimension values (centered on the line).
        this.app.elements.forEach(el => {
            const labelText = el.type === 'dimension'
                ? el.text
                : ((el.type === 'line' || el.type === 'arrow') ? el.label : null);
            if (labelText) {
                const mid = connectorMidpoint(el);
                const gx = toGridX(mid.x);
                const gy = toGridY(mid.y);
                const lines = String(labelText).split('\n');
                lines.forEach((line, li) => {
                    const sx = gx - Math.floor(line.length / 2);
                    const ry = gy - Math.floor(lines.length / 2) + li;
                    for (let i = 0; i < line.length; i++) {
                        if (this.isValidCell(grid, ry, sx + i)) grid[ry][sx + i] = line[i];
                    }
                });
            }
        });

        // Convert grid to string
        return grid.map(row => row.join('')).join('\n');
    }
    
    drawLineToGrid(grid, line, toGridX, toGridY, chars, useExtended) {
        const startX = toGridX(line.startX);
        const startY = toGridY(line.startY);
        const endX = toGridX(line.endX);
        const endY = toGridY(line.endY);
        
        if (line.bendX !== undefined && line.bendY !== undefined) {
            const bendX = toGridX(line.bendX);
            const bendY = toGridY(line.bendY);
            
            // Draw first segment
            this.drawStraightLine(grid, startX, startY, bendX, bendY, chars);
            
            // Draw second segment
            this.drawStraightLine(grid, bendX, bendY, endX, endY, chars);
            
            // Draw corner
            if (useExtended && this.isValidCell(grid, bendY, bendX)) {
                const horizontal1 = (startY === bendY);
                const horizontal2 = (bendY === endY);
                
                if (horizontal1 && !horizontal2) {
                    grid[bendY][bendX] = bendX > startX ? '┐' : '┌';
                } else if (!horizontal1 && horizontal2) {
                    grid[bendY][bendX] = bendY > startY ? '└' : '┌';
                }
            }
        } else {
            this.drawStraightLine(grid, startX, startY, endX, endY, chars);
        }
    }
    
    drawStraightLine(grid, x1, y1, x2, y2, chars) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        
        if (dx === 0) {
            // Vertical line
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                if (this.isValidCell(grid, y, x1)) {
                    if (grid[y][x1] === chars.horizontal || grid[y][x1] === '-') {
                        grid[y][x1] = chars.cross;
                    } else if (grid[y][x1] === ' ') {
                        grid[y][x1] = chars.vertical;
                    }
                }
            }
        } else if (dy === 0) {
            // Horizontal line
            for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
                if (this.isValidCell(grid, y1, x)) {
                    if (grid[y1][x] === chars.vertical || grid[y1][x] === '|') {
                        grid[y1][x] = chars.cross;
                    } else if (grid[y1][x] === ' ') {
                        grid[y1][x] = chars.horizontal;
                    }
                }
            }
        }
    }
    
    drawBoxToGrid(grid, box, toGridX, toGridY, chars) {
        const x1 = toGridX(Math.min(box.startX, box.endX));
        const y1 = toGridY(Math.min(box.startY, box.endY));
        const x2 = toGridX(Math.max(box.startX, box.endX));
        const y2 = toGridY(Math.max(box.startY, box.endY));
        
        // Top and bottom borders
        for (let x = x1; x <= x2; x++) {
            if (this.isValidCell(grid, y1, x)) grid[y1][x] = chars.horizontal;
            if (this.isValidCell(grid, y2, x)) grid[y2][x] = chars.horizontal;
        }
        
        // Left and right borders
        for (let y = y1; y <= y2; y++) {
            if (this.isValidCell(grid, y, x1)) grid[y][x1] = chars.vertical;
            if (this.isValidCell(grid, y, x2)) grid[y][x2] = chars.vertical;
        }
        
        // Corners
        if (this.isValidCell(grid, y1, x1)) grid[y1][x1] = chars.topLeft;
        if (this.isValidCell(grid, y1, x2)) grid[y1][x2] = chars.topRight;
        if (this.isValidCell(grid, y2, x1)) grid[y2][x1] = chars.bottomLeft;
        if (this.isValidCell(grid, y2, x2)) grid[y2][x2] = chars.bottomRight;
    }
    
    drawEllipseToGrid(grid, el, toGridX, toGridY, chars) {
        const x1 = toGridX(Math.min(el.startX, el.endX));
        const y1 = toGridY(Math.min(el.startY, el.endY));
        const x2 = toGridX(Math.max(el.startX, el.endX));
        const y2 = toGridY(Math.max(el.startY, el.endY));

        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = (x2 - x1) / 2;
        const ry = (y2 - y1) / 2;
        if (rx <= 0 || ry <= 0) return;

        // Left/right extent for each row.
        for (let gy = y1; gy <= y2; gy++) {
            const dy = (gy - cy) / ry;
            if (Math.abs(dy) > 1) continue;
            const dx = rx * Math.sqrt(1 - dy * dy);
            const lx = Math.round(cx - dx);
            const rxp = Math.round(cx + dx);
            if (this.isValidCell(grid, gy, lx)) grid[gy][lx] = chars.vertical;
            if (this.isValidCell(grid, gy, rxp)) grid[gy][rxp] = chars.vertical;
        }

        // Top/bottom extent for each column (caps the curve).
        for (let gx = x1; gx <= x2; gx++) {
            const dx = (gx - cx) / rx;
            if (Math.abs(dx) > 1) continue;
            const dy = ry * Math.sqrt(1 - dx * dx);
            const ty = Math.round(cy - dy);
            const by = Math.round(cy + dy);
            if (this.isValidCell(grid, ty, gx)) grid[ty][gx] = chars.horizontal;
            if (this.isValidCell(grid, by, gx)) grid[by][gx] = chars.horizontal;
        }
    }

    drawTextToGrid(grid, text, toGridX, toGridY) {
        const x = toGridX(text.x);
        const y0 = toGridY(text.y);

        // Each line goes on its own consecutive row; the ASCII grid is too
        // coarse to honor sub-row pixel line spacing.
        String(text.text).split('\n').forEach((line, li) => {
            const y = y0 + li;
            for (let i = 0; i < line.length; i++) {
                if (this.isValidCell(grid, y, x + i)) {
                    grid[y][x + i] = line[i];
                }
            }
        });
    }
    
    drawArrowHeads(grid, arrow, toGridX, toGridY) {
        const endX = toGridX(arrow.endX);
        const endY = toGridY(arrow.endY);
        
        let prevX, prevY;
        if (arrow.bendX !== undefined) {
            prevX = toGridX(arrow.bendX);
            prevY = toGridY(arrow.bendY);
        } else {
            prevX = toGridX(arrow.startX);
            prevY = toGridY(arrow.startY);
        }
        
        const dx = endX - prevX;
        const dy = endY - prevY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal arrow
            if (this.isValidCell(grid, endY, endX)) {
                grid[endY][endX] = dx > 0 ? '>' : '<';
            }
        } else {
            // Vertical arrow
            if (this.isValidCell(grid, endY, endX)) {
                grid[endY][endX] = dy > 0 ? 'v' : '^';
            }
        }
    }
    
    isValidCell(grid, y, x) {
        return y >= 0 && y < grid.length && x >= 0 && x < grid[0].length;
    }
    
    // Resolve a background option into the page fill, the default "ink" for
    // uncolored elements, and the label-panel fill.
    backgroundColors(background) {
        if (background === 'white') return { fill: '#ffffff', ink: '#1a1a1a', panel: '#ffffff' };
        if (background === 'transparent') return { fill: null, ink: '#1a1a1a', panel: '#ffffff' };
        return { fill: '#1a1a1a', ink: '#ffffff', panel: '#1a1a1a' }; // dark (default)
    }

    exportToPNG(options = {}) {
        const { background = 'dark', watermark = true } = options;
        const colors = this.backgroundColors(background);

        // Create a canvas for the PNG export at 2x resolution for higher quality
        const scale = 2; // 2x resolution for retina quality
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (this.app.elements.length === 0) {
            canvas.width = 800; // 2x of 400
            canvas.height = 600; // 2x of 300
            ctx.scale(scale, scale);
            if (colors.fill) {
                ctx.fillStyle = colors.fill;
                ctx.fillRect(0, 0, 400, 300);
            }
            ctx.fillStyle = '#666';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('No drawing to export', 200, 150);
            canvas.style.width = '400px';
            canvas.style.height = '300px';
            return canvas;
        }

        // Get bounds from renderer
        const bounds = this.app.renderer.getContentBounds();

        // Add padding
        const padding = 40;
        const width = bounds.width + (padding * 2);
        const height = bounds.height + (padding * 2);

        // Set canvas size at 2x resolution
        canvas.width = width * scale;
        canvas.height = height * scale;

        // Set display size (CSS pixels)
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        // Scale context for 2x resolution
        ctx.scale(scale, scale);

        // Background (skipped entirely when transparent)
        if (colors.fill) {
            ctx.fillStyle = colors.fill;
            ctx.fillRect(0, 0, width, height);
        }

        // Translate to account for bounds
        ctx.translate(padding - bounds.minX, padding - bounds.minY);

        // Enable anti-aliasing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw all elements using the renderer's drawElement method
        this.app.elements.forEach(el => {
            this.app.renderer.drawElement(ctx, el, false, colors.ink, colors.panel);
        });

        // Optional watermark
        if (watermark) {
            ctx.globalAlpha = 0.3;
            ctx.font = '12px monospace';
            ctx.fillStyle = '#666';
            ctx.fillText('asciilogic.com', width - 90 - padding + bounds.minX, height - 10 - padding + bounds.minY);
        }

        return canvas;
    }
    
    exportToSVG(groupElements = true, options = {}) {
        const { background = 'dark', watermark = true } = options;
        const colors = this.backgroundColors(background);
        const ink = colors.ink;

        if (this.app.elements.length === 0) {
            // Return empty SVG with message
            const bgRect = colors.fill ? `\n                <rect width="400" height="300" fill="${colors.fill}"/>` : '';
            return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">${bgRect}
                <text x="200" y="150" font-family="monospace" font-size="16" fill="#666" text-anchor="middle">No drawing to export</text>
            </svg>`;
        }
        
        // Get bounds from renderer
        const bounds = this.app.renderer.getContentBounds();
        
        // Add padding
        const padding = 40;
        const width = bounds.width + (padding * 2);
        const height = bounds.height + (padding * 2);
        
        // Start building SVG
        let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Add defs section for patterns
        svg += '\n  <defs>';
        
        // Collect unique color/pattern combinations
        const patternDefs = new Set();
        
        // First pass: collect all unique patterns needed
        this.app.elements.forEach(el => {
            if ((el.type === 'box' || el.type === 'ellipse') && el.fill === 'pattern' && el.pattern !== 'none') {
                const color = el.color || '#ffffff';
                const patternId = `${el.pattern}-${color.replace('#', '')}`;
                if (!patternDefs.has(patternId)) {
                    patternDefs.add(patternId);
                    svg += this.createColoredPatternDef(el.pattern, color, patternId);
                }
            }
        });
        
        svg += '\n  </defs>';
        
        // Add background (omitted when transparent)
        if (colors.fill) {
            svg += `\n  <rect width="${width}" height="${height}" fill="${colors.fill}"/>`;
        }
        
        // Create a group with translation to handle bounds - or individual transforms
        if (groupElements) {
            svg += `\n  <g transform="translate(${padding - bounds.minX}, ${padding - bounds.minY})">`;
        }
        
        // Draw all elements
        this.app.elements.forEach(el => {
            const transform = groupElements ? '' : ` transform="translate(${padding - bounds.minX}, ${padding - bounds.minY})"`;
            const color = el.color || ink;
            
            if (el.type === 'line' || el.type === 'arrow') {
                // Draw line path
                let path;
                if (el.lineStyle === 'zigzag') {
                    const pts = zigzagPoints(connectorCorners(el));
                    path = `M ${pts[0].x} ${pts[0].y}` + pts.slice(1).map(p => ` L ${p.x} ${p.y}`).join('');
                } else if (el.bendX !== undefined && el.bendY !== undefined) {
                    path = `M ${el.startX} ${el.startY} L ${el.bendX} ${el.bendY} L ${el.endX} ${el.endY}`;
                } else {
                    path = `M ${el.startX} ${el.startY} L ${el.endX} ${el.endY}`;
                }

                // Add stroke-dasharray for line styles (zigzag is real geometry)
                let strokeDasharray = '';
                if (el.lineStyle === 'dashed') {
                    strokeDasharray = ' stroke-dasharray="10,5"';
                } else if (el.lineStyle === 'dotted') {
                    strokeDasharray = ' stroke-dasharray="2,4"';
                }

                svg += `\n    <path d="${path}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"${strokeDasharray}${transform}/>`;
                
                // Draw arrow head if needed
                if (el.type === 'arrow') {
                    const angle = Math.atan2(
                        el.endY - (el.bendY !== undefined ? el.bendY : el.startY),
                        el.endX - (el.bendX !== undefined ? el.bendX : el.startX)
                    );
                    const arrowLength = 15;
                    const arrowAngle = Math.PI / 6;
                    
                    const x1 = el.endX - arrowLength * Math.cos(angle - arrowAngle);
                    const y1 = el.endY - arrowLength * Math.sin(angle - arrowAngle);
                    const x2 = el.endX - arrowLength * Math.cos(angle + arrowAngle);
                    const y2 = el.endY - arrowLength * Math.sin(angle + arrowAngle);
                    
                    svg += `\n    <path d="M ${el.endX} ${el.endY} L ${x1} ${y1} M ${el.endX} ${el.endY} L ${x2} ${y2}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"${transform}/>`;
                }

                // Mid-line label with a background panel.
                if (el.label) {
                    const mid = connectorMidpoint(el);
                    const fontSize = el.labelFontSize || 14;
                    const lines = String(el.label).split('\n');
                    const charW = fontSize * 0.6;
                    const maxLen = Math.max(...lines.map(l => l.length));
                    const boxW = maxLen * charW + 6;
                    const boxH = lines.length * fontSize * 1.2 + 2;
                    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    svg += `\n    <rect x="${mid.x - boxW / 2}" y="${mid.y - boxH / 2}" width="${boxW}" height="${boxH}" fill="${colors.panel}"${transform}/>`;
                    const tspans = lines
                        .map((line, i) => `<tspan x="${mid.x}" dy="${i === 0 ? 0 : fontSize * 1.2}">${esc(line)}</tspan>`)
                        .join('');
                    svg += `\n    <text x="${mid.x}" y="${mid.y - boxH / 2 + fontSize}" font-family="monospace" font-size="${fontSize}" fill="${color}" text-anchor="middle"${transform}>${tspans}</text>`;
                }
            } else if (el.type === 'box') {
                const x = Math.min(el.startX, el.endX);
                const y = Math.min(el.startY, el.endY);
                const rectWidth = Math.abs(el.endX - el.startX);
                const rectHeight = Math.abs(el.endY - el.startY);
                
                let fillAttr = 'fill="none"';
                
                if (el.fill === 'solid') {
                    fillAttr = `fill="${color}" fill-opacity="0.3"`;
                } else if (el.fill === 'pattern' && el.pattern !== 'none') {
                    const patternId = `${el.pattern}-${color.replace('#', '')}`;
                    fillAttr = `fill="url(#${patternId})"`;
                }
                
                svg += `\n    <rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" stroke="${color}" stroke-width="2" ${fillAttr} stroke-linejoin="round"${transform}/>`;
            } else if (el.type === 'ellipse') {
                const minX = Math.min(el.startX, el.endX);
                const minY = Math.min(el.startY, el.endY);
                const w = Math.abs(el.endX - el.startX);
                const h = Math.abs(el.endY - el.startY);
                const ecx = minX + w / 2;
                const ecy = minY + h / 2;
                const rx = w / 2;
                const ry = h / 2;

                let fillAttr = 'fill="none"';
                if (el.fill === 'solid') {
                    fillAttr = `fill="${color}" fill-opacity="0.3"`;
                } else if (el.fill === 'pattern' && el.pattern !== 'none') {
                    const patternId = `${el.pattern}-${color.replace('#', '')}`;
                    fillAttr = `fill="url(#${patternId})"`;
                }

                svg += `\n    <ellipse cx="${ecx}" cy="${ecy}" rx="${rx}" ry="${ry}" stroke="${color}" stroke-width="2" ${fillAttr}${transform}/>`;
            } else if (el.type === 'polyline') {
                const pts = el.points || [];
                if (pts.length >= 2) {
                    const src = el.lineStyle === 'zigzag' ? zigzagPoints(pts) : pts;
                    const path = `M ${src[0].x} ${src[0].y}` + src.slice(1).map(p => ` L ${p.x} ${p.y}`).join('');
                    let strokeDasharray = '';
                    if (el.lineStyle === 'dashed') strokeDasharray = ' stroke-dasharray="10,5"';
                    else if (el.lineStyle === 'dotted') strokeDasharray = ' stroke-dasharray="2,4"';
                    svg += `\n    <path d="${path}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"${strokeDasharray}${transform}/>`;
                }
            } else if (el.type === 'dimension') {
                svg += `\n    <line x1="${el.startX}" y1="${el.startY}" x2="${el.endX}" y2="${el.endY}" stroke="${color}" stroke-width="2"${transform}/>`;

                const ddx = el.endX - el.startX;
                const ddy = el.endY - el.startY;
                const dlen = Math.hypot(ddx, ddy) || 1;
                const tpx = -ddy / dlen, tpy = ddx / dlen;
                const tk = 5;
                svg += `\n    <line x1="${el.startX - tpx * tk}" y1="${el.startY - tpy * tk}" x2="${el.startX + tpx * tk}" y2="${el.startY + tpy * tk}" stroke="${color}" stroke-width="2"${transform}/>`;
                svg += `\n    <line x1="${el.endX - tpx * tk}" y1="${el.endY - tpy * tk}" x2="${el.endX + tpx * tk}" y2="${el.endY + tpy * tk}" stroke="${color}" stroke-width="2"${transform}/>`;

                if (el.text) {
                    const mx = (el.startX + el.endX) / 2;
                    const my = (el.startY + el.endY) / 2;
                    const fontSize = el.fontSize || 14;
                    const charW = fontSize * 0.6;
                    const boxW = String(el.text).length * charW + 6;
                    const boxH = fontSize * 1.2 + 2;
                    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    svg += `\n    <rect x="${mx - boxW / 2}" y="${my - boxH / 2}" width="${boxW}" height="${boxH}" fill="${colors.panel}"${transform}/>`;
                    svg += `\n    <text x="${mx}" y="${my + fontSize / 3}" font-family="monospace" font-size="${fontSize}" fill="${color}" text-anchor="middle"${transform}>${esc(String(el.text))}</text>`;
                }
            } else if (el.type === 'text') {
                const fontSize = el.fontSize || 16;
                const lineHeight = fontSize * 1.2;
                const escape = (s) => s
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
                const tspans = String(el.text).split('\n')
                    .map((line, i) => `<tspan x="${el.x}" dy="${i === 0 ? 0 : lineHeight}">${escape(line)}</tspan>`)
                    .join('');
                svg += `\n    <text x="${el.x}" y="${el.y}" font-family="monospace" font-size="${fontSize}" fill="${color}"${transform}>${tspans}</text>`;
            }
        });
        
        // Close the transform group if we're using it
        if (groupElements) {
            svg += '\n  </g>';
        }
        
        // Optional watermark
        if (watermark) {
            svg += `\n  <text x="${width - 90}" y="${height - 10}" font-family="monospace" font-size="12" fill="#666" opacity="0.3">asciilogic.com</text>`;
        }
        
        // Close SVG
        svg += '\n</svg>';
        
        return svg;
    }
    
    createColoredPatternDef(patternType, color, patternId) {
        const opacity = '0.3';
        
        switch (patternType) {
            case 'diagonal':
                return `\n    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="8" height="8">
      <path d="M0,8 L8,0" stroke="${color}" stroke-width="0.5" opacity="${opacity}" fill="none"/>
    </pattern>`;
                
            case 'crosshatch':
                return `\n    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="8" height="8">
      <path d="M0,8 L8,0 M0,0 L8,8" stroke="${color}" stroke-width="0.5" opacity="${opacity}" fill="none"/>
    </pattern>`;
                
            case 'horizontal':
                return `\n    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="8" height="4">
      <line x1="0" y1="2" x2="8" y2="2" stroke="${color}" stroke-width="0.5" opacity="${opacity}"/>
    </pattern>`;
                
            case 'vertical':
                return `\n    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="4" height="8">
      <line x1="2" y1="0" x2="2" y2="8" stroke="${color}" stroke-width="0.5" opacity="${opacity}"/>
    </pattern>`;
                
            case 'light':
                return `\n    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="10" height="10">
      <circle cx="5" cy="5" r="1" fill="${color}" opacity="${opacity}"/>
    </pattern>`;
                
            case 'medium':
                return `\n    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="8" height="8">
      <circle cx="4" cy="4" r="1.5" fill="${color}" opacity="${opacity}"/>
    </pattern>`;
                
            case 'dense':
                return `\n    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="6" height="6">
      <circle cx="3" cy="3" r="2" fill="${color}" opacity="${opacity}"/>
    </pattern>`;
                
            default:
                return '';
        }
    }
    
    exportToDXF() {
        // Scale factor: 1 pixel = 0.1 units in CAD (so 100 pixels = 10 units)
        // This makes drawings more reasonable in size
        const scale = 0.1;
        
        // Find bounds to determine the flip point
        let maxY = -Infinity;
        this.app.elements.forEach(el => {
            if (el.type === 'text') {
                const lineHeight = (el.fontSize || 16) * 1.2;
                const lineCount = String(el.text).split('\n').length;
                maxY = Math.max(maxY, el.y + (lineCount - 1) * lineHeight);
            } else if (el.type === 'box') {
                maxY = Math.max(maxY, el.startY, el.endY);
            } else if (el.type === 'polyline') {
                (el.points || []).forEach(p => { maxY = Math.max(maxY, p.y); });
            } else {
                maxY = Math.max(maxY, el.startY, el.endY);
                if (el.bendY !== undefined) {
                    maxY = Math.max(maxY, el.bendY);
                }
            }
        });
        
        // Helper function to flip Y coordinate
        const flipY = (y) => (maxY - y) * scale;
        
        // Minimal DXF header - R12 format (most compatible)
        let dxf = '0\nSECTION\n2\nENTITIES\n';
        
        // Export each element
        this.app.elements.forEach(el => {
            const colorIndex = this.getAutocadColorIndex(el.color);
            
            if (el.type === 'line' || el.type === 'arrow') {
                const lineStyle = el.lineStyle || 'solid';
                // Export line segments with flipped Y
                if (el.bendX !== undefined && el.bendY !== undefined) {
                    // First segment
                    dxf += this.dxfLine(
                        el.startX * scale, 
                        flipY(el.startY), 
                        el.bendX * scale, 
                        flipY(el.bendY),
                        lineStyle,
                        colorIndex
                    );
                    // Second segment
                    dxf += this.dxfLine(
                        el.bendX * scale, 
                        flipY(el.bendY), 
                        el.endX * scale, 
                        flipY(el.endY),
                        lineStyle,
                        colorIndex
                    );
                } else {
                    // Single line
                    dxf += this.dxfLine(
                        el.startX * scale, 
                        flipY(el.startY), 
                        el.endX * scale, 
                        flipY(el.endY),
                        lineStyle,
                        colorIndex
                    );
                }
                
                // Add arrowhead if needed
                if (el.type === 'arrow') {
                    const angle = Math.atan2(
                        (el.endY - (el.bendY !== undefined ? el.bendY : el.startY)),
                        el.endX - (el.bendX !== undefined ? el.bendX : el.startX)
                    );
                    const arrowLength = 15 * scale;
                    const arrowAngle = Math.PI / 6;
                    
                    // Arrow lines (always solid) - with flipped Y
                    dxf += this.dxfLine(
                        el.endX * scale,
                        flipY(el.endY),
                        (el.endX - 15 * Math.cos(angle - arrowAngle)) * scale,
                        flipY(el.endY - 15 * Math.sin(angle - arrowAngle)),
                        'solid',
                        colorIndex
                    );
                    dxf += this.dxfLine(
                        el.endX * scale,
                        flipY(el.endY),
                        (el.endX - 15 * Math.cos(angle + arrowAngle)) * scale,
                        flipY(el.endY - 15 * Math.sin(angle + arrowAngle)),
                        'solid',
                        colorIndex
                    );
                }

                // Mid-line label
                if (el.label) {
                    const mid = connectorMidpoint(el);
                    const fontSize = el.labelFontSize || 14;
                    String(el.label).split('\n').forEach((line, i) => {
                        dxf += this.dxfText(
                            mid.x * scale,
                            flipY(mid.y + i * fontSize * 1.2),
                            line,
                            fontSize * scale,
                            colorIndex
                        );
                    });
                }
            } else if (el.type === 'box') {
                // Export box with color and fill
                dxf += this.dxfBox(el, scale, flipY, colorIndex);
            } else if (el.type === 'ellipse') {
                dxf += this.dxfEllipse(el, scale, flipY, colorIndex);
            } else if (el.type === 'polyline') {
                const pts = el.points || [];
                for (let i = 0; i < pts.length - 1; i++) {
                    dxf += this.dxfLine(
                        pts[i].x * scale, flipY(pts[i].y),
                        pts[i + 1].x * scale, flipY(pts[i + 1].y),
                        el.lineStyle || 'solid', colorIndex
                    );
                }
            } else if (el.type === 'dimension') {
                dxf += this.dxfLine(el.startX * scale, flipY(el.startY), el.endX * scale, flipY(el.endY), 'solid', colorIndex);
                const ddx = el.endX - el.startX, ddy = el.endY - el.startY;
                const dlen = Math.hypot(ddx, ddy) || 1;
                const tpx = -ddy / dlen, tpy = ddx / dlen, tk = 5;
                dxf += this.dxfLine((el.startX - tpx * tk) * scale, flipY(el.startY - tpy * tk), (el.startX + tpx * tk) * scale, flipY(el.startY + tpy * tk), 'solid', colorIndex);
                dxf += this.dxfLine((el.endX - tpx * tk) * scale, flipY(el.endY - tpy * tk), (el.endX + tpx * tk) * scale, flipY(el.endY + tpy * tk), 'solid', colorIndex);
                if (el.text) {
                    const mx = (el.startX + el.endX) / 2, my = (el.startY + el.endY) / 2;
                    dxf += this.dxfText(mx * scale, flipY(my), String(el.text), (el.fontSize || 14) * scale, colorIndex);
                }
            } else if (el.type === 'text') {
                // Export each line as its own TEXT entity (DXF TEXT is single-line)
                const fontSize = el.fontSize || 16;
                const lineHeight = fontSize * 1.2;
                String(el.text).split('\n').forEach((line, i) => {
                    dxf += this.dxfText(
                        el.x * scale,
                        flipY(el.y + i * lineHeight),
                        line,
                        fontSize * scale,
                        colorIndex
                    );
                });
            }
        });
        
        // End entities section
        dxf += '0\nENDSEC\n';
        
        // End of file
        dxf += '0\nEOF\n';
        
        return dxf;
    }
    
    getAutocadColorIndex(color) {
        // Delegate to the shared palette so DXF indices stay in sync with
        // the actual on-screen hex values (colors.js).
        return hexToAutocadIndex(color);
    }
    
    dxfBox(element, scale, flipY, colorIndex) {
        const minX = Math.min(element.startX, element.endX) * scale;
        const maxX = Math.max(element.startX, element.endX) * scale;
        const minY = flipY(Math.max(element.startY, element.endY));
        const maxY = flipY(Math.min(element.startY, element.endY));
        
        let dxf = '';
        
        // Method 1: Use LWPOLYLINE for the box (most compatible closed shape)
        dxf += '0\nLWPOLYLINE\n';
        dxf += `8\n0\n`; // Layer 0 (default)
        dxf += `62\n${colorIndex}\n`; // Color
        dxf += '90\n4\n'; // 4 vertices
        dxf += '70\n1\n'; // 1 = closed
        dxf += `10\n${minX}\n20\n${minY}\n`; // Bottom-left
        dxf += `10\n${maxX}\n20\n${minY}\n`; // Bottom-right
        dxf += `10\n${maxX}\n20\n${maxY}\n`; // Top-right
        dxf += `10\n${minX}\n20\n${maxY}\n`; // Top-left
        
        // Method 2: For fills, add simple visual indicators using lines
        // Adjust pattern sizing to be visible at 0.1 scale
        if (element.fill === 'solid') {
            // For solid fill, add X pattern
            dxf += this.dxfLine(minX, minY, maxX, maxY, 'solid', colorIndex);
            dxf += this.dxfLine(maxX, minY, minX, maxY, 'solid', colorIndex);
        } else if (element.fill === 'pattern' && element.pattern !== 'none') {
            const boxWidth = maxX - minX;
            const boxHeight = maxY - minY;
            
            switch (element.pattern) {
                case 'diagonal':
                    // Diagonal lines - use percentage of box size for spacing
                    const diagSpacing = Math.min(boxWidth, boxHeight) * 0.2; // 20% of smallest dimension
                    const numDiagLines = Math.floor(Math.max(boxWidth, boxHeight) / diagSpacing);
                    
                    for (let i = 1; i < numDiagLines; i++) {
                        const offset = i * diagSpacing;
                        // Start from bottom edge going up-right
                        if (offset < boxWidth + boxHeight) {
                            let x1 = minX + Math.min(offset, boxWidth);
                            let y1 = minY + Math.max(0, offset - boxWidth);
                            let x2 = minX + Math.max(0, offset - boxHeight);
                            let y2 = minY + Math.min(offset, boxHeight);
                            
                            // Clip to box bounds
                            if (x1 <= maxX && y2 <= maxY) {
                                dxf += this.dxfLine(x1, y1, x2, y2, 'solid', colorIndex);
                            }
                        }
                    }
                    break;
                    
                case 'horizontal':
                    // Horizontal lines - 4 lines evenly spaced
                    const hLines = 4;
                    const hSpacing = boxHeight / (hLines + 1);
                    for (let i = 1; i <= hLines; i++) {
                        const y = minY + (i * hSpacing);
                        dxf += this.dxfLine(
                            minX + boxWidth * 0.1,
                            y,
                            maxX - boxWidth * 0.1,
                            y,
                            'solid', colorIndex
                        );
                    }
                    break;
                    
                case 'vertical':
                    // Vertical lines - 4 lines evenly spaced
                    const vLines = 4;
                    const vSpacing = boxWidth / (vLines + 1);
                    for (let i = 1; i <= vLines; i++) {
                        const x = minX + (i * vSpacing);
                        dxf += this.dxfLine(
                            x,
                            minY + boxHeight * 0.1,
                            x,
                            maxY - boxHeight * 0.1,
                            'solid', colorIndex
                        );
                    }
                    break;
                    
                case 'crosshatch':
                    // Crosshatch - combination of diagonal lines both ways
                    const crossSpacing = Math.min(boxWidth, boxHeight) * 0.25;
                    
                    // First direction (bottom-left to top-right)
                    for (let i = 1; i < 4; i++) {
                        const offset = i * crossSpacing;
                        if (offset < boxWidth) {
                            dxf += this.dxfLine(
                                minX + offset, minY,
                                Math.min(minX + offset + boxHeight, maxX), 
                                Math.min(minY + boxHeight, maxY),
                                'solid', colorIndex
                            );
                        }
                        if (offset < boxHeight) {
                            dxf += this.dxfLine(
                                minX, minY + offset,
                                Math.min(minX + boxWidth, maxX), 
                                Math.min(minY + offset + boxWidth, maxY),
                                'solid', colorIndex
                            );
                        }
                    }
                    
                    // Second direction (bottom-right to top-left)
                    for (let i = 1; i < 4; i++) {
                        const offset = i * crossSpacing;
                        if (offset < boxWidth) {
                            dxf += this.dxfLine(
                                maxX - offset, minY,
                                Math.max(maxX - offset - boxHeight, minX),
                                Math.min(minY + boxHeight, maxY),
                                'solid', colorIndex
                            );
                        }
                        if (offset < boxHeight) {
                            dxf += this.dxfLine(
                                maxX, minY + offset,
                                Math.max(maxX - boxWidth, minX),
                                Math.min(minY + offset + boxWidth, maxY),
                                'solid', colorIndex
                            );
                        }
                    }
                    break;
                    
                case 'light':
                case 'medium':
                case 'dense':
                    // Dot patterns as grid of small plus signs
                    const density = element.pattern === 'light' ? 3 : 
                                   element.pattern === 'medium' ? 4 : 5;
                    const dotSpacingX = boxWidth / (density + 1);
                    const dotSpacingY = boxHeight / (density + 1);
                    // Make dots proportional to spacing
                    const dotSize = Math.min(dotSpacingX, dotSpacingY) * 0.2;
                    
                    for (let i = 1; i <= density; i++) {
                        for (let j = 1; j <= density; j++) {
                            const dotX = minX + (i * dotSpacingX);
                            const dotY = minY + (j * dotSpacingY);
                            // Plus sign for each dot
                            dxf += this.dxfLine(
                                dotX - dotSize, dotY,
                                dotX + dotSize, dotY,
                                'solid', colorIndex
                            );
                            dxf += this.dxfLine(
                                dotX, dotY - dotSize,
                                dotX, dotY + dotSize,
                                'solid', colorIndex
                            );
                        }
                    }
                    break;
            }
        }
        
        return dxf;
    }
    
    dxfEllipse(element, scale, flipY, colorIndex) {
        // Approximate the ellipse as a closed polyline so it renders in
        // R12-era CAD software that lacks the ELLIPSE entity.
        const cxPix = (element.startX + element.endX) / 2;
        const cyPix = (element.startY + element.endY) / 2;
        const rxPix = Math.abs(element.endX - element.startX) / 2;
        const ryPix = Math.abs(element.endY - element.startY) / 2;
        if (rxPix <= 0 || ryPix <= 0) return '';

        const segments = 48;
        let dxf = '0\nLWPOLYLINE\n8\n0\n';
        dxf += `62\n${colorIndex}\n`;
        dxf += `90\n${segments}\n`;
        dxf += '70\n1\n'; // closed

        for (let i = 0; i < segments; i++) {
            const theta = (2 * Math.PI * i) / segments;
            const px = (cxPix + rxPix * Math.cos(theta)) * scale;
            const py = flipY(cyPix + ryPix * Math.sin(theta));
            dxf += `10\n${px}\n20\n${py}\n`;
        }

        return dxf;
    }

    dxfLine(x1, y1, x2, y2, lineStyle = 'solid', colorIndex = 7) {
        const lineType = this.getLineTypeName(lineStyle);
        return `0\nLINE\n8\n0\n6\n${lineType}\n62\n${colorIndex}\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y2}\n`;
    }
    
    getLineTypeName(style) {
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
    
    dxfText(x, y, text, fontSize, colorIndex = 7) {
        const height = fontSize * 0.8; // Approximate conversion
        return `0\nTEXT\n8\n0\n62\n${colorIndex}\n10\n${x}\n20\n${y}\n40\n${height}\n1\n${text}\n`;
    }
}