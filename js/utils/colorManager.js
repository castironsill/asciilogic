// js/utils/colorManager.js - One color control for every element type.
// Sets the default color for new elements, or recolors the current
// selection (boxes, ellipses, lines, arrows, text).

import { COLORS, resolveColor, nameFromHex } from './colors.js';

export class ColorManager {
    constructor(app) {
        this.app = app;
        this.currentColor = '#ffffff';
        this.editingElements = [];
        this.swatches = [];
        this.setupEventListeners();
    }

    // Build a swatch button per palette colour so the palette stays the single
    // source of truth (js/utils/colors.js).
    setupEventListeners() {
        const container = document.getElementById('color-swatches');
        if (!container) return;

        Object.entries(COLORS).forEach(([key, c], index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'color-swatch';
            btn.dataset.color = key;
            btn.style.background = c.hex;
            btn.title = c.name;
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-label', c.name);
            btn.setAttribute('aria-checked', 'false');
            btn.tabIndex = -1;
            btn.addEventListener('click', () => this.selectSwatch(key));
            btn.addEventListener('keydown', (e) => this.handleSwatchKeydown(e, index));
            container.appendChild(btn);
            this.swatches.push(btn);
        });

        this.updateActiveSwatch(nameFromHex(this.currentColor));
    }

    // Arrow/Home/End move through the swatches like a standard ARIA radiogroup,
    // selecting as they go.
    handleSwatchKeydown(e, index) {
        const last = this.swatches.length - 1;
        let next;
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown': next = index === last ? 0 : index + 1; break;
            case 'ArrowLeft':
            case 'ArrowUp': next = index === 0 ? last : index - 1; break;
            case 'Home': next = 0; break;
            case 'End': next = last; break;
            default: return;
        }
        e.preventDefault();
        const btn = this.swatches[next];
        this.selectSwatch(btn.dataset.color);
        btn.focus();
    }

    selectSwatch(key) {
        this.setColor(key);
        this.updateActiveSwatch(key);
    }

    setColor(value) {
        const hex = resolveColor(value);
        if (this.editingElements.length) {
            this.editingElements.forEach(el => { el.color = hex; });
            this.app.history.saveState();
            this.app.render();
        } else {
            this.currentColor = hex;
        }
    }

    getColor() {
        return this.currentColor;
    }

    // Highlight the swatch matching `name` (a palette key) and clear the rest.
    // Also maintains a roving tabindex so the group is a single tab stop.
    updateActiveSwatch(name) {
        let activeIdx = -1;
        this.swatches.forEach((btn, i) => {
            const on = btn.dataset.color === name;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-checked', on ? 'true' : 'false');
            if (on) activeIdx = i;
        });
        // The checked swatch is the tab stop; if none matches, fall back to the first.
        const stop = activeIdx === -1 ? 0 : activeIdx;
        this.swatches.forEach((btn, i) => { btn.tabIndex = i === stop ? 0 : -1; });
    }

    // Reflect the selection's colour (or the default when nothing is selected)
    // and remember what edits should apply to.
    syncControl(selectedList) {
        this.editingElements = selectedList;
        const ref = selectedList.length ? selectedList[0].color : this.currentColor;
        this.updateActiveSwatch(nameFromHex(ref));
    }
}
