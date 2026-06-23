// js/utils/colorManager.js - One color control for every element type.
// Sets the default color for new elements, or recolors the current
// selection (boxes, ellipses, lines, arrows, text).

import { resolveColor, nameFromHex } from './colors.js';

export class ColorManager {
    constructor(app) {
        this.app = app;
        this.currentColor = '#ffffff';
        this.editingElements = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        const select = document.getElementById('color-select');
        if (select) {
            select.addEventListener('change', (e) => this.setColor(e.target.value));
        }
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

    // Populate the dropdown from the selection (or the default when nothing
    // is selected) and remember what edits should apply to.
    syncControl(selectedList) {
        const select = document.getElementById('color-select');
        if (!select) return;

        this.editingElements = selectedList;
        const ref = selectedList.length ? selectedList[0].color : this.currentColor;
        const name = nameFromHex(ref);
        if (name) select.value = name;
    }
}
