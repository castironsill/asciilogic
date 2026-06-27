import { describe, it, expect } from 'vitest';
import { parseDxf, primitivesToElements } from '../js/utils/dxfImport.js';

// Build a minimal ASCII DXF document from a list of entity blocks. Each entity
// is an array of [code, value] pairs; we wrap them in an ENTITIES section.
function dxfDoc(entities, { blocks = '' } = {}) {
  const ents = entities
    .map(pairs => pairs.map(([c, v]) => `${c}\n${v}`).join('\n'))
    .join('\n');
  return [
    blocks,
    '0', 'SECTION', '2', 'ENTITIES',
    ents,
    '0', 'ENDSEC', '0', 'EOF'
  ].filter(Boolean).join('\n');
}

describe('parseDxf', () => {
  it('parses a LINE', () => {
    const { primitives } = parseDxf(dxfDoc([
      [[0, 'LINE'], [10, '0'], [20, '0'], [11, '10'], [21, '20']]
    ]));
    expect(primitives).toEqual([
      { kind: 'line', x1: 0, y1: 0, x2: 10, y2: 20, color: null }
    ]);
  });

  it('parses a CIRCLE', () => {
    const { primitives } = parseDxf(dxfDoc([
      [[0, 'CIRCLE'], [10, '5'], [20, '5'], [40, '3']]
    ]));
    expect(primitives[0]).toMatchObject({ kind: 'circle', cx: 5, cy: 5, r: 3 });
  });

  it('parses an LWPOLYLINE with multiple vertices and the closed flag', () => {
    const { primitives } = parseDxf(dxfDoc([
      [[0, 'LWPOLYLINE'], [90, '3'], [70, '1'],
       [10, '0'], [20, '0'], [10, '10'], [20, '0'], [10, '10'], [20, '10']]
    ]));
    expect(primitives[0].kind).toBe('polyline');
    expect(primitives[0].closed).toBe(true);
    expect(primitives[0].points).toEqual([
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }
    ]);
  });

  it('parses TEXT with its string', () => {
    const { primitives } = parseDxf(dxfDoc([
      [[0, 'TEXT'], [10, '1'], [20, '2'], [40, '5'], [1, 'V1']]
    ]));
    expect(primitives[0]).toMatchObject({ kind: 'text', x: 1, y: 2, height: 5, text: 'V1' });
  });

  it('records unsupported entities in stats instead of throwing', () => {
    const { primitives, stats } = parseDxf(dxfDoc([
      [[0, 'SPLINE'], [10, '0'], [20, '0']]
    ]));
    expect(primitives).toHaveLength(0);
    expect(stats.skipped.SPLINE).toBe(1);
  });

  it('expands an INSERT against a BLOCK with translation', () => {
    const blocks = [
      '0', 'SECTION', '2', 'BLOCKS',
      '0', 'BLOCK', '2', 'VALVE', '10', '0', '20', '0',
      '0', 'LINE', '10', '0', '20', '0', '11', '2', '21', '0',
      '0', 'ENDBLK',
      '0', 'ENDSEC'
    ].join('\n');
    const { primitives } = parseDxf(dxfDoc([
      [[0, 'INSERT'], [2, 'VALVE'], [10, '100'], [20, '50']]
    ], { blocks }));
    // The block's line (0,0)->(2,0) is translated by the insertion point.
    expect(primitives[0]).toMatchObject({ kind: 'line', x1: 100, y1: 50, x2: 102, y2: 50 });
  });
});

describe('primitivesToElements', () => {
  it('flips the Y axis so DXF (Y up) becomes canvas (Y down)', () => {
    // Two points; lower DXF y should map to a larger canvas y.
    const { elements } = primitivesToElements(
      [{ kind: 'line', x1: 0, y1: 0, x2: 0, y2: 100, color: null }],
      { margin: 0 }
    );
    const line = elements[0];
    // y1 (DXF 0, the bottom) maps below y2 (DXF 100, the top).
    expect(line.startY).toBeGreaterThan(line.endY);
  });

  it('maps a circle to an axis-aligned ellipse bounding box', () => {
    const { elements } = primitivesToElements(
      [{ kind: 'circle', cx: 50, cy: 50, r: 50, color: null }],
      { margin: 0 }
    );
    const el = elements[0];
    expect(el.type).toBe('ellipse');
    expect(el.endX - el.startX).toBeCloseTo(el.endY - el.startY); // square box
  });

  it('falls back to the default colour when an entity has none', () => {
    const { elements } = primitivesToElements(
      [{ kind: 'line', x1: 0, y1: 0, x2: 1, y2: 1, color: null }],
      { defaultColor: '#ffffff' }
    );
    expect(elements[0].color).toBe('#ffffff');
  });
});
