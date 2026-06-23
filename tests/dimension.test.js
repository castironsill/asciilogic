import { describe, it, expect } from 'vitest';
import { ExportManager } from '../js/utils/export.js';
import { Renderer } from '../js/core/render.js';
import { isPointNearElement, getElementsBounds } from '../js/utils/geometry.js';

const dim = { type: 'dimension', id: 'd1', startX: 0, startY: 0, endX: 200, endY: 0, text: '5.0m' };

function makeManager(elements) {
  const app = { elements, gridSize: 10, ctx: null };
  app.renderer = new Renderer(app);
  return new ExportManager(app);
}

describe('dimension element', () => {
  it('is hit-tested like a line', () => {
    expect(isPointNearElement(100, 2, dim, null)).toBe(true);
    expect(isPointNearElement(100, 40, dim, null)).toBe(false);
  });

  it('contributes its endpoints to bounds', () => {
    expect(getElementsBounds([dim])).toMatchObject({ minX: 0, maxX: 200, minY: 0, maxY: 0 });
  });

  it('exports the value to ASCII', () => {
    expect(makeManager([dim]).exportToASCII(false)).toContain('5.0m');
  });

  it('exports a line, ticks and value to SVG', () => {
    const svg = makeManager([dim]).exportToSVG(true);
    expect((svg.match(/<line/g) || []).length).toBeGreaterThanOrEqual(3); // main + 2 ticks
    expect(svg).toContain('5.0m');
  });

  it('exports a TEXT entity to DXF', () => {
    const dxf = makeManager([dim]).exportToDXF();
    expect(dxf).toContain('5.0m');
  });
});
