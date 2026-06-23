import { describe, it, expect } from 'vitest';
import { NAME_TO_HEX, resolveColor, hexToAutocadIndex, nameFromHex } from '../js/utils/colors.js';

describe('color palette', () => {
  it('maps names to hex', () => {
    expect(NAME_TO_HEX.red).toBe('#ff4444');
    expect(NAME_TO_HEX.white).toBe('#ffffff');
  });

  it('resolveColor handles names, hex passthrough and fallback', () => {
    expect(resolveColor('blue')).toBe('#4444ff');
    expect(resolveColor('#123456')).toBe('#123456');
    expect(resolveColor(undefined)).toBe('#ffffff');
    expect(resolveColor('', '#000000')).toBe('#000000');
  });

  it('round-trips name <-> hex for populating the editor dropdown', () => {
    expect(nameFromHex('#ff4444')).toBe('red');
    expect(nameFromHex('#FFFFFF')).toBe('white'); // case-insensitive
    expect(nameFromHex('#123456')).toBeNull();    // not a palette color
    expect(nameFromHex(undefined)).toBeNull();
  });

  it('maps the actual on-screen hexes to AutoCAD indices (regression for DXF)', () => {
    // These are the hexes BoxStyleManager actually emits — the old DXF map
    // used #ff0000 etc and silently fell back to white (7) for every color.
    expect(hexToAutocadIndex('#ff4444')).toBe(1); // red
    expect(hexToAutocadIndex('#44ff44')).toBe(3); // green
    expect(hexToAutocadIndex('#FF44FF')).toBe(6); // magenta, case-insensitive
    expect(hexToAutocadIndex('#ffffff')).toBe(7); // white
    expect(hexToAutocadIndex(undefined)).toBe(7);
    expect(hexToAutocadIndex('#nonsense')).toBe(7);
  });
});
