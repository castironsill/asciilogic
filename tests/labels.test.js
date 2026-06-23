import { describe, it, expect } from 'vitest';
import { ExportManager } from '../js/utils/export.js';
import { Renderer } from '../js/core/render.js';

function makeManager(elements) {
  const app = { elements, gridSize: 10, ctx: null };
  app.renderer = new Renderer(app);
  return new ExportManager(app);
}

const labelled = {
  type: 'arrow', id: 'l1',
  startX: 0, startY: 0, endX: 200, endY: 0,
  label: 'yes',
};

describe('connector labels in exports', () => {
  it('writes the label onto the ASCII grid near the midpoint', () => {
    const out = makeManager([labelled]).exportToASCII(false);
    expect(out).toContain('yes');
  });

  it('emits the label as SVG text', () => {
    const svg = makeManager([labelled]).exportToSVG(true);
    expect(svg).toContain('yes');
    expect(svg).toMatch(/text-anchor="middle"/);
  });

  it('emits the label as a DXF TEXT entity', () => {
    const dxf = makeManager([labelled]).exportToDXF();
    expect(dxf).toMatch(/\nTEXT\n/);
    expect(dxf).toContain('yes');
  });
});
