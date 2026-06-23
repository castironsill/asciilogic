import { describe, it, expect } from 'vitest';
import { AsciiImporter } from '../js/utils/asciiImport.js';

// The importer writes onto app.elements and calls a few app hooks.
function makeApp() {
  return {
    elements: [],
    gridSize: 10,
    history: { saveState() {} },
    fitToContent() {},
  };
}

function importText(text) {
  const app = makeApp();
  new AsciiImporter(app).import(text);
  return app.elements;
}

describe('AsciiImporter', () => {
  it('ignores empty input', () => {
    const app = makeApp();
    new AsciiImporter(app).import('   \n  ');
    expect(app.elements).toHaveLength(0);
  });

  it('parses a simple ASCII box', () => {
    const els = importText(['+----+', '|    |', '+----+'].join('\n'));
    expect(els.some((e) => e.type === 'box')).toBe(true);
  });

  it('parses a Unicode box', () => {
    const els = importText(['┌────┐', '│    │', '└────┘'].join('\n'));
    expect(els.some((e) => e.type === 'box')).toBe(true);
  });

  it('centers label text found inside a box', () => {
    const els = importText(['+------+', '| Hi   |', '+------+'].join('\n'));
    const text = els.find((e) => e.type === 'text');
    expect(text).toBeTruthy();
    expect(text.text).toBe('Hi');
  });

  it('parses a standalone horizontal arrow', () => {
    const els = importText('---->');
    const arrow = els.find((e) => e.type === 'arrow');
    expect(arrow).toBeTruthy();
  });

  it('parses free-standing text', () => {
    const els = importText('Hello world');
    const text = els.find((e) => e.type === 'text');
    expect(text).toBeTruthy();
    expect(text.text).toContain('Hello');
  });

  it('round-trips a box through export then import', async () => {
    const { ExportManager } = await import('../js/utils/export.js');
    const ascii = new ExportManager({
      elements: [{ type: 'box', startX: 0, startY: 0, endX: 120, endY: 80 }],
      gridSize: 10,
    }).exportToASCII(true);

    const els = importText(ascii);
    expect(els.some((e) => e.type === 'box')).toBe(true);
  });
});
