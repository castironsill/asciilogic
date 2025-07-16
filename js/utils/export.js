// js/utils/export.js - Export/Import functionality with notifications

import { notifications } from '../ui/notifications.js';

export class ExportManager {
    constructor(app) {
        this.app = app;
    }
    
    exportToASCII(extended = false) {
        if (this.app.elements.length === 0) return 'No drawing to export';
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.app.elements.forEach(el => {
            if (el.type === 'text') {
                const fontSize = el.fontSize || 16;
                const charWidth = fontSize * 0.6;
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
                maxX = Math.max(maxX, el.x + el.text.length * charWidth);
                maxY = Math.max(maxY, el.y + fontSize);
            } else {
                minX = Math.min(minX, el.startX, el.endX);
                minY = Math.min(minY, el.startY, el.endY);
                maxX = Math.max(maxX, el.startX, el.endX);
                maxY = Math.max(maxY, el.startY, el.endY);
                if (el.bendX !== undefined) {
                    minX = Math.min(minX, el.bendX);
                    maxX = Math.max(maxX, el.bendX);
                }
            }
        });
        
        const width = Math.ceil((maxX - minX) / this.app.gridSize) + 1;
        const height = Math.ceil((maxY - minY) / this.app.gridSize) + 1;
        const grid = Array(height).fill(null).map(() => Array(width).fill(' '));
        
        this.app.elements.forEach(el => {
            if (el.type === 'text') {
                const x = Math.round((el.x - minX) / this.app.gridSize);
                const y = Math.round((el.y - minY) / this.app.gridSize);
                for (let i = 0; i < el.text.length; i++) {
                    if (x + i < width && y >= 0 && y < height) {
                        grid[y][x + i] = el.text[i];
                    }
                }
            } else if (el.type === 'box') {
                this.renderBoxToGrid(grid, el, minX, minY, extended);
            } else if (el.type === 'line' || el.type === 'arrow') {
                this.renderLineToGrid(grid, el, minX, minY, extended, el.type === 'arrow');
            }
        });
        
        let trimmedGrid = grid.filter(row => row.some(cell => cell !== ' '));
        
        if (trimmedGrid.length === 0) return 'No drawing to export';
        
        trimmedGrid = trimmedGrid.map(row => {
            const lastNonSpace = row.reduce((last, cell, index) => 
                cell !== ' ' ? index : last, -1);
            return row.slice(0, lastNonSpace + 1);
        });
        
        return trimmedGrid.map(row => row.join('')).join('\n');
    }
    
    renderBoxToGrid(grid, box, offsetX, offsetY, extended) {
        const x1 = Math.round((Math.min(box.startX, box.endX) - offsetX) / this.app.gridSize);
        const y1 = Math.round((Math.min(box.startY, box.endY) - offsetY) / this.app.gridSize);
        const x2 = Math.round((Math.max(box.startX, box.endX) - offsetX) / this.app.gridSize);
        const y2 = Math.round((Math.max(box.startY, box.endY) - offsetY) / this.app.gridSize);
        
        const chars = extended ? {
            horizontal: '─',
            vertical: '│',
            topLeft: '┌',
            topRight: '┐',
            bottomLeft: '└',
            bottomRight: '┘'
        } : {
            horizontal: '-',
            vertical: '|',
            topLeft: '+',
            topRight: '+',
            bottomLeft: '+',
            bottomRight: '+'
        };
        
        for (let x = x1 + 1; x < x2; x++) {
            grid[y1][x] = chars.horizontal;
            grid[y2][x] = chars.horizontal;
        }
        
        for (let y = y1 + 1; y < y2; y++) {
            grid[y][x1] = chars.vertical;
            grid[y][x2] = chars.vertical;
        }
        
        grid[y1][x1] = chars.topLeft;
        grid[y1][x2] = chars.topRight;
        grid[y2][x1] = chars.bottomLeft;
        grid[y2][x2] = chars.bottomRight;
    }
    
    renderLineToGrid(grid, line, offsetX, offsetY, extended, hasArrow) {
        const x1 = Math.round((line.startX - offsetX) / this.app.gridSize);
        const y1 = Math.round((line.startY - offsetY) / this.app.gridSize);
        const x2 = Math.round((line.endX - offsetX) / this.app.gridSize);
        const y2 = Math.round((line.endY - offsetY) / this.app.gridSize);
        
        if (line.bendX !== undefined) {
            const bx = Math.round((line.bendX - offsetX) / this.app.gridSize);
            const by = Math.round((line.bendY - offsetY) / this.app.gridSize);
            
            this.drawLineSegment(grid, x1, y1, bx, by, extended, false);
            this.drawLineSegment(grid, bx, by, x2, y2, extended, hasArrow);
            
            if (extended) {
                const h1 = x1 !== bx;
                const h2 = bx !== x2;
                if (h1 && !h2) grid[by][bx] = '└';
                else if (!h1 && h2) grid[by][bx] = '┌';
            } else {
                grid[by][bx] = '+';
            }
        } else {
            this.drawLineSegment(grid, x1, y1, x2, y2, extended, hasArrow);
        }
    }
    
    drawLineSegment(grid, x1, y1, x2, y2, extended, hasArrow) {
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);
        
        const horizontal = dy === 0;
        const vertical = dx === 0;
        
        const lineChar = extended ? (horizontal ? '─' : '│') : (horizontal ? '-' : '|');
        
        let x = x1, y = y1;
        while (x !== x2 || y !== y2) {
            grid[y][x] = lineChar;
            if (x !== x2) x += dx;
            if (y !== y2) y += dy;
        }
        
        if (hasArrow) {
            if (horizontal) {
                grid[y2][x2] = dx > 0 ? '>' : '<';
            } else {
                grid[y2][x2] = dy > 0 ? 'v' : '^';
            }
        }
    }
    
    copyToClipboard(text) {
        return navigator.clipboard.writeText(text).then(() => {
            notifications.show('Copied to clipboard!');
            return true;
        }).catch(err => {
            console.error('Failed to copy:', err);
            notifications.show('Failed to copy to clipboard');
            return false;
        });
    }
    
    downloadAsFile(text, filename = 'ascii-drawing.txt') {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notifications.show(`Downloaded as ${filename}`);
    }
}