import { describe, it, expect } from 'vitest';
import { Grid } from '../js/utils/grid.js';

describe('grid snapping (independent of visibility)', () => {
  it('snaps to the nearest multiple when enabled', () => {
    const g = new Grid({ gridSize: 10, snapEnabled: true });
    expect(g.snapToGrid(13)).toBe(10);
    expect(g.snapToGrid(16)).toBe(20);
  });

  it('returns the exact value when snapping is off', () => {
    const g = new Grid({ gridSize: 10, snapEnabled: false });
    expect(g.snapToGrid(13)).toBe(13);
  });

  it('does not divide by zero on a missing grid size', () => {
    const g = new Grid({ gridSize: 0, snapEnabled: true });
    expect(g.snapToGrid(13)).toBe(13);
  });
});
