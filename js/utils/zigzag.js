// js/utils/zigzag.js - Triangle-wave zig-zag geometry for the zigzag line
// style. Shared by the canvas renderer and the SVG exporter.

function zigzagSegment(x1, y1, x2, y2, amp, wl, margin) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    // Too short to zig-zag meaningfully -> straight (keeps endpoints clean).
    if (len < 2 * margin + wl) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];

    const ux = dx / len, uy = dy / len; // along the segment
    const px = -uy, py = ux;            // perpendicular
    const at = (along, off) => ({ x: x1 + ux * along + px * off, y: y1 + uy * along + py * off });

    const zlen = len - 2 * margin;      // oscillation region
    const n = Math.max(2, Math.round(zlen / wl));
    const step = zlen / n;

    // Straight lead-in, oscillation, straight lead-out — so the ends (and the
    // arrowhead) sit on the centerline pointing along the segment.
    const pts = [{ x: x1, y: y1 }, at(margin, 0)];
    for (let i = 1; i < n; i++) {
        const off = (i % 2 === 1) ? amp : -amp;
        pts.push(at(margin + i * step, off));
    }
    pts.push(at(len - margin, 0), { x: x2, y: y2 });
    return pts;
}

// Given the corner points of a connector ([start], [bend], [end]), return a
// flat list of points tracing a zig-zag through them.
export function zigzagPoints(corners, amp = 4, wavelength = 10, margin = 8) {
    const out = [];
    for (let s = 0; s < corners.length - 1; s++) {
        const a = corners[s];
        const b = corners[s + 1];
        const seg = zigzagSegment(a.x, a.y, b.x, b.y, amp, wavelength, margin);
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
