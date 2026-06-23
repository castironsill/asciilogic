import { describe, it, expect } from 'vitest';
import { zigzagPoints, connectorCorners } from '../js/utils/zigzag.js';

describe('zigzag geometry', () => {
  it('starts and ends exactly on the endpoints', () => {
    const pts = zigzagPoints([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 100, y: 0 });
  });

  it('inserts oscillating intermediate points on a long segment', () => {
    const pts = zigzagPoints([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
    expect(pts.length).toBeGreaterThan(2);
    const offsets = pts.slice(1, -1).map(p => Math.sign(Math.round(p.y)));
    expect(offsets).toContain(1);
    expect(offsets).toContain(-1); // it goes both ways
  });

  it('leaves a very short segment as a straight line', () => {
    const pts = zigzagPoints([{ x: 0, y: 0 }, { x: 3, y: 0 }]);
    expect(pts).toEqual([{ x: 0, y: 0 }, { x: 3, y: 0 }]);
  });

  it('follows a bent connector through its corner', () => {
    const corners = connectorCorners({ startX: 0, startY: 0, bendX: 100, bendY: 0, endX: 100, endY: 100 });
    expect(corners).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
    const pts = zigzagPoints(corners);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 100, y: 100 });
  });
});
