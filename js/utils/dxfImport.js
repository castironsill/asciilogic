// js/utils/dxfImport.js - Import a subset of ASCII DXF into editable elements.
//
// Supported entities: LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC, ELLIPSE, TEXT,
// MTEXT, and INSERT (block references, expanded from the BLOCKS section with
// translation / scale / rotation). Binary DXF and DWG are not supported.
//
// The parser (parseDxf / primitivesToElements) is pure and DOM-free so it can
// be unit-tested; DxfImporter wires the result into the running app.

import { notifications } from '../ui/notifications.js';
import { COLORS } from './colors.js';

// AutoCAD Color Index -> palette hex, for the seven indices we have names for.
const ACI_TO_HEX = Object.fromEntries(
    Object.values(COLORS).map(c => [c.aci, c.hex])
);

// --- Tokenising --------------------------------------------------------------

// DXF is a flat stream of (groupCode, value) pairs, two lines each.
function tokenize(text) {
    const lines = text.split(/\r\n|\r|\n/);
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
        const code = parseInt(lines[i].trim(), 10);
        if (Number.isNaN(code)) continue;
        pairs.push({ code, value: lines[i + 1].trim() });
    }
    return pairs;
}

const findVal = (codes, code) => {
    const f = codes.find(c => c.code === code);
    return f ? f.value : undefined;
};
const numVal = (codes, code, def = 0) => {
    const v = findVal(codes, code);
    return v === undefined ? def : parseFloat(v);
};
const colorOf = (codes) => {
    const v = findVal(codes, 62);
    if (v === undefined) return null; // BYLAYER / default
    return ACI_TO_HEX[parseInt(v, 10)] || null;
};

// MTEXT carries inline formatting codes; strip them down to plain text.
function cleanMText(raw) {
    return raw
        .replace(/\\P/g, '\n')        // paragraph break
        .replace(/\\~/g, ' ')          // non-breaking space
        .replace(/\\[A-Za-z][^;]*;/g, '') // \fArial|...; \C1; \H2; etc.
        .replace(/[{}]/g, '')          // grouping braces
        .replace(/\\(.)/g, '$1');      // any remaining escaped char
}

// --- Entity parsing ----------------------------------------------------------

// Read the group codes of one entity (everything up to the next code-0 marker).
function readEntity(pairs, idx) {
    const type = pairs[idx].value;
    const codes = [];
    idx++;
    while (idx < pairs.length && pairs[idx].code !== 0) {
        codes.push(pairs[idx]);
        idx++;
    }
    return { type, codes, next: idx };
}

// Parse a single entity at `idx` (which points at its code-0 marker), pushing
// resulting primitive(s) into `out`. Returns the index of the next entity.
function parseOneEntity(pairs, idx, out, blocks, stats, depth) {
    const marker = pairs[idx];
    const type = marker.value;

    // Old-style POLYLINE is followed by separate VERTEX entities up to SEQEND.
    if (type === 'POLYLINE') {
        const { codes, next } = readEntity(pairs, idx);
        const closed = (numVal(codes, 70, 0) & 1) === 1;
        const color = colorOf(codes);
        const points = [];
        let i = next;
        while (i < pairs.length && pairs[i].code === 0 && pairs[i].value === 'VERTEX') {
            const v = readEntity(pairs, i);
            points.push({ x: numVal(v.codes, 10), y: numVal(v.codes, 20) });
            i = v.next;
        }
        if (i < pairs.length && pairs[i].code === 0 && pairs[i].value === 'SEQEND') {
            i = readEntity(pairs, i).next;
        }
        if (points.length >= 2) out.push({ kind: 'polyline', points, closed, color });
        return i;
    }

    const { codes, next } = readEntity(pairs, idx);
    const color = colorOf(codes);

    switch (type) {
        case 'LINE':
            out.push({
                kind: 'line',
                x1: numVal(codes, 10), y1: numVal(codes, 20),
                x2: numVal(codes, 11), y2: numVal(codes, 21),
                color
            });
            break;

        case 'CIRCLE':
            out.push({
                kind: 'circle',
                cx: numVal(codes, 10), cy: numVal(codes, 20),
                r: numVal(codes, 40), color
            });
            break;

        case 'ARC':
            out.push({
                kind: 'arc',
                cx: numVal(codes, 10), cy: numVal(codes, 20),
                r: numVal(codes, 40),
                a1: numVal(codes, 50, 0), a2: numVal(codes, 51, 360),
                color
            });
            break;

        case 'ELLIPSE': {
            const cx = numVal(codes, 10), cy = numVal(codes, 20);
            const mx = numVal(codes, 11), my = numVal(codes, 21);
            const ratio = numVal(codes, 40, 1);
            const a = Math.hypot(mx, my);
            const b = a * ratio;
            const th = Math.atan2(my, mx);
            // Axis-aligned bounding-box half-extents of the (possibly rotated)
            // ellipse — we approximate it as an upright ellipse in that box.
            const rx = Math.hypot(a * Math.cos(th), b * Math.sin(th));
            const ry = Math.hypot(a * Math.sin(th), b * Math.cos(th));
            out.push({ kind: 'ellipse', cx, cy, rx, ry, color });
            break;
        }

        case 'LWPOLYLINE': {
            const closed = (numVal(codes, 70, 0) & 1) === 1;
            const points = [];
            for (let k = 0; k < codes.length; k++) {
                if (codes[k].code === 10) {
                    const x = parseFloat(codes[k].value);
                    const yc = codes[k + 1];
                    const y = yc && yc.code === 20 ? parseFloat(yc.value) : 0;
                    points.push({ x, y });
                }
            }
            if (points.length >= 2) out.push({ kind: 'polyline', points, closed, color });
            break;
        }

        case 'TEXT': {
            const txt = findVal(codes, 1) || '';
            if (txt) out.push({
                kind: 'text',
                x: numVal(codes, 10), y: numVal(codes, 20),
                height: numVal(codes, 40, 10), text: txt, color
            });
            break;
        }

        case 'MTEXT': {
            let raw = '';
            codes.forEach(c => { if (c.code === 3 || c.code === 1) raw += c.value; });
            const txt = cleanMText(raw);
            if (txt) out.push({
                kind: 'text',
                x: numVal(codes, 10), y: numVal(codes, 20),
                height: numVal(codes, 40, 10), text: txt, color
            });
            break;
        }

        case 'INSERT': {
            const name = findVal(codes, 2);
            const block = name && blocks[name];
            if (block && depth < 5) {
                const params = {
                    tx: numVal(codes, 10), ty: numVal(codes, 20),
                    sx: numVal(codes, 41, 1), sy: numVal(codes, 42, 1),
                    rot: numVal(codes, 50, 0),
                    bx: block.baseX, by: block.baseY
                };
                block.primitives.forEach(p => out.push(transformPrimitive(p, params)));
            } else {
                stats.skipped.INSERT = (stats.skipped.INSERT || 0) + 1;
            }
            break;
        }

        default:
            stats.skipped[type] = (stats.skipped[type] || 0) + 1;
            break;
    }

    return next;
}

// Apply an INSERT's local-to-world transform (scale about the block base point,
// then rotate, then translate) to a primitive.
function transformPrimitive(prim, { tx, ty, sx, sy, rot, bx, by }) {
    const rad = rot * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const asx = Math.abs(sx), asy = Math.abs(sy);
    const pt = (x, y) => {
        const lx = (x - bx) * sx, ly = (y - by) * sy;
        return { x: tx + lx * cos - ly * sin, y: ty + lx * sin + ly * cos };
    };
    switch (prim.kind) {
        case 'line': {
            const a = pt(prim.x1, prim.y1), b = pt(prim.x2, prim.y2);
            return { ...prim, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
        }
        case 'polyline':
            return { ...prim, points: prim.points.map(p => pt(p.x, p.y)) };
        case 'circle': {
            const c = pt(prim.cx, prim.cy);
            if (asx === asy) return { ...prim, cx: c.x, cy: c.y, r: prim.r * asx };
            return { kind: 'ellipse', cx: c.x, cy: c.y, rx: prim.r * asx, ry: prim.r * asy, color: prim.color };
        }
        case 'ellipse': {
            const c = pt(prim.cx, prim.cy);
            return { ...prim, cx: c.x, cy: c.y, rx: prim.rx * asx, ry: prim.ry * asy };
        }
        case 'arc': {
            const c = pt(prim.cx, prim.cy);
            return { ...prim, cx: c.x, cy: c.y, r: prim.r * asx, a1: prim.a1 + rot, a2: prim.a2 + rot };
        }
        case 'text': {
            const c = pt(prim.x, prim.y);
            return { ...prim, x: c.x, y: c.y, height: prim.height * asx };
        }
        default:
            return { ...prim };
    }
}

function skipSection(pairs, idx) {
    while (idx < pairs.length && !(pairs[idx].code === 0 && pairs[idx].value === 'ENDSEC')) idx++;
    return idx;
}

// Parse the BLOCKS section into name -> { baseX, baseY, primitives }.
function parseBlocks(pairs, idx, blocks, stats) {
    while (idx < pairs.length) {
        const p = pairs[idx];
        if (p.code === 0 && p.value === 'ENDSEC') return idx;
        if (p.code === 0 && p.value === 'BLOCK') {
            const { codes, next } = readEntity(pairs, idx);
            const name = findVal(codes, 2) || '';
            const baseX = numVal(codes, 10), baseY = numVal(codes, 20);
            const primitives = [];
            let i = next;
            while (i < pairs.length && !(pairs[i].code === 0 && pairs[i].value === 'ENDBLK')) {
                if (pairs[i].code === 0) {
                    i = parseOneEntity(pairs, i, primitives, blocks, stats, 1);
                } else {
                    i++;
                }
            }
            if (i < pairs.length) i = readEntity(pairs, i).next; // consume ENDBLK
            if (name) blocks[name] = { baseX, baseY, primitives };
            idx = i;
        } else {
            idx++;
        }
    }
    return idx;
}

// Parse the ENTITIES section.
function parseEntities(pairs, idx, out, blocks, stats) {
    while (idx < pairs.length) {
        const p = pairs[idx];
        if (p.code === 0 && p.value === 'ENDSEC') return idx;
        if (p.code === 0) {
            idx = parseOneEntity(pairs, idx, out, blocks, stats, 0);
        } else {
            idx++;
        }
    }
    return idx;
}

// Parse a DXF document into flat primitives (in DXF model coordinates, Y up).
export function parseDxf(text) {
    const pairs = tokenize(text);
    const blocks = {};
    const primitives = [];
    const stats = { skipped: {} };

    let idx = 0;
    while (idx < pairs.length) {
        const p = pairs[idx];
        if (p.code === 0 && p.value === 'SECTION') {
            const namePair = pairs[idx + 1];
            const section = namePair && namePair.code === 2 ? namePair.value : '';
            idx += 2;
            if (section === 'BLOCKS') idx = parseBlocks(pairs, idx, blocks, stats);
            else if (section === 'ENTITIES') idx = parseEntities(pairs, idx, primitives, blocks, stats);
            else idx = skipSection(pairs, idx);
        } else {
            idx++;
        }
    }
    return { primitives, stats };
}

// Tessellate a DXF arc (degrees, CCW) into points in DXF coordinates.
function arcToPoints(cx, cy, r, a1, a2) {
    let start = a1, end = a2;
    while (end <= start) end += 360;
    const sweep = end - start;
    const segs = Math.max(2, Math.ceil(sweep / 12));
    const pts = [];
    for (let i = 0; i <= segs; i++) {
        const ang = (start + sweep * i / segs) * Math.PI / 180;
        pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
    }
    return pts;
}

// Collect every defining point of a primitive (for bounds).
function primitivePoints(p) {
    switch (p.kind) {
        case 'line': return [{ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }];
        case 'polyline': return p.points;
        case 'circle': return [{ x: p.cx - p.r, y: p.cy - p.r }, { x: p.cx + p.r, y: p.cy + p.r }];
        case 'ellipse': return [{ x: p.cx - p.rx, y: p.cy - p.ry }, { x: p.cx + p.rx, y: p.cy + p.ry }];
        case 'arc': return [{ x: p.cx - p.r, y: p.cy - p.r }, { x: p.cx + p.r, y: p.cy + p.r }];
        case 'text': return [{ x: p.x, y: p.y }];
        default: return [];
    }
}

// Map DXF primitives onto editable app elements. Flips the Y axis (DXF is Y-up),
// scales very large/small drawings into a sane on-canvas size, and offsets the
// result to a margin from the origin.
export function primitivesToElements(primitives, options = {}) {
    const margin = options.margin ?? 40;
    const defaultColor = options.defaultColor ?? '#ffffff';

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    primitives.forEach(p => primitivePoints(p).forEach(({ x, y }) => {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }));
    if (!Number.isFinite(minX)) return { elements: [] };

    const w = maxX - minX, h = maxY - minY;
    const maxDim = Math.max(w, h);
    let scale = 1;
    if (maxDim > 800) scale = 800 / maxDim;
    else if (maxDim > 0 && maxDim < 100) scale = Math.min(5, 150 / maxDim);

    const round = (v) => Math.round(v * 10) / 10;
    // World transform: scale, flip Y, offset to a margin from the origin.
    const T = (x, y) => ({
        x: round((x - minX) * scale + margin),
        y: round((maxY - y) * scale + margin)
    });

    const elements = [];
    primitives.forEach(p => {
        const color = p.color || defaultColor;
        switch (p.kind) {
            case 'line': {
                const a = T(p.x1, p.y1), b = T(p.x2, p.y2);
                elements.push({ type: 'line', startX: a.x, startY: a.y, endX: b.x, endY: b.y, lineStyle: 'solid', color });
                break;
            }
            case 'polyline': {
                const points = p.points.map(pt => T(pt.x, pt.y));
                if (p.closed && points.length) points.push({ ...points[0] });
                if (points.length >= 2) elements.push({ type: 'polyline', points, lineStyle: 'solid', color });
                break;
            }
            case 'circle':
            case 'ellipse': {
                const c = T(p.cx, p.cy);
                const rx = round((p.kind === 'circle' ? p.r : p.rx) * scale);
                const ry = round((p.kind === 'circle' ? p.r : p.ry) * scale);
                elements.push({
                    type: 'ellipse',
                    startX: c.x - rx, startY: c.y - ry,
                    endX: c.x + rx, endY: c.y + ry,
                    fill: 'none', pattern: 'none', color
                });
                break;
            }
            case 'arc': {
                const points = arcToPoints(p.cx, p.cy, p.r, p.a1, p.a2).map(pt => T(pt.x, pt.y));
                if (points.length >= 2) elements.push({ type: 'polyline', points, lineStyle: 'solid', color });
                break;
            }
            case 'text': {
                const pos = T(p.x, p.y);
                const fontSize = Math.min(200, Math.max(8, Math.round(p.height * scale)));
                elements.push({ type: 'text', x: pos.x, y: pos.y, text: p.text, fontSize, color });
                break;
            }
        }
    });

    return { elements };
}

// --- App integration ---------------------------------------------------------

export class DxfImporter {
    constructor(app) {
        this.app = app;
    }

    import(text) {
        let primitives, stats;
        try {
            ({ primitives, stats } = parseDxf(text));
        } catch (err) {
            notifications.show('Could not parse this DXF file');
            return;
        }

        const { elements } = primitivesToElements(primitives, { defaultColor: '#ffffff' });
        if (!elements || !elements.length) {
            notifications.show('No supported entities found in this DXF');
            return;
        }

        elements.forEach(el => {
            el.id = this.app.genId();
            this.app.elements.push(el);
        });

        // Switch to the Select tool and select the imported elements so they can
        // be moved as a group right away.
        const selectBtn = document.querySelector('.tool-btn[data-tool="select"]');
        if (selectBtn) selectBtn.click();
        this.app.selectedElements = elements;
        this.app.selectedElement = elements.length === 1 ? elements[0] : null;

        this.app.history.saveState();
        this.app.storage.save();
        this.app.refreshStyleControls();
        this.app.render();
        this.app.fitToContent();

        const skipped = Object.entries(stats.skipped)
            .filter(([, n]) => n > 0)
            .map(([k, n]) => `${n} ${k}`)
            .join(', ');
        notifications.show(
            `Imported ${elements.length} element${elements.length === 1 ? '' : 's'}` +
            (skipped ? ` — skipped unsupported: ${skipped}` : '')
        );
    }
}
