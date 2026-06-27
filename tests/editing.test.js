import { describe, it, expect } from 'vitest';
import { translateElement, reorderForZ } from '../js/utils/geometry.js';
import { Connectors, shapeCenter, shapeAnchors } from '../js/core/connectors.js';

describe('translateElement', () => {
  it('moves a line and its bend', () => {
    const el = { type: 'line', startX: 0, startY: 0, endX: 10, endY: 0, bendX: 5, bendY: 0 };
    translateElement(el, 3, 4);
    expect(el).toMatchObject({ startX: 3, startY: 4, endX: 13, endY: 4, bendX: 8, bendY: 4 });
  });

  it('moves text and polyline points', () => {
    const text = { type: 'text', x: 1, y: 2 };
    translateElement(text, 5, 5);
    expect(text).toMatchObject({ x: 6, y: 7 });

    const poly = { type: 'polyline', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] };
    translateElement(poly, -2, 3);
    expect(poly.points).toEqual([{ x: -2, y: 3 }, { x: 8, y: 13 }]);
  });
});

describe('reorderForZ', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };

  it('moves the selection to the front (end of array)', () => {
    expect(reorderForZ([a, b, c], new Set([b]), 'front')).toEqual([a, c, b]);
  });

  it('moves the selection to the back (start of array)', () => {
    expect(reorderForZ([a, b, c], new Set([c]), 'back')).toEqual([c, a, b]);
  });

  it('preserves relative order of multiple selected elements', () => {
    expect(reorderForZ([a, b, c], new Set([a, b]), 'front')).toEqual([c, a, b]);
  });
});

describe('connector center snap', () => {
  const box = { type: 'box', id: 'b1', startX: 0, startY: 0, endX: 100, endY: 100 };
  const connectors = new Connectors({ elements: [box] });

  it('reports a shape center', () => {
    expect(shapeCenter(box)).toEqual({ x: 50, y: 50 });
  });

  it('snaps to center when within the threshold', () => {
    expect(connectors.centerSnap(53, 48, null, 12)).toMatchObject({ x: 50, y: 50 });
  });

  it('does not snap when over the shape but far from center', () => {
    expect(connectors.centerSnap(10, 90, null, 12)).toBeNull();
  });

  it('does not snap when not over any shape', () => {
    expect(connectors.centerSnap(500, 500, null, 12)).toBeNull();
  });

  it('exposes center and four edge midpoints as anchors', () => {
    expect(shapeAnchors(box)).toEqual([
      { x: 50, y: 50, kind: 'center' },
      { x: 50, y: 0, kind: 'top' },
      { x: 100, y: 50, kind: 'right' },
      { x: 50, y: 100, kind: 'bottom' },
      { x: 0, y: 50, kind: 'left' }
    ]);
  });

  it('anchorSnap snaps to the nearest edge midpoint', () => {
    expect(connectors.anchorSnap(52, 2, null, 12)).toMatchObject({ x: 50, y: 0, kind: 'top' });
    expect(connectors.anchorSnap(98, 52, null, 12)).toMatchObject({ x: 100, y: 50, kind: 'right' });
  });

  it('anchorSnap matches an edge midpoint from just outside the border', () => {
    // 6px below the bottom edge midpoint (50,100) — outside the box.
    expect(connectors.anchorSnap(50, 106, null, 12)).toMatchObject({ x: 50, y: 100, kind: 'bottom' });
  });

  it('anchorSnap returns null when no anchor is within range', () => {
    expect(connectors.anchorSnap(30, 30, null, 12)).toBeNull();
  });
});
