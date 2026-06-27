// js/core/connectors.js - Lines/arrows that bind to shapes and follow them.
//
// A connector endpoint may carry a binding { id, fracX, fracY }: the id of a
// box/ellipse and where on that shape's box the endpoint sits, stored as a
// fraction so it survives moves AND resizes. Pure helpers below are unit
// tested; the Connectors class wires them to the live element list.

export function shapeBounds(shape) {
    return {
        minX: Math.min(shape.startX, shape.endX),
        minY: Math.min(shape.startY, shape.endY),
        maxX: Math.max(shape.startX, shape.endX),
        maxY: Math.max(shape.startY, shape.endY)
    };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// The center point of a shape's bounding box.
export function shapeCenter(shape) {
    const { minX, minY, maxX, maxY } = shapeBounds(shape);
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

// The common connection points of a shape: its center plus the midpoint of
// each edge (top, right, bottom, left).
export function shapeAnchors(shape) {
    const { minX, minY, maxX, maxY } = shapeBounds(shape);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return [
        { x: cx, y: cy, kind: 'center' },
        { x: cx, y: minY, kind: 'top' },
        { x: maxX, y: cy, kind: 'right' },
        { x: cx, y: maxY, kind: 'bottom' },
        { x: minX, y: cy, kind: 'left' }
    ];
}

// Record where (px,py) sits on the shape as a fraction of its box, so the
// attachment point stays exactly where the user drew it (and tracks the
// shape on move/resize). The point is only clamped into the box; it is NOT
// snapped to an edge, which previously made the endpoint jump.
export function makeBinding(shape, px, py) {
    const { minX, minY, maxX, maxY } = shapeBounds(shape);
    const w = maxX - minX;
    const h = maxY - minY;

    const cx = clamp(px, minX, maxX);
    const cy = clamp(py, minY, maxY);

    return {
        id: shape.id,
        fracX: w ? (cx - minX) / w : 0.5,
        fracY: h ? (cy - minY) / h : 0.5
    };
}

// Resolve a binding back to an absolute point on the (possibly moved/resized) shape.
export function anchorPos(shape, binding) {
    const { minX, minY, maxX, maxY } = shapeBounds(shape);
    return {
        x: minX + binding.fracX * (maxX - minX),
        y: minY + binding.fracY * (maxY - minY)
    };
}

export class Connectors {
    constructor(app) {
        this.app = app;
    }

    isShape(el) {
        return !!el && (el.type === 'box' || el.type === 'ellipse');
    }

    isConnector(el) {
        return !!el && (el.type === 'line' || el.type === 'arrow');
    }

    // Topmost shape whose box contains (px,py) (with a small margin), other
    // than `exclude`.
    findShapeAt(px, py, exclude) {
        const margin = 4;
        for (let i = this.app.elements.length - 1; i >= 0; i--) {
            const el = this.app.elements[i];
            if (el === exclude || !this.isShape(el)) continue;
            const b = shapeBounds(el);
            if (px >= b.minX - margin && px <= b.maxX + margin &&
                py >= b.minY - margin && py <= b.maxY + margin) {
                return el;
            }
        }
        return null;
    }

    // If (px,py) is over a shape and within `threshold` of that shape's
    // center, return the center point to snap to (and the shape); else null.
    centerSnap(px, py, exclude, threshold) {
        const shape = this.findShapeAt(px, py, exclude);
        if (!shape) return null;
        const c = shapeCenter(shape);
        if (Math.hypot(px - c.x, py - c.y) <= threshold) return { x: c.x, y: c.y, shape };
        return null;
    }

    // Nearest connection point (shape center or an edge midpoint) within
    // `threshold` of (px,py), across all shapes. Unlike centerSnap this also
    // matches points just outside the border, so you can snap to an edge
    // midpoint while approaching from outside. Returns { x, y, kind, shape }
    // or null.
    anchorSnap(px, py, exclude, threshold) {
        let best = null;
        let bestD = threshold;
        for (let i = this.app.elements.length - 1; i >= 0; i--) {
            const el = this.app.elements[i];
            if (el === exclude || !this.isShape(el)) continue;
            for (const a of shapeAnchors(el)) {
                const d = Math.hypot(px - a.x, py - a.y);
                if (d <= bestD) {
                    bestD = d;
                    best = { x: a.x, y: a.y, kind: a.kind, shape: el };
                }
            }
        }
        return best;
    }

    // Bind or unbind one end of a connector based on where that end lands,
    // snapping it onto the shape's border when bound.
    bindEndpoint(connector, which) {
        const px = which === 'start' ? connector.startX : connector.endX;
        const py = which === 'start' ? connector.startY : connector.endY;
        const key = which === 'start' ? 'startBinding' : 'endBinding';
        const shape = this.findShapeAt(px, py, connector);

        if (shape && shape.id) {
            const binding = makeBinding(shape, px, py);
            connector[key] = binding;
            const p = anchorPos(shape, binding);
            if (which === 'start') { connector.startX = p.x; connector.startY = p.y; }
            else { connector.endX = p.x; connector.endY = p.y; }
        } else {
            connector[key] = null;
        }
    }

    // Reposition every bound connector endpoint to follow its shape, dropping
    // bindings whose target no longer exists. Called from render().
    refresh() {
        const byId = new Map();
        for (const el of this.app.elements) if (el.id) byId.set(el.id, el);

        for (const el of this.app.elements) {
            if (!this.isConnector(el)) continue;
            let changed = false;

            if (el.startBinding) {
                const shape = byId.get(el.startBinding.id);
                if (this.isShape(shape)) {
                    const p = anchorPos(shape, el.startBinding);
                    // Only move (and reroute) when the shape actually shifted,
                    // so a freshly drawn line keeps its shape.
                    if (p.x !== el.startX || p.y !== el.startY) {
                        el.startX = p.x; el.startY = p.y; changed = true;
                    }
                } else {
                    el.startBinding = null;
                }
            }

            if (el.endBinding) {
                const shape = byId.get(el.endBinding.id);
                if (this.isShape(shape)) {
                    const p = anchorPos(shape, el.endBinding);
                    if (p.x !== el.endX || p.y !== el.endY) {
                        el.endX = p.x; el.endY = p.y; changed = true;
                    }
                } else {
                    el.endBinding = null;
                }
            }

            if (changed) this.reroute(el);
        }
    }

    // Keep a connector orthogonal: add an L-bend when its ends are diagonal,
    // drop the bend when they line up.
    reroute(el) {
        if (el.startX !== el.endX && el.startY !== el.endY) {
            const dx = Math.abs(el.endX - el.startX);
            const dy = Math.abs(el.endY - el.startY);
            if (dx > dy) { el.bendX = el.endX; el.bendY = el.startY; }
            else { el.bendX = el.startX; el.bendY = el.endY; }
        } else {
            delete el.bendX;
            delete el.bendY;
        }
    }
}
