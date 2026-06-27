import { describe, it, expect } from 'vitest';
import { ExportManager } from '../js/utils/export.js';
import { Renderer } from '../js/core/render.js';
import { isPointNearElement, isElementInBox, getElementsBounds } from '../js/utils/geometry.js';

const poly = {
  type: 'polyline', id: 'p1',
  points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
};

function makeManager(elements) {
  const app = { elements, gridSize: 10, ctx: null };
  app.renderer = new Renderer(app);
  return new ExportManager(app);
}

describe('polyline element', () => {
  it('is hit-tested against any of its segments', () => {
    expect(isPointNearElement(50, 1, poly, null)).toBe(true);  // on first segment
    expect(isPointNearElement(100, 50, poly, null)).toBe(true); // on second segment
    expect(isPointNearElement(50, 50, poly, null)).toBe(false); // interior
  });

  it('bounds span all points', () => {
    expect(getElementsBounds([poly])).toMatchObject({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
  });

  it('is rubber-band selected when a vertex is in the box', () => {
    expect(isElementInBox(poly, { minX: 90, minY: 90, maxX: 110, maxY: 110 })).toBe(true);
    expect(isElementInBox(poly, { minX: 200, minY: 200, maxX: 300, maxY: 300 })).toBe(false);
  });

  it('exports orthogonal segments to ASCII', () => {
    const out = makeManager([poly]).exportToASCII(false);
    expect(out).toContain('-'); // horizontal run
    expect(out).toContain('|'); // vertical run
  });

  it('exports a path to SVG and a polyline to DXF', () => {
    expect(makeManager([poly]).exportToSVG(true)).toMatch(/<path d="M 0 0 L 100 0 L 100 100"/);
    const dxf = makeManager([poly]).exportToDXF();
    expect((dxf.match(/\nLINE\n/g) || []).length).toBe(2); // two segments
  });

  it('adds an arrowhead path in SVG when an end arrow is set', () => {
    const count = s => (s.match(/<path/g) || []).length;
    const base = count(makeManager([poly]).exportToSVG(true));
    const withArrow = count(makeManager([{ ...poly, endArrow: true }]).exportToSVG(true));
    expect(withArrow).toBe(base + 1);
  });

  it('adds two arrowhead segments in DXF per arrow end', () => {
    const count = s => (s.match(/\nLINE\n/g) || []).length;
    const base = count(makeManager([poly]).exportToDXF());
    const both = count(makeManager([{ ...poly, startArrow: true, endArrow: true }]).exportToDXF());
    expect(both).toBe(base + 4); // 2 segments per arrowhead
  });
});
