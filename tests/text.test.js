import { describe, it, expect } from 'vitest';
import { ExportManager } from '../js/utils/export.js';
import { Renderer } from '../js/core/render.js';
import { getTextDimensions, isPointNearElement } from '../js/utils/geometry.js';

const multiline = { type: 'text', x: 0, y: 16, text: 'line one\nline two\nthree', fontSize: 16 };

function makeManager(elements) {
  const app = { elements, gridSize: 10, ctx: null };
  app.renderer = new Renderer(app);
  return new ExportManager(app);
}

describe('getTextDimensions', () => {
  it('reports line count and widest line (char estimate without ctx)', () => {
    const d = getTextDimensions(multiline, null);
    expect(d.lineCount).toBe(3);
    // widest line is "line one"/"line two" = 8 chars * 16 * 0.6
    expect(d.width).toBeCloseTo(8 * 16 * 0.6);
    expect(d.height).toBeCloseTo(3 * 16 * 1.2);
  });

  it('treats a single-line string as one line', () => {
    expect(getTextDimensions({ text: 'hi', fontSize: 16 }).lineCount).toBe(1);
  });
});

describe('multi-line hit-testing', () => {
  it('extends the clickable area down across all lines', () => {
    // y of the third line is well below the first; should still hit
    expect(isPointNearElement(5, 16 + 2 * 16 * 1.2, multiline, null)).toBe(true);
    // far below the last line should miss
    expect(isPointNearElement(5, 16 + 10 * 16 * 1.2, multiline, null)).toBe(false);
  });
});

describe('multi-line export', () => {
  it('writes each line on its own ASCII row', () => {
    const out = makeManager([multiline]).exportToASCII(false);
    expect(out).toContain('line one');
    expect(out).toContain('line two');
    expect(out).toContain('three');
  });

  it('emits a <tspan> per line in SVG', () => {
    const svg = makeManager([multiline]).exportToSVG(true);
    expect((svg.match(/<tspan/g) || []).length).toBe(3);
  });

  it('emits one DXF TEXT entity per line', () => {
    const dxf = makeManager([multiline]).exportToDXF();
    // 3 lines => 3 TEXT records
    expect((dxf.match(/\nTEXT\n/g) || []).length).toBe(3);
  });
});
