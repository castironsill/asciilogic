import { describe, it, expect } from 'vitest';
import { Selection } from '../js/core/selection.js';
import { SelectTool } from '../js/tools/SelectTool.js';

describe('box/ellipse resize handles', () => {
  const box = { type: 'box', startX: 0, startY: 0, endX: 100, endY: 60 };
  const selection = new Selection({ selectedElement: box, zoom: 1 });

  it('detects corner and edge handles', () => {
    expect(selection.getHandleAt(0, 0).type).toBe('nw');
    expect(selection.getHandleAt(100, 60).type).toBe('se');
    expect(selection.getHandleAt(50, 0).type).toBe('n');
    expect(selection.getHandleAt(100, 30).type).toBe('e');
    expect(selection.getHandleAt(50, 30)).toBeNull(); // hollow center, no handle
  });

  it('works for ellipses too', () => {
    const sel = new Selection({ selectedElement: { type: 'ellipse', startX: 0, startY: 0, endX: 40, endY: 40 }, zoom: 1 });
    expect(sel.getHandleAt(0, 0).type).toBe('nw');
  });

  it('resizes the dragged corner while anchoring the opposite', () => {
    const el = { type: 'box', startX: 0, startY: 0, endX: 100, endY: 60 };
    const tool = new SelectTool({ selectedElement: el });
    tool.originalElement = { ...el };
    tool.resizeBox('se', 150, 90);
    expect(el).toMatchObject({ startX: 0, startY: 0, endX: 150, endY: 90 });
  });

  it('moves only one axis for an edge handle', () => {
    const el = { type: 'box', startX: 0, startY: 0, endX: 100, endY: 60 };
    const tool = new SelectTool({ selectedElement: el });
    tool.originalElement = { ...el };
    tool.resizeBox('n', 999, 20); // north edge: only Y changes
    expect(el).toMatchObject({ startX: 0, endX: 100, startY: 20, endY: 60 });
  });

  it('flips cleanly when dragged past the opposite edge', () => {
    const el = { type: 'box', startX: 0, startY: 0, endX: 100, endY: 60 };
    const tool = new SelectTool({ selectedElement: el });
    tool.originalElement = { ...el };
    tool.resizeBox('e', -20, 0); // drag east edge far west
    expect(el.startX).toBe(-20);
    expect(el.endX).toBe(0);
  });
});
