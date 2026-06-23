import { describe, it, expect } from 'vitest';
import { ExportManager } from '../js/utils/export.js';

// ExportManager's ASCII path only reads app.elements and app.gridSize.
function makeManager(elements) {
  return new ExportManager({ elements, gridSize: 10 });
}

describe('exportToASCII', () => {
  it('reports when there is nothing to export', () => {
    expect(makeManager([]).exportToASCII()).toBe('No drawing to export');
  });

  it('renders a box with ASCII corners and edges (basic)', () => {
    const mgr = makeManager([{ type: 'box', startX: 0, startY: 0, endX: 120, endY: 60 }]);
    const out = mgr.exportToASCII(false);
    expect(out).toContain('+'); // corners
    expect(out).toContain('-'); // horizontal edge
    expect(out).toContain('|'); // vertical edge
  });

  it('uses Unicode box-drawing characters in extended mode', () => {
    const mgr = makeManager([{ type: 'box', startX: 0, startY: 0, endX: 120, endY: 60 }]);
    const out = mgr.exportToASCII(true);
    expect(out).toMatch(/[┌┐└┘─│]/);
  });

  it('draws a horizontal line as dashes', () => {
    const mgr = makeManager([{ type: 'line', startX: 0, startY: 0, endX: 100, endY: 0 }]);
    expect(mgr.exportToASCII(false)).toContain('-');
  });

  it('places an arrow head at the end of an arrow', () => {
    const mgr = makeManager([{ type: 'arrow', startX: 0, startY: 0, endX: 100, endY: 0 }]);
    expect(mgr.exportToASCII(false)).toContain('>');
  });

  it('renders text content into the grid', () => {
    const mgr = makeManager([{ type: 'text', x: 0, y: 0, text: 'HI', fontSize: 16 }]);
    expect(mgr.exportToASCII(false)).toContain('HI');
  });
});

describe('exportToASCII wrappers', () => {
  const box = [{ type: 'box', startX: 0, startY: 0, endX: 120, endY: 60 }];

  it('wraps in a markdown fence', () => {
    const out = makeManager(box).exportToASCII(false, { markdownFence: true });
    expect(out.startsWith('```')).toBe(true);
    expect(out.endsWith('```')).toBe(true);
  });

  it('wraps in a C-style comment block', () => {
    const out = makeManager(box).exportToASCII(false, { commentStyle: true });
    expect(out.startsWith('/*')).toBe(true);
    expect(out.trimEnd().endsWith('*/')).toBe(true);
  });
});
