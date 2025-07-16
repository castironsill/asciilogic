export function distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
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
        ctx.save();
        const elementFontSize = element.fontSize || fontSize;
        ctx.font = `${elementFontSize}px monospace`;
        const textWidth = ctx.measureText(element.text).width;
        ctx.restore();
        
        return x >= element.x - threshold && 
               x <= element.x + textWidth + threshold &&
               y >= element.y - elementFontSize - 4 && 
               y <= element.y + 10;
    } else if (element.type === 'box') {
        const minX = Math.min(element.startX, element.endX);
        const maxX = Math.max(element.startX, element.endX);
        const minY = Math.min(element.startY, element.endY);
        const maxY = Math.max(element.startY, element.endY);
        
        return x >= minX - threshold && x <= maxX + threshold &&
               y >= minY - threshold && y <= maxY + threshold &&
               (Math.abs(x - minX) < threshold || Math.abs(x - maxX) < threshold ||
                Math.abs(y - minY) < threshold || Math.abs(y - maxY) < threshold);
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
    } else if (element.type === 'box') {
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