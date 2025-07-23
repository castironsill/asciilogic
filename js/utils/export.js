// utils/export.js

export class ExportManager {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const asciiText = this.exportToASCII(false); // Start with basic
                this.app.modalManager.showExportModal(asciiText);
            });
        }
    }
    
    exportToASCII(useExtended = false) {
        if (this.app.elements.length === 0) {
            return 'No drawing to export';
        }
        
        // Find bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.app.elements.forEach(el => {
            if (el.type === 'text') {
                const fontSize = el.fontSize || 16;
                const charWidth = fontSize * 0.6;
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y - fontSize);
                maxX = Math.max(maxX, el.x + el.text.length * charWidth);
                maxY = Math.max(maxY, el.y);
            } else if (el.type === 'box') {
                minX = Math.min(minX, el.startX, el.endX);
                minY = Math.min(minY, el.startY, el.endY);
                maxX = Math.max(maxX, el.startX, el.endX);
                maxY = Math.max(maxY, el.startY, el.endY);
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
        
        // ASCII characters are typically 2:1 (height:width)
        // So we need to scale X by 2 relative to Y for proper aspect ratio
        const charAspectRatio = 2.0; // Typical monospace char is twice as tall as wide
        const scaleX = 1.0; // Horizontal spacing between characters (reduced from 1.2)
        const scaleY = 2.4; // Vertical spacing between lines (increased from 1.8)
        
        // Calculate grid size with aspect ratio correction
        const width = Math.ceil((maxX - minX) / (this.app.gridSize * scaleX));
        const height = Math.ceil((maxY - minY) / (this.app.gridSize * scaleY));
        
        // Create grid
        const grid = Array(height).fill(null).map(() => Array(width).fill(' '));
        
        // Helper to convert canvas coordinates to grid coordinates
        const toGridX = (x) => Math.round((x - minX) / (this.app.gridSize * scaleX));
        const toGridY = (y) => Math.round((y - minY) / (this.app.gridSize * scaleY));
        
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
            if (el.type === 'line' || el.type === 'arrow') {
                this.drawLineToGrid(grid, el, toGridX, toGridY, chars, useExtended);
            } else if (el.type === 'box') {
                this.drawBoxToGrid(grid, el, toGridX, toGridY, chars);
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
    
    drawTextToGrid(grid, text, toGridX, toGridY) {
        const x = toGridX(text.x);
        const y = toGridY(text.y);
        
        for (let i = 0; i < text.text.length; i++) {
            if (this.isValidCell(grid, y, x + i)) {
                grid[y][x + i] = text.text[i];
            }
        }
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
    
    exportToPNG() {
        // Create a canvas for the PNG export
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (this.app.elements.length === 0) {
            canvas.width = 400;
            canvas.height = 300;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('No drawing to export', 200, 150);
            return canvas;
        }
        
        // Find bounds with padding
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.app.elements.forEach(el => {
            if (el.type === 'text') {
                const fontSize = el.fontSize || 16;
                ctx.font = `${fontSize}px monospace`;
                const textWidth = ctx.measureText(el.text).width;
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y - fontSize);
                maxX = Math.max(maxX, el.x + textWidth);
                maxY = Math.max(maxY, el.y + 10);
            } else if (el.type === 'box') {
                minX = Math.min(minX, el.startX, el.endX);
                minY = Math.min(minY, el.startY, el.endY);
                maxX = Math.max(maxX, el.startX, el.endX);
                maxY = Math.max(maxY, el.startY, el.endY);
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
        const padding = 40;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        // Set canvas size
        canvas.width = maxX - minX;
        canvas.height = maxY - minY;
        
        // Set background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Translate to account for bounds
        ctx.translate(-minX, -minY);
        
        // Set drawing styles
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        
        // Draw all elements
        this.app.elements.forEach(el => {
            if (el.type === 'line' || el.type === 'arrow') {
                ctx.beginPath();
                ctx.moveTo(el.startX, el.startY);
                
                if (el.bendX !== undefined && el.bendY !== undefined) {
                    ctx.lineTo(el.bendX, el.bendY);
                    ctx.lineTo(el.endX, el.endY);
                } else {
                    ctx.lineTo(el.endX, el.endY);
                }
                
                ctx.stroke();
                
                // Draw arrow head
                if (el.type === 'arrow') {
                    const angle = Math.atan2(
                        el.endY - (el.bendY !== undefined ? el.bendY : el.startY),
                        el.endX - (el.bendX !== undefined ? el.bendX : el.startX)
                    );
                    const arrowLength = 15;
                    const arrowAngle = Math.PI / 6;
                    
                    ctx.beginPath();
                    ctx.moveTo(el.endX, el.endY);
                    ctx.lineTo(
                        el.endX - arrowLength * Math.cos(angle - arrowAngle),
                        el.endY - arrowLength * Math.sin(angle - arrowAngle)
                    );
                    ctx.moveTo(el.endX, el.endY);
                    ctx.lineTo(
                        el.endX - arrowLength * Math.cos(angle + arrowAngle),
                        el.endY - arrowLength * Math.sin(angle + arrowAngle)
                    );
                    ctx.stroke();
                }
            } else if (el.type === 'box') {
                const x = Math.min(el.startX, el.endX);
                const y = Math.min(el.startY, el.endY);
                const width = Math.abs(el.endX - el.startX);
                const height = Math.abs(el.endY - el.startY);
                ctx.strokeRect(x, y, width, height);
            } else if (el.type === 'text') {
                const fontSize = el.fontSize || 16;
                ctx.font = `${fontSize}px monospace`;
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(el.text, el.x, el.y);
            }
        });
        
        // Add a subtle watermark
        ctx.globalAlpha = 0.3;
        ctx.font = '12px monospace';
        ctx.fillStyle = '#666';
        ctx.fillText('asciilogic.com', canvas.width - minX - 80, canvas.height - minY - 10);
        
        return canvas;
    }
}