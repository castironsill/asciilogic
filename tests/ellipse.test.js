import { describe, it, expect } from 'vitest';
import { ExportManager } from '../js/utils/export.js';
import { Renderer } from '../js/core/render.js';
import { isPointNearElement, isElementInBox, getElementsBounds } from '../js/utils/geometry.js';

const ellipse = { type: 'ellipse', startX: 0, startY: 0, endX: 100, endY: 60 };

// ExportManager's SVG/PNG paths read app.renderer.getContentBounds().
function makeManager(elements) {
  const app = { elements, gridSize: 10, ctx: null };
  app.renderer = new Renderer(app);
  return new ExportManager(app);
}

describe('ellipse geometry', () => {
  it('is selectable at its center but not far outside', () => {
    expect(isPointNearElement(50, 30, ellipse, null)).toBe(true);
    expect(isPointNearElement(99, 59, ellipse, null)).toBe(false); // corner is outside the curve
  });

  it('contributes its bounding box to bounds', () => {
    expect(getElementsBounds([ellipse])).toMatchObject({ minX: 0, minY: 0, maxX: 100, maxY: 60 });
  });

  it('is caught by a rubber-band box that overlaps it', () => {
    expect(isElementInBox(ellipse, { minX: 40, minY: 20, maxX: 60, maxY: 40 })).toBe(true);
    expect(isElementInBox(ellipse, { minX: 200, minY: 200, maxX: 300, maxY: 300 })).toBe(false);
  });
});

describe('ellipse export', () => {
  it('renders a closed outline in ASCII', () => {
    const out = makeManager([ellipse]).exportToASCII(true);
    // Should contain curve characters and form more than one row.
    expect(out).toMatch(/[│─]/);
    expect(out.split('\n').length).toBeGreaterThan(1);
  });

  it('emits an <ellipse> in SVG', () => {
    const svg = makeManager([ellipse]).exportToSVG(true);
    expect(svg).toContain('<ellipse');
    expect(svg).toMatch(/rx="50"/);
  });

  it('emits a closed polyline in DXF', () => {
    const dxf = makeManager([ellipse]).exportToDXF();
    expect(dxf).toContain('LWPOLYLINE');
  });
});
