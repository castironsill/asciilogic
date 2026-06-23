// js/utils/colors.js - Single source of truth for the palette.
// Maps a color name -> on-screen hex -> AutoCAD Color Index (ACI) for DXF.

export const COLORS = {
    white:   { name: 'White',   hex: '#ffffff', aci: 7 },
    gray:    { name: 'Gray',    hex: '#808080', aci: 8 },
    red:     { name: 'Red',     hex: '#ff4444', aci: 1 },
    blue:    { name: 'Blue',    hex: '#4444ff', aci: 5 },
    green:   { name: 'Green',   hex: '#44ff44', aci: 3 },
    yellow:  { name: 'Yellow',  hex: '#ffff44', aci: 2 },
    cyan:    { name: 'Cyan',    hex: '#44ffff', aci: 4 },
    magenta: { name: 'Magenta', hex: '#ff44ff', aci: 6 },
};

// { white: '#ffffff', ... }
export const NAME_TO_HEX = Object.fromEntries(
    Object.entries(COLORS).map(([name, c]) => [name, c.hex])
);

// Resolve a color name or hex string to its on-screen hex value.
export function resolveColor(value, fallback = '#ffffff') {
    if (!value) return fallback;
    if (NAME_TO_HEX[value]) return NAME_TO_HEX[value];
    return value; // already a hex/string
}

// Reverse lookup: on-screen hex -> palette name (or null if not a palette color).
export function nameFromHex(hex) {
    if (!hex) return null;
    const norm = hex.toLowerCase();
    for (const [name, c] of Object.entries(COLORS)) {
        if (c.hex.toLowerCase() === norm) return name;
    }
    return null;
}

// Map an on-screen hex to the closest AutoCAD Color Index for DXF export.
export function hexToAutocadIndex(hex) {
    if (!hex) return 7;
    const norm = hex.toLowerCase();
    for (const c of Object.values(COLORS)) {
        if (c.hex.toLowerCase() === norm) return c.aci;
    }
    return 7; // default to white
}
