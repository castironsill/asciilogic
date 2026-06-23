import { describe, it, expect } from 'vitest';
import { Connectors, makeBinding, anchorPos, shapeBounds } from '../js/core/connectors.js';

const box = (id, x1, y1, x2, y2) => ({ id, type: 'box', startX: x1, startY: y1, endX: x2, endY: y2 });

describe('binding math', () => {
  it('records the exact attach point as a fraction (no edge snapping)', () => {
    const b = box('s1', 0, 0, 100, 50);
    const binding = makeBinding(b, 95, 25);
    expect(binding.id).toBe('s1');
    expect(binding.fracX).toBeCloseTo(0.95); // stays where drawn, not snapped to 1
    expect(binding.fracY).toBeCloseTo(0.5);
  });

  it('clamps a point that lands just outside the box', () => {
    const b = box('s1', 0, 0, 100, 50);
    expect(makeBinding(b, 110, 25).fracX).toBeCloseTo(1); // clamped to the edge
  });

  it('resolves a binding back to an absolute point', () => {
    const b = box('s1', 0, 0, 100, 50);
    expect(anchorPos(b, { fracX: 1, fracY: 0.5 })).toEqual({ x: 100, y: 25 });
  });

  it('handles zero-size shapes without dividing by zero', () => {
    const b = box('s1', 10, 10, 10, 10);
    expect(makeBinding(b, 10, 10)).toMatchObject({ fracX: 0.5, fracY: 0.5 });
  });
});

describe('Connectors integration', () => {
  function makeApp(elements) {
    return { elements };
  }

  it('binds an endpoint dropped on a shape but leaves it where it was drawn', () => {
    const shape = box('s1', 0, 0, 100, 50);
    const line = { id: 'l1', type: 'arrow', startX: 200, startY: 25, endX: 96, endY: 25 };
    const app = makeApp([shape, line]);
    const c = new Connectors(app);

    c.bindEndpoint(line, 'end');
    expect(line.endBinding).toMatchObject({ id: 's1' });
    expect(line.endX).toBe(96); // stays where drawn, not yanked to the edge
    expect(line.startBinding == null).toBe(true); // start was over nothing
  });

  it('does not move or reshape a freshly bound connector on refresh', () => {
    const shape = box('s1', 0, 0, 100, 50);
    const line = { id: 'l1', type: 'line', startX: 200, startY: 40, endX: 80, endY: 40, endBinding: { id: 's1', fracX: 0.8, fracY: 0.8 } };
    const app = makeApp([shape, line]);
    const c = new Connectors(app);
    c.refresh();
    expect(line.endX).toBe(80); // anchor already matches -> untouched
    expect(line.endY).toBe(40);
    expect(line.bendX).toBeUndefined(); // not rerouted
  });

  it('follows the shape when it moves', () => {
    const shape = box('s1', 0, 0, 100, 50);
    const line = { id: 'l1', type: 'line', startX: 300, startY: 25, endX: 100, endY: 25, endBinding: { id: 's1', fracX: 1, fracY: 0.5 } };
    const app = makeApp([shape, line]);
    const c = new Connectors(app);

    // Move the shape right by 50.
    shape.startX += 50; shape.endX += 50;
    c.refresh();
    expect(line.endX).toBe(150);
    expect(line.endY).toBe(25);
  });

  it('tracks proportionally when the shape resizes', () => {
    const shape = box('s1', 0, 0, 100, 50);
    const line = { id: 'l1', type: 'line', startX: 300, startY: 50, endX: 50, endY: 50, endBinding: { id: 's1', fracX: 0.5, fracY: 1 } };
    const app = makeApp([shape, line]);
    const c = new Connectors(app);

    shape.endX = 200; shape.endY = 80; // grow
    c.refresh();
    expect(line.endX).toBe(100); // 0.5 * new width 200
    expect(line.endY).toBe(80);  // bottom edge
  });

  it('drops the binding when the target shape is gone', () => {
    const line = { id: 'l1', type: 'line', startX: 0, startY: 0, endX: 10, endY: 10, endBinding: { id: 'missing', fracX: 1, fracY: 1 } };
    const app = makeApp([line]);
    const c = new Connectors(app);
    c.refresh();
    expect(line.endBinding).toBeNull();
  });

  it('adds an orthogonal bend when a move makes the connector diagonal', () => {
    const shape = box('s1', 0, 0, 40, 40);
    // Anchor end starts at (40, 20), level with the start -> straight.
    const line = { id: 'l1', type: 'line', startX: 200, startY: 20, endX: 40, endY: 20, endBinding: { id: 's1', fracX: 1, fracY: 0.5 } };
    const app = makeApp([shape, line]);
    const c = new Connectors(app);
    c.refresh();
    expect(line.bendX).toBeUndefined(); // still straight, nothing moved

    // Move the shape down so the bound end drops below the start -> diagonal.
    shape.startY = 80; shape.endY = 120; // anchor end now (40, 100)
    c.refresh();
    expect(line.endY).toBe(100);
    expect(line.bendX).not.toBeUndefined(); // rerouted to stay orthogonal
    expect(line.bendY).not.toBeUndefined();
  });
});
