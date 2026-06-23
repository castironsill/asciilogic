import { describe, it, expect } from 'vitest';
import {
  distanceToLineSegment,
  getNormalizedBox,
  isPointNearElement,
  isElementInBox,
  getElementsBounds,
  connectorMidpoint,
} from '../js/utils/geometry.js';

// Minimal 2D-context stub: only what the geometry helpers touch.
function mockCtx(charWidth = 10) {
  return {
    font: '',
    save() {},
    restore() {},
    measureText(text) {
      return { width: text.length * charWidth };
    },
  };
}

describe('distanceToLineSegment', () => {
  it('is zero for a point on the segment', () => {
    expect(distanceToLineSegment(5, 0, 0, 0, 10, 0)).toBe(0);
  });

  it('measures perpendicular distance', () => {
    expect(distanceToLineSegment(5, 5, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it('clamps to the nearest endpoint when past the segment', () => {
    expect(distanceToLineSegment(-3, 4, 0, 0, 10, 0)).toBeCloseTo(5);
  });
});

describe('getNormalizedBox', () => {
  it('normalizes regardless of drag direction', () => {
    expect(getNormalizedBox({ startX: 10, startY: 20, endX: 0, endY: 5 })).toEqual({
      minX: 0,
      minY: 5,
      maxX: 10,
      maxY: 20,
    });
  });
});

describe('isPointNearElement', () => {
  const ctx = mockCtx();

  it('detects a click on a box border but not its hollow center', () => {
    const box = { type: 'box', startX: 0, startY: 0, endX: 100, endY: 100 };
    expect(isPointNearElement(0, 50, box, ctx)).toBe(true); // on left edge
    expect(isPointNearElement(50, 50, box, ctx)).toBe(false); // empty middle
  });

  it('detects a click along a line within threshold', () => {
    const line = { type: 'line', startX: 0, startY: 0, endX: 100, endY: 0 };
    expect(isPointNearElement(50, 2, line, ctx)).toBe(true);
    expect(isPointNearElement(50, 20, line, ctx)).toBe(false);
  });

  it('uses measured text width for text hit-testing', () => {
    const text = { type: 'text', x: 0, y: 20, text: 'hello', fontSize: 16 };
    expect(isPointNearElement(2, 15, text, ctx)).toBe(true); // 'hello' => 50px wide
    expect(isPointNearElement(80, 15, text, ctx)).toBe(false);
  });
});

describe('isElementInBox', () => {
  const box = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

  it('includes text whose anchor is inside', () => {
    expect(isElementInBox({ type: 'text', x: 10, y: 10, text: 'x' }, box)).toBe(true);
    expect(isElementInBox({ type: 'text', x: 200, y: 10, text: 'x' }, box)).toBe(false);
  });

  it('includes a line with at least one endpoint inside', () => {
    const line = { type: 'line', startX: 50, startY: 50, endX: 500, endY: 500 };
    expect(isElementInBox(line, box)).toBe(true);
  });
});

describe('connectorMidpoint', () => {
  it('is the center of a straight line', () => {
    expect(connectorMidpoint({ startX: 0, startY: 0, endX: 100, endY: 0 })).toEqual({ x: 50, y: 0 });
  });

  it('lands at the corner of an equal-length L bend', () => {
    expect(connectorMidpoint({ startX: 0, startY: 0, bendX: 100, bendY: 0, endX: 100, endY: 100 }))
      .toEqual({ x: 100, y: 0 });
  });

  it('falls back to the start for a zero-length connector', () => {
    expect(connectorMidpoint({ startX: 5, startY: 7, endX: 5, endY: 7 })).toEqual({ x: 5, y: 7 });
  });
});

describe('getElementsBounds', () => {
  it('returns null for an empty list', () => {
    expect(getElementsBounds([])).toBeNull();
    expect(getElementsBounds(null)).toBeNull();
  });

  it('computes a box bounding rect', () => {
    const b = getElementsBounds([{ type: 'box', startX: 10, startY: 20, endX: 110, endY: 60 }]);
    expect(b).toMatchObject({ minX: 10, minY: 20, maxX: 110, maxY: 60, width: 100, height: 40 });
  });

  it('includes a line bend point in the bounds', () => {
    const b = getElementsBounds([
      { type: 'line', startX: 0, startY: 0, endX: 100, endY: 50, bendX: 100, bendY: 0 },
    ]);
    expect(b.maxX).toBe(100);
    expect(b.maxY).toBe(50);
  });

  it('estimates text width from char count without a ctx', () => {
    const b = getElementsBounds([{ type: 'text', x: 0, y: 16, text: 'abcde', fontSize: 16 }]);
    // 5 chars * 16 * 0.6 = 48
    expect(b.maxX).toBeCloseTo(48);
  });

  it('uses the ctx to measure text when provided', () => {
    const b = getElementsBounds(
      [{ type: 'text', x: 0, y: 16, text: 'abcde', fontSize: 16 }],
      mockCtx(8)
    );
    expect(b.maxX).toBeCloseTo(40); // 5 chars * 8px
  });

  it('unions bounds across multiple elements', () => {
    const b = getElementsBounds([
      { type: 'box', startX: 0, startY: 0, endX: 50, endY: 50 },
      { type: 'line', startX: 100, startY: 100, endX: 200, endY: 120 },
    ]);
    expect(b).toMatchObject({ minX: 0, minY: 0, maxX: 200, maxY: 120 });
  });
});
