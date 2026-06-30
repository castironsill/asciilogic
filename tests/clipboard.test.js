import { describe, it, expect, beforeEach } from 'vitest';
import { Clipboard } from '../js/core/clipboard.js';

// A minimal stand-in for DrawingApp, exposing just what Clipboard touches.
function makeApp() {
    let nextId = 100;
    return {
        ctx: null,
        gridSize: 10,
        lastMousePos: { x: 0, y: 0 },
        elements: [],
        selectedElement: null,
        selectedElements: [],
        grid: { snapToGrid: (v) => Math.round(v / 10) * 10 },
        history: { saveState() {} },
        render() {},
        genId: () => `id${nextId++}`,
    };
}

describe('Clipboard copy/paste', () => {
    let app, clip;
    beforeEach(() => {
        app = makeApp();
        clip = new Clipboard(app);
    });

    it('copies the current selection into the internal clipboard', () => {
        const box = { id: 'a', type: 'box', startX: 0, startY: 0, endX: 20, endY: 20 };
        app.elements.push(box);
        app.selectedElement = box;

        clip.copy();
        expect(clip.items).toHaveLength(1);
    });

    it('pastes a fresh element at the mouse position with a new id', () => {
        const box = { id: 'a', type: 'box', startX: 0, startY: 0, endX: 20, endY: 20 };
        app.elements.push(box);
        app.selectedElement = box;
        clip.copy();

        // Move the cursor well away from the source, then paste.
        app.lastMousePos = { x: 200, y: 200 };
        clip.paste();

        expect(app.elements).toHaveLength(2);
        const pasted = app.elements[1];
        expect(pasted.id).not.toBe('a');
        // Source center is (10,10); pasted center should sit at the cursor (200,200).
        expect((pasted.startX + pasted.endX) / 2).toBe(200);
        expect((pasted.startY + pasted.endY) / 2).toBe(200);
    });

    it('offsets the paste when it would land exactly on top of the source', () => {
        const box = { id: 'a', type: 'box', startX: 0, startY: 0, endX: 20, endY: 20 };
        app.elements.push(box);
        app.selectedElement = box;
        clip.copy();

        // Cursor sits on the source center (10,10) — e.g. copy then paste without
        // moving the mouse. The copy must not land directly on the original.
        app.lastMousePos = { x: 10, y: 10 };
        clip.paste();

        const pasted = app.elements[1];
        const cx = (pasted.startX + pasted.endX) / 2;
        const cy = (pasted.startY + pasted.endY) / 2;
        expect(cx).toBe(10 + app.gridSize);
        expect(cy).toBe(10 + app.gridSize);
    });
});
