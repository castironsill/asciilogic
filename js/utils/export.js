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
                const asciiText = this.exportToASCII(false, {}); // Start with basic
                this.app.modalManager.showExportModal(asciiText);
            });
        }
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
        
        // Set background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
        
        // Translate to account for bounds
        ctx.translate(padding - bounds.minX, padding - bounds.minY);
        
        // Enable anti-aliasing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw all elements using the renderer's drawElement method
        this.app.elements.forEach(el => {
            this.app.renderer.drawElement(ctx, el);
        });
        
        // Add a subtle watermark
        ctx.globalAlpha = 0.3;
        ctx.font = '12px monospace';
        ctx.fillStyle = '#666';
        ctx.fillText('asciilogic.com', width - 90 - padding + bounds.minX, height - 10 - padding + bounds.minY);
        
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
            if (el.type === 'box' && el.fill === 'pattern' && el.pattern !== 'none') {
                const color = el.color || '#ffffff';
                const patternId = `${el.pattern}-${color.replace('#', '')}`;
                if (!patternDefs.has(patternId)) {
                    patternDefs.add(patternId);
                    svg += this.createColoredPatternDef(el.pattern, color, patternId);
                }
            }
        });
        
        svg += '\n  </defs>';
        
        // Add background
        svg += `\n  <rect width="${width}" height="${height}" fill="#1a1a1a"/>`;
        
        // Create a group with translation to handle bounds - or individual transforms
        if (groupElements) {
            svg += `\n  <g transform="translate(${padding - bounds.minX}, ${padding - bounds.minY})">`;
        }
        
        // Draw all elements
        this.app.elements.forEach(el => {
            const transform = groupElements ? '' : ` transform="translate(${padding - bounds.minX}, ${padding - bounds.minY})"`;
            const color = el.color || '#ffffff';
            
            if (el.type === 'line' || el.type === 'arrow') {
                // Draw line path
                let path = `M ${el.startX} ${el.startY}`;
                
                if (el.bendX !== undefined && el.bendY !== undefined) {
                    path += ` L ${el.bendX} ${el.bendY} L ${el.endX} ${el.endY}`;
                } else {
                    path += ` L ${el.endX} ${el.endY}`;
                }
                
                // Add stroke-dasharray for line styles
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
            } else if (el.type === 'text') {
                const fontSize = el.fontSize || 16;
                // Escape special characters in text
                const escapedText = el.text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
                svg += `\n    <text x="${el.x}" y="${el.y}" font-family="monospace" font-size="${fontSize}" fill="${color}"${transform}>${escapedText}</text>`;
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
                maxY = Math.max(maxY, el.y);
            } else if (el.type === 'box') {
                maxY = Math.max(maxY, el.startY, el.endY);
            } else {
                maxY = Math.max(maxY, el.startY, el.endY);
                if (el.bendY !== undefined) {
                    maxY = Math.max(maxY, el.bendY);
                }
            }
        });
        
        // Helper function to flip Y coordinate
        const flipY = (y) => (maxY - y) * scale;
        
        // DXF header with line type definitions
        let dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n';
        
        // Add line type table
        dxf += '0\nSECTION\n2\nTABLES\n';
        dxf += '0\nTABLE\n2\nLTYPE\n';
        
        // Define line types
        dxf += '0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n';
        dxf += '0\nLTYPE\n2\nDASHED\n70\n0\n3\nDashed __ __ __ __ __\n72\n65\n73\n2\n40\n0.75\n49\n0.5\n49\n-0.25\n';
        dxf += '0\nLTYPE\n2\nDOT\n70\n0\n3\nDotted . . . . . . .\n72\n65\n73\n2\n40\n0.25\n49\n0.0\n49\n-0.25\n';
        
        dxf += '0\nENDTAB\n0\nENDSEC\n';
        
        // Start entities section
        dxf += '0\nSECTION\n2\nENTITIES\n';
        
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
            } else if (el.type === 'box') {
                // Export box with color and fill
                dxf += this.dxfBox(el, scale, flipY, colorIndex);
            } else if (el.type === 'text') {
                // Export text with flipped Y
                dxf += this.dxfText(
                    el.x * scale, 
                    flipY(el.y), 
                    el.text, 
                    (el.fontSize || 16) * scale,
                    colorIndex
                );
            }
        });
        
        // End entities section
        dxf += '0\nENDSEC\n';
        
        // End of file
        dxf += '0\nEOF\n';
        
        return dxf;
    }
    
    getAutocadColorIndex(color) {
        // Map hex colors to AutoCAD color indices
        const colorMap = {
            '#ffffff': 7,  // white
            '#808080': 8,  // gray
            '#ff0000': 1,  // red
            '#0000ff': 5,  // blue
            '#00ff00': 3,  // green
            '#ffff00': 2,  // yellow
            '#00ffff': 4,  // cyan
            '#ff00ff': 6   // magenta
        };
        return colorMap[color] || 7; // default to white
    }
    
    dxfBox(element, scale, flipY, colorIndex) {
        const minX = Math.min(element.startX, element.endX) * scale;
        const maxX = Math.max(element.startX, element.endX) * scale;
        const minY = flipY(Math.max(element.startY, element.endY)); // Note: max becomes min after flip
        const maxY = flipY(Math.min(element.startY, element.endY)); // Note: min becomes max after flip
        
        let dxf = '';
        
        // Draw box outline
        dxf += this.dxfLine(minX, minY, maxX, minY, 'solid', colorIndex); // Bottom (was top)
        dxf += this.dxfLine(maxX, minY, maxX, maxY, 'solid', colorIndex); // Right
        dxf += this.dxfLine(maxX, maxY, minX, maxY, 'solid', colorIndex); // Top (was bottom)
        dxf += this.dxfLine(minX, maxY, minX, minY, 'solid', colorIndex); // Left
        
        // Add hatch if filled
        if (element.fill === 'solid' || (element.fill === 'pattern' && element.pattern !== 'none')) {
            dxf += `0\nHATCH\n8\n0\n62\n${colorIndex}\n`;
            dxf += `70\n0\n71\n0\n91\n1\n92\n1\n93\n4\n`;
            dxf += `10\n${minX}\n20\n${minY}\n`;
            dxf += `10\n${maxX}\n20\n${minY}\n`;
            dxf += `10\n${maxX}\n20\n${maxY}\n`;
            dxf += `10\n${minX}\n20\n${maxY}\n`;
            
            // Pattern name based on element pattern
            const patternMap = {
                'solid': 'SOLID',
                'diagonal': 'ANSI31',
                'crosshatch': 'ANSI37',
                'horizontal': 'LINE',
                'vertical': 'ANGLE',
                'light': 'DOTS',
                'medium': 'AR-SAND',
                'dense': 'GRAVEL'
            };
            
            const patternName = element.fill === 'solid' ? 'SOLID' : 
                               (patternMap[element.pattern] || 'SOLID');
            dxf += `2\n${patternName}\n`;
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