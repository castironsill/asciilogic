export function distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}

// Compute the bounding box of a set of elements.
// Returns null for an empty list so callers can decide on a default.
// Pass a canvas `ctx` for accurate text measurement; without one,
// text width is estimated from character count (monospace ~0.6em).
export function getElementsBounds(elements, ctx = null) {
    if (!elements || elements.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    elements.forEach(el => {
        if (el.type === 'text') {
            const fontSize = el.fontSize || 16;
            const lines = (el.text || '').split('\n');
            let maxWidth;
            if (ctx) {
                ctx.save();
                ctx.font = `${fontSize}px monospace`;
                maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
                ctx.restore();
            } else {
                maxWidth = Math.max(...lines.map(line => line.length)) * fontSize * 0.6;
            }
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y - fontSize);
            maxX = Math.max(maxX, el.x + maxWidth);
            maxY = Math.max(maxY, el.y + (lines.length * fontSize * 1.2));
        } else if (el.type === 'box' || el.type === 'ellipse') {
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

    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Measure a (possibly multi-line) text element. Uses ctx for accurate
// width when available, otherwise estimates from character count.
export function getTextDimensions(element, ctx = null) {
    const fontSize = element.fontSize || 16;
    const lineHeight = fontSize * 1.2;
    const lines = String(element.text ?? '').split('\n');

    let width = 0;
    if (ctx) {
        ctx.save();
        ctx.font = `${fontSize}px monospace`;
        for (const line of lines) width = Math.max(width, ctx.measureText(line).width);
        ctx.restore();
    } else {
        let maxLen = 0;
        for (const line of lines) maxLen = Math.max(maxLen, line.length);
        width = maxLen * fontSize * 0.6;
    }

    return { fontSize, lineHeight, lines, lineCount: lines.length, width, height: lines.length * lineHeight };
}

export function getNormalizedBox(box) {
    return {
        minX: Math.min(box.startX, box.endX),
        minY: Math.min(box.startY, box.endY),
        maxX: Math.max(box.startX, box.endX),
        maxY: Math.max(box.startY, box.endY)
    };
}

export function isPointNearElement(x, y, element, ctx, fontSize = 16) {
    const threshold = 5;
    
    if (element.type === 'text') {
        const { fontSize: fs, width, lineHeight, lineCount } = getTextDimensions(element, ctx);
        const bottom = element.y + (lineCount - 1) * lineHeight + 10;

        return x >= element.x - threshold &&
               x <= element.x + width + threshold &&
               y >= element.y - fs - 4 &&
               y <= bottom;
    } else if (element.type === 'box') {
        const minX = Math.min(element.startX, element.endX);
        const maxX = Math.max(element.startX, element.endX);
        const minY = Math.min(element.startY, element.endY);
        const maxY = Math.max(element.startY, element.endY);

        return x >= minX - threshold && x <= maxX + threshold &&
               y >= minY - threshold && y <= maxY + threshold &&
               (Math.abs(x - minX) < threshold || Math.abs(x - maxX) < threshold ||
                Math.abs(y - minY) < threshold || Math.abs(y - maxY) < threshold);
    } else if (element.type === 'ellipse') {
        const cx = (element.startX + element.endX) / 2;
        const cy = (element.startY + element.endY) / 2;
        const rx = Math.abs(element.endX - element.startX) / 2;
        const ry = Math.abs(element.endY - element.startY) / 2;
        if (rx <= 0 || ry <= 0) return false;
        // Selectable anywhere inside the ellipse (with a small margin),
        // which is friendly for filled shapes.
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        return nx * nx + ny * ny <= 1.15;
    } else {
        if (element.bendX !== undefined) {
            return distanceToLineSegment(x, y, element.startX, element.startY, element.bendX, element.bendY) < threshold ||
                   distanceToLineSegment(x, y, element.bendX, element.bendY, element.endX, element.endY) < threshold;
        } else {
            return distanceToLineSegment(x, y, element.startX, element.startY, element.endX, element.endY) < threshold;
        }
    }
}

export function isElementInBox(element, box) {
    if (element.type === 'text') {
        return element.x >= box.minX && element.x <= box.maxX &&
               element.y >= box.minY && element.y <= box.maxY;
    } else if (element.type === 'box' || element.type === 'ellipse') {
        const elMinX = Math.min(element.startX, element.endX);
        const elMaxX = Math.max(element.startX, element.endX);
        const elMinY = Math.min(element.startY, element.endY);
        const elMaxY = Math.max(element.startY, element.endY);

        return !(elMaxX < box.minX || elMinX > box.maxX ||
                 elMaxY < box.minY || elMinY > box.maxY);
    } else {
        const points = [
            { x: element.startX, y: element.startY },
            { x: element.endX, y: element.endY }
        ];
        if (element.bendX !== undefined) {
            points.push({ x: element.bendX, y: element.bendY });
        }
        
        return points.some(p => 
            p.x >= box.minX && p.x <= box.maxX &&
            p.y >= box.minY && p.y <= box.maxY
        );
    }
}