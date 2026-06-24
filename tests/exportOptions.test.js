import { describe, it, expect } from 'vitest';
import { ExportManager } from '../js/utils/export.js';
import { Renderer } from '../js/core/render.js';

function mgr(elements) {
  const app = { elements, gridSize: 10, ctx: null };
  app.renderer = new Renderer(app);
  return new ExportManager(app);
}

const line = (extra = {}) => ({ type: 'line', id: 'l1', startX: 0, startY: 0, endX: 50, endY: 0, ...extra });

describe('export background / watermark options', () => {
  it('maps each background to a fill and default ink', () => {
    const m = mgr([]);
    expect(m.backgroundColors('white')).toMatchObject({ fill: '#ffffff', ink: '#1a1a1a' });
    expect(m.backgroundColors('transparent').fill).toBeNull();
    expect(m.backgroundColors('dark')).toMatchObject({ fill: '#1a1a1a', ink: '#ffffff' });
  });

  it('transparent SVG omits the background rect', () => {
    const svg = mgr([line()]).exportToSVG(true, { background: 'transparent' });
    expect(svg).not.toContain('fill="#1a1a1a"');
  });

  it('white SVG paints a white background and dark default ink', () => {
    const svg = mgr([line()]).exportToSVG(true, { background: 'white' });
    expect(svg).toContain('fill="#ffffff"');   // background rect
    expect(svg).toContain('stroke="#1a1a1a"'); // ink for the uncolored line
  });

  it('keeps an explicit element color regardless of background', () => {
    const svg = mgr([line({ color: '#ff4444' })]).exportToSVG(true, { background: 'white' });
    expect(svg).toContain('stroke="#ff4444"');
  });

  it('can omit the watermark', () => {
    expect(mgr([line()]).exportToSVG(true, { watermark: false })).not.toContain('asciilogic.com');
    expect(mgr([line()]).exportToSVG(true, { watermark: true })).toContain('asciilogic.com');
  });

  it('defaults to dark + watermark when no options are passed', () => {
    const svg = mgr([line()]).exportToSVG(true);
    expect(svg).toContain('fill="#1a1a1a"');
    expect(svg).toContain('asciilogic.com');
  });
});
