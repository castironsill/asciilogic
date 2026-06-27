import { describe, it, expect } from 'vitest';
import { SelectTool } from '../js/tools/SelectTool.js';

// scaleElement is pure (no DOM/app access), so we can exercise the group-scale
// math directly.
const tool = new SelectTool(null);

describe('SelectTool.scaleElement', () => {
  it('scales a line about an anchor', () => {
    const o = { type: 'line', startX: 10, startY: 10, endX: 20, endY: 10 };
    const el = { ...o };
    tool.scaleElement(el, o, 2, 0, 0); // 2x about the origin
    expect(el).toMatchObject({ startX: 20, startY: 20, endX: 40, endY: 20 });
  });

  it('keeps the anchor point fixed', () => {
    const o = { type: 'line', startX: 5, startY: 5, endX: 25, endY: 5 };
    const el = { ...o };
    tool.scaleElement(el, o, 3, 5, 5); // anchor coincides with the start point
    expect(el.startX).toBe(5);
    expect(el.startY).toBe(5);
    expect(el.endX).toBe(65); // 5 + (25-5)*3
  });

  it('scales text position and font size together', () => {
    const o = { type: 'text', x: 10, y: 10, fontSize: 16, text: 'hi' };
    const el = { ...o };
    tool.scaleElement(el, o, 0.5, 0, 0);
    expect(el).toMatchObject({ x: 5, y: 5, fontSize: 8 });
  });

  it('scales every polyline point', () => {
    const o = { type: 'polyline', points: [{ x: 0, y: 0 }, { x: 10, y: 20 }] };
    const el = { type: 'polyline', points: [] };
    tool.scaleElement(el, o, 2, 0, 0);
    expect(el.points).toEqual([{ x: 0, y: 0 }, { x: 20, y: 40 }]);
  });
});
