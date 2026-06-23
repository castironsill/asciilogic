// js/utils/zigzag.js - Triangle-wave zig-zag geometry for the zigzag line
// style. Shared by the canvas renderer and the SVG exporter.

function zigzagSegment(x1, y1, x2, y2, amp, wl) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < wl) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];

    const ux = dx / len, uy = dy / len; // along the segment
    const px = -uy, py = ux;            // perpendicular
    const n = Math.round(len / wl);
    const step = len / n;

    const pts = [{ x: x1, y: y1 }];
    for (let i = 1; i < n; i++) {
        const off = (i % 2 === 1) ? amp : -amp;
        pts.push({
            x: x1 + ux * step * i + px * off,
            y: y1 + uy * step * i + py * off
        });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
}

// Given the corner points of a connector ([start], [bend], [end]), return a
// flat list of points tracing a zig-zag through them.
export function zigzagPoints(corners, amp = 4, wavelength = 10) {
    const out = [];
    for (let s = 0; s < corners.length - 1; s++) {
        const a = corners[s];
        const b = corners[s + 1];
        const seg = zigzagSegment(a.x, a.y, b.x, b.y, amp, wavelength);
        if (s > 0) seg.shift(); // avoid duplicating the shared corner
        out.push(...seg);
    }
    return out;
}

// The corner points of a line/arrow element, in order.
export function connectorCorners(el) {
    const corners = [{ x: el.startX, y: el.startY }];
    if (el.bendX !== undefined) corners.push({ x: el.bendX, y: el.bendY });
    corners.push({ x: el.endX, y: el.endY });
    return corners;
}
