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
        // Create a canvas for the PNG export at 2x resolution for higher quality
        const scale = 2; // 2x resolution for retina quality
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (this.app.elements.length === 0) {
            canvas.width = 800; // 2x of 400
            canvas.height = 600; // 2x of 300
            ctx.scale(scale, scale);
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, 400, 300);
            ctx.fillStyle = '#666';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('No drawing to export', 200, 150);
            canvas.style.width = '400px';
            canvas.style.height = '300px';
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
        
        // Set canvas size at 2x resolution
        const width = maxX - minX;
        const height = maxY - minY;
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        // Set display size (CSS pixels)
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        // Scale context for 2x resolution
        ctx.scale(scale, scale);
        
        // Set background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
        
        // Translate to account for bounds
        ctx.translate(-minX, -minY);
        
        // Set drawing styles with better quality
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round'; // Changed from 'square' for smoother lines
        ctx.lineJoin = 'round'; // Changed from 'miter' for smoother corners
        
        // Enable anti-aliasing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
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
        ctx.fillText('asciilogic.com', width - 90, height - 10);
        
        return canvas;
    }
    
    exportToSVG(groupElements = true) {
        if (this.app.elements.length === 0) {
            // Return empty SVG with message
            return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="300" fill="#1a1a1a"/>
                <text x="200" y="150" font-family="monospace" font-size="16" fill="#666" text-anchor="middle">No drawing to export</text>
            </svg>`;
        }
        
        // Find bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        // Temporary canvas context for text measurement
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        this.app.elements.forEach(el => {
            if (el.type === 'text') {
                const fontSize = el.fontSize || 16;
                tempCtx.font = `${fontSize}px monospace`;
                const textWidth = tempCtx.measureText(el.text).width;
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
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        // Start building SVG
        let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Add background
        svg += `\n  <rect width="${width}" height="${height}" fill="#1a1a1a"/>`;
        
        // Create a group with translation to handle bounds - or individual transforms
        if (groupElements) {
            svg += `\n  <g transform="translate(${-minX}, ${-minY})">`;
        }
        
        // Draw all elements
        this.app.elements.forEach(el => {
            const transform = groupElements ? '' : ` transform="translate(${-minX}, ${-minY})"`;
            
            if (el.type === 'line' || el.type === 'arrow') {
                // Draw line path
                let path = `M ${el.startX} ${el.startY}`;
                
                if (el.bendX !== undefined && el.bendY !== undefined) {
                    path += ` L ${el.bendX} ${el.bendY} L ${el.endX} ${el.endY}`;
                } else {
                    path += ` L ${el.endX} ${el.endY}`;
                }
                
                svg += `\n    <path d="${path}" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"${transform}/>`;
                
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
                    
                    svg += `\n    <path d="M ${el.endX} ${el.endY} L ${x1} ${y1} M ${el.endX} ${el.endY} L ${x2} ${y2}" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"${transform}/>`;
                }
            } else if (el.type === 'box') {
                const x = Math.min(el.startX, el.endX);
                const y = Math.min(el.startY, el.endY);
                const rectWidth = Math.abs(el.endX - el.startX);
                const rectHeight = Math.abs(el.endY - el.startY);
                svg += `\n    <rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" stroke="white" stroke-width="2" fill="none" stroke-linejoin="round"${transform}/>`;
            } else if (el.type === 'text') {
                const fontSize = el.fontSize || 16;
                // Escape special characters in text
                const escapedText = el.text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
                svg += `\n    <text x="${el.x}" y="${el.y}" font-family="monospace" font-size="${fontSize}" fill="white"${transform}>${escapedText}</text>`;
            }
        });
        
        // Close the transform group if we're using it
        if (groupElements) {
            svg += '\n  </g>';
        }
        
        // Add watermark
        svg += `\n  <text x="${width - 90}" y="${height - 10}" font-family="monospace" font-size="12" fill="#666" opacity="0.3">asciilogic.com</text>`;
        
        // Close SVG
        svg += '\n</svg>';
        
        return svg;
    }
    
    exportToDXF() {
        // Scale factor: 1 pixel = 0.1 units in CAD (so 100 pixels = 10 units)
        // This makes drawings more reasonable in size
        const scale = 0.1;
        
        // DXF header
        let dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n';
        
        // Start entities section
        dxf += '0\nSECTION\n2\nENTITIES\n';
        
        // Export each element
        this.app.elements.forEach(el => {
            if (el.type === 'line' || el.type === 'arrow') {
                // Export line segments
                if (el.bendX !== undefined && el.bendY !== undefined) {
                    // First segment
                    dxf += this.dxfLine(
                        el.startX * scale, 
                        el.startY * scale, 
                        el.bendX * scale, 
                        el.bendY * scale
                    );
                    // Second segment
                    dxf += this.dxfLine(
                        el.bendX * scale, 
                        el.bendY * scale, 
                        el.endX * scale, 
                        el.endY * scale
                    );
                } else {
                    // Single line
                    dxf += this.dxfLine(
                        el.startX * scale, 
                        el.startY * scale, 
                        el.endX * scale, 
                        el.endY * scale
                    );
                }
                
                // Add arrowhead if needed
                if (el.type === 'arrow') {
                    const angle = Math.atan2(
                        el.endY - (el.bendY !== undefined ? el.bendY : el.startY),
                        el.endX - (el.bendX !== undefined ? el.bendX : el.startX)
                    );
                    const arrowLength = 15 * scale;
                    const arrowAngle = Math.PI / 6;
                    
                    // Arrow lines
                    dxf += this.dxfLine(
                        el.endX * scale,
                        el.endY * scale,
                        (el.endX - 15 * Math.cos(angle - arrowAngle)) * scale,
                        (el.endY - 15 * Math.sin(angle - arrowAngle)) * scale
                    );
                    dxf += this.dxfLine(
                        el.endX * scale,
                        el.endY * scale,
                        (el.endX - 15 * Math.cos(angle + arrowAngle)) * scale,
                        (el.endY - 15 * Math.sin(angle + arrowAngle)) * scale
                    );
                }
            } else if (el.type === 'box') {
                // Export box as four lines
                const minX = Math.min(el.startX, el.endX) * scale;
                const maxX = Math.max(el.startX, el.endX) * scale;
                const minY = Math.min(el.startY, el.endY) * scale;
                const maxY = Math.max(el.startY, el.endY) * scale;
                
                dxf += this.dxfLine(minX, minY, maxX, minY); // Top
                dxf += this.dxfLine(maxX, minY, maxX, maxY); // Right
                dxf += this.dxfLine(maxX, maxY, minX, maxY); // Bottom
                dxf += this.dxfLine(minX, maxY, minX, minY); // Left
            } else if (el.type === 'text') {
                // Export text
                dxf += this.dxfText(
                    el.x * scale, 
                    el.y * scale, 
                    el.text, 
                    (el.fontSize || 16) * scale
                );
            }
        });
        
        // End entities section
        dxf += '0\nENDSEC\n';
        
        // End of file
        dxf += '0\nEOF\n';
        
        return dxf;
    }
    
    dxfLine(x1, y1, x2, y2) {
        return `0\nLINE\n8\n0\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y2}\n`;
    }
    
    dxfText(x, y, text, fontSize) {
        const height = fontSize * 0.8; // Approximate conversion
        return `0\nTEXT\n8\n0\n10\n${x}\n20\n${y}\n40\n${height}\n1\n${text}\n`;
    }
}