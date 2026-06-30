import { describe, it, expect, beforeEach } from 'vitest';
import { BoxTool } from '../js/tools/BoxTool.js';
import { EllipseTool } from '../js/tools/EllipseTool.js';

// Minimal app stub exposing only what BoxTool/LineTool touch while drawing.
function makeApp() {
    return {
        gridSize: 10,
        tempElement: null,
        grid: { snapToGrid: (v) => Math.round(v / 10) * 10 },
        connectors: null,
        render() {},
        boxStyleManager: { getBoxStyle: () => ({ fill: 'none', pattern: null }) },
        colorManager: { getColor: () => '#000' },
    };
}

// Helpers to read the normalized geometry of the in-progress element.
const bounds = (el) => ({
    w: Math.abs(el.endX - el.startX),
    h: Math.abs(el.endY - el.startY),
    cx: (el.startX + el.endX) / 2,
    cy: (el.startY + el.endY) / 2,
});

describe('BoxTool drawing modifiers', () => {
    let app, tool;
    beforeEach(() => {
        app = makeApp();
        tool = new BoxTool(app);
    });

    it('drags corner-to-corner by default', () => {
        tool.handleMouseDown(0, 0, { altKey: false, shiftKey: false });
        tool.handleMouseMove(40, 20, { altKey: false, shiftKey: false });
        const el = app.tempElement;
        expect(el).toMatchObject({ startX: 0, startY: 0, endX: 40, endY: 20 });
    });

    it('Shift constrains to a square (equal width and height)', () => {
        tool.handleMouseDown(0, 0, {});
        tool.handleMouseMove(40, 20, { shiftKey: true });
        const b = bounds(app.tempElement);
        expect(b.w).toBe(b.h);
        expect(b.w).toBe(40); // the larger axis wins
    });

    it('Alt draws from the center outward', () => {
        tool.handleMouseDown(50, 50, {});
        tool.handleMouseMove(70, 60, { altKey: true });
        // Anchor stays the center; the box grows symmetrically around it.
        const b = bounds(app.tempElement);
        expect(b.cx).toBe(50);
        expect(b.cy).toBe(50);
        expect(b.w).toBe(40); // 2 * |70-50|
        expect(b.h).toBe(20); // 2 * |60-50|
    });

    it('Shift+Alt draws a square centered on the start point', () => {
        tool.handleMouseDown(50, 50, {});
        tool.handleMouseMove(70, 60, { altKey: true, shiftKey: true });
        const b = bounds(app.tempElement);
        expect(b.cx).toBe(50);
        expect(b.cy).toBe(50);
        expect(b.w).toBe(b.h);
        expect(b.w).toBe(40); // radius 20 on the larger axis, both sides
    });
});

describe('EllipseTool inherits the modifiers', () => {
    it('Shift+Alt yields a circle centered on the start (a circle by radius)', () => {
        const app = makeApp();
        const tool = new EllipseTool(app);
        tool.handleMouseDown(100, 100, {});
        tool.handleMouseMove(130, 110, { altKey: true, shiftKey: true });
        const el = app.tempElement;
        expect(el.type).toBe('ellipse');
        const b = bounds(el);
        expect(b.cx).toBe(100);
        expect(b.cy).toBe(100);
        expect(b.w).toBe(b.h); // equal extent → circle
    });
});
