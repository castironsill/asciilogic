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

// Snap (px,py) to the nearest edge of the shape and record it as a fraction.
export function makeBinding(shape, px, py) {
    const { minX, minY, maxX, maxY } = shapeBounds(shape);
    const w = maxX - minX;
    const h = maxY - minY;

    let cx = clamp(px, minX, maxX);
    let cy = clamp(py, minY, maxY);

    const dl = cx - minX, dr = maxX - cx, dt = cy - minY, db = maxY - cy;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) cx = minX;
    else if (m === dr) cx = maxX;
    else if (m === dt) cy = minY;
    else cy = maxY;

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
                    el.startX = p.x; el.startY = p.y; changed = true;
                } else {
                    el.startBinding = null;
                }
            }

            if (el.endBinding) {
                const shape = byId.get(el.endBinding.id);
                if (this.isShape(shape)) {
                    const p = anchorPos(shape, el.endBinding);
                    el.endX = p.x; el.endY = p.y; changed = true;
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
