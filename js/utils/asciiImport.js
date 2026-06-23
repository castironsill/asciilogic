// js/utils/asciiImport.js - Parse ASCII/Unicode art back into elements

import { notifications } from '../ui/notifications.js';

export class AsciiImporter {
    constructor(app) {
        this.app = app;
    }

    import(text) {
        if (!text.trim()) return;

        this.app.elements = [];

        const lines = text.split('\n');
        const grid = lines.map(line => line.split(''));
        const height = grid.length;
        const width = Math.max(...lines.map(l => l.length));

        grid.forEach(row => {
            while (row.length < width) row.push(' ');
        });

        const scaleX = 1.2;
        const scaleY = 1.8;

        const visited = Array(height).fill(null).map(() => Array(width).fill(false));

        const isBoxChar = (char) => {
            return '+-|┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬'.includes(char);
        };

        // Store text elements to process after boxes
        const textElements = [];

        // Find and trace boxes
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (visited[y][x]) continue;

                const char = grid[y][x];

                if ('┌╔+'.includes(char)) {
                    let endX = x;
                    let endY = y;

                    for (let nx = x + 1; nx < width; nx++) {
                        if ('┐╗+'.includes(grid[y][nx])) {
                            endX = nx;
                            break;
                        }
                        if (!' -─═'.includes(grid[y][nx])) break;
                    }

                    for (let ny = y + 1; ny < height; ny++) {
                        if ('└╚+'.includes(grid[ny][x])) {
                            endY = ny;
                            break;
                        }
                        if (!' |│║'.includes(grid[ny][x])) break;
                    }

                    if (endX > x && endY > y) {
                        const bottomRightChar = grid[endY]?.[endX];
                        if (bottomRightChar && '┘╝+'.includes(bottomRightChar)) {
                            // Mark box borders as visited
                            for (let by = y; by <= endY; by++) {
                                for (let bx = x; bx <= endX; bx++) {
                                    if (by === y || by === endY || bx === x || bx === endX) {
                                        if (isBoxChar(grid[by][bx])) {
                                            visited[by][bx] = true;
                                        }
                                    }
                                }
                            }

                            const box = {
                                type: 'box',
                                startX: x * this.app.gridSize * scaleX,
                                startY: y * this.app.gridSize * scaleY,
                                endX: endX * this.app.gridSize * scaleX,
                                endY: endY * this.app.gridSize * scaleY
                            };

                            this.app.elements.push(box);

                            // Collect text inside this box to center it later
                            let boxText = '';
                            let textY = -1;

                            for (let ty = y + 1; ty < endY; ty++) {
                                let lineText = '';
                                for (let tx = x + 1; tx < endX; tx++) {
                                    if (!visited[ty][tx] && grid[ty][tx] !== ' ') {
                                        lineText += grid[ty][tx];
                                        visited[ty][tx] = true;
                                    } else if (lineText.length > 0 && grid[ty][tx] === ' ') {
                                        lineText += ' ';
                                    }
                                }
                                lineText = lineText.trim();
                                if (lineText) {
                                    boxText = lineText;
                                    textY = ty;
                                }
                            }

                            // If we found text, center it in the box
                            if (boxText && textY !== -1) {
                                const boxCenterX = (box.startX + box.endX) / 2;
                                const boxCenterY = (box.startY + box.endY) / 2;
                                const fontSize = 16;
                                const charWidth = fontSize * 0.6;
                                const textWidth = boxText.length * charWidth;

                                textElements.push({
                                    type: 'text',
                                    x: boxCenterX - textWidth / 2,
                                    y: boxCenterY + fontSize / 4, // Slight vertical adjustment
                                    text: boxText,
                                    fontSize: fontSize
                                });
                            }
                        }
                    }
                }
            }
        }

        // Find horizontal lines
        for (let y = 0; y < height; y++) {
            let lineStart = null;
            let dashCount = 0;
            let spaceCount = 0;
            let isDashed = false;

            for (let x = 0; x < width; x++) {
                const char = grid[y][x];
                const isHorizontal = '-─═'.includes(char) && !visited[y][x];
                const isSpace = char === ' ';

                if (isHorizontal) {
                    if (lineStart === null) {
                        lineStart = x;
                        dashCount = 1;
                        spaceCount = 0;
                    } else {
                        dashCount++;
                    }
                } else if (isSpace && lineStart !== null && dashCount > 0) {
                    spaceCount++;
                    if (spaceCount <= 2) {
                        isDashed = true;
                    } else {
                        if (dashCount >= 2) {
                            const endX = x - spaceCount - 1;
                            this.addHorizontalLine(grid, y, lineStart, endX, visited, scaleX, scaleY, isDashed);
                        }
                        lineStart = null;
                        dashCount = 0;
                        spaceCount = 0;
                        isDashed = false;
                    }
                } else {
                    if (lineStart !== null && dashCount >= 2) {
                        const endX = x - spaceCount - 1;
                        this.addHorizontalLine(grid, y, lineStart, endX, visited, scaleX, scaleY, isDashed);
                    }
                    lineStart = null;
                    dashCount = 0;
                    spaceCount = 0;
                    isDashed = false;

                    if (char === '<' && x + 4 < width) {
                        let arrowEnd = x;
                        let foundArrow = false;

                        for (let ax = x + 1; ax < Math.min(x + 20, width); ax++) {
                            if (grid[y][ax] === '>') {
                                let validArrow = true;
                                for (let cx = x + 1; cx < ax; cx++) {
                                    if (!'-─ '.includes(grid[y][cx])) {
                                        validArrow = false;
                                        break;
                                    }
                                }
                                if (validArrow) {
                                    arrowEnd = ax;
                                    foundArrow = true;
                                    break;
                                }
                            }
                        }

                        if (foundArrow) {
                            this.app.elements.push({
                                type: 'arrow',
                                startX: x * this.app.gridSize * scaleX,
                                startY: y * this.app.gridSize * scaleY,
                                endX: (arrowEnd + 1) * this.app.gridSize * scaleX,
                                endY: y * this.app.gridSize * scaleY
                            });

                            for (let vx = x; vx <= arrowEnd; vx++) {
                                visited[y][vx] = true;
                            }
                        }
                    }
                }
            }

            if (lineStart !== null && dashCount >= 2) {
                const endX = width - 1;
                this.addHorizontalLine(grid, y, lineStart, endX, visited, scaleX, scaleY, isDashed);
            }
        }

        // Find vertical lines
        for (let x = 0; x < width; x++) {
            let lineStart = null;
            let consecutiveCount = 0;

            for (let y = 0; y < height; y++) {
                const char = grid[y][x];
                const isVertical = '|│║'.includes(char) && !visited[y][x];

                if (isVertical) {
                    if (lineStart === null) {
                        lineStart = y;
                        consecutiveCount = 1;
                    } else {
                        consecutiveCount++;
                    }
                } else {
                    if (lineStart !== null && consecutiveCount >= 2) {
                        const hasUpArrow = lineStart > 0 && '^↑'.includes(grid[lineStart - 1][x]);
                        const hasDownArrow = y < height && 'v↓'.includes(grid[y][x]);

                        const startY = hasUpArrow ? lineStart - 1 : lineStart;
                        const endY = hasDownArrow ? y : y - 1;

                        this.app.elements.push({
                            type: hasUpArrow || hasDownArrow ? 'arrow' : 'line',
                            startX: x * this.app.gridSize * scaleX,
                            startY: startY * this.app.gridSize * scaleY,
                            endX: x * this.app.gridSize * scaleX,
                            endY: (endY + 1) * this.app.gridSize * scaleY
                        });

                        for (let vy = lineStart; vy <= endY; vy++) {
                            if (grid[vy][x] && '|│║'.includes(grid[vy][x])) {
                                visited[vy][x] = true;
                            }
                        }
                    }
                    lineStart = null;
                    consecutiveCount = 0;
                }
            }

            if (lineStart !== null && consecutiveCount >= 2) {
                const hasUpArrow = lineStart > 0 && '^↑'.includes(grid[lineStart - 1][x]);
                const startY = hasUpArrow ? lineStart - 1 : lineStart;

                this.app.elements.push({
                    type: hasUpArrow ? 'arrow' : 'line',
                    startX: x * this.app.gridSize * scaleX,
                    startY: startY * this.app.gridSize * scaleY,
                    endX: x * this.app.gridSize * scaleX,
                    endY: height * this.app.gridSize * scaleY
                });

                for (let vy = lineStart; vy < height; vy++) {
                    if (grid[vy][x] && '|│║'.includes(grid[vy][x])) {
                        visited[vy][x] = true;
                    }
                }
            }
        }

        // Find text
        for (let y = 0; y < height; y++) {
            let textStart = null;
            let text = '';

            for (let x = 0; x < width; x++) {
                const char = grid[y][x];

                if (!visited[y][x] && char !== ' ' && char !== '\t') {
                    if (textStart === null) {
                        textStart = x;
                        text = char;
                    } else {
                        text += char;
                    }
                    visited[y][x] = true;
                } else if (textStart !== null) {
                    if (char === ' ' && x + 1 < width && grid[y][x + 1] !== ' ' && !visited[y][x + 1]) {
                        text += ' ';
                    } else {
                        if (text.trim()) {
                            this.app.elements.push({
                                type: 'text',
                                x: textStart * this.app.gridSize * scaleX,
                                y: y * this.app.gridSize * scaleY + this.app.gridSize,
                                text: text.trim(),
                                fontSize: 16
                            });
                        }
                        textStart = null;
                        text = '';
                    }
                }
            }

            if (textStart !== null && text.trim()) {
                this.app.elements.push({
                    type: 'text',
                    x: textStart * this.app.gridSize * scaleX,
                    y: y * this.app.gridSize * scaleY + this.app.gridSize,
                    text: text.trim(),
                    fontSize: 16
                });
            }
        }

        // Add all centered text elements at the end
        this.app.elements.push(...textElements);

        this.app.history.saveState();
        this.app.fitToContent();
        notifications.show('ASCII drawing imported successfully!');
    }

    addHorizontalLine(grid, y, startX, endX, visited, scaleX, scaleY, isDashed) {
        const hasLeftArrow = startX > 0 && '<←'.includes(grid[y][startX - 1]);
        const hasRightArrow = endX < grid[y].length - 1 && '>→'.includes(grid[y][endX + 1]);

        const finalStartX = hasLeftArrow ? startX - 1 : startX;
        const finalEndX = hasRightArrow ? endX + 1 : endX;

        this.app.elements.push({
            type: hasLeftArrow || hasRightArrow ? 'arrow' : 'line',
            startX: finalStartX * this.app.gridSize * scaleX,
            startY: y * this.app.gridSize * scaleY,
            endX: (finalEndX + 1) * this.app.gridSize * scaleX,
            endY: y * this.app.gridSize * scaleY,
            lineStyle: isDashed ? 'dashed' : 'solid'
        });

        for (let vx = startX; vx <= endX; vx++) {
            if (grid[y][vx] && '-─═'.includes(grid[y][vx])) {
                visited[y][vx] = true;
            }
        }
    }
}
