// js/ui/controls.js - UI controls (zoom, pan, etc.)

import { notifications } from './notifications.js';

export class ControlsManager {
    constructor(app) {
        this.app = app;
        this.setupControlListeners();
    }
    
    setupControlListeners() {
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.app.changeZoom(0.1);
        });
        
        document.getElementById('zoom-out').addEventListener('click', () => {
            this.app.changeZoom(-0.1);
        });
        
        document.getElementById('fit-content').addEventListener('click', () => {
            this.app.fitToContent();
        });
        
        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            if (confirm('Clear the entire canvas? This cannot be undone.')) {
                this.app.clearCanvas();
            }
        });
        
        // Undo/Redo
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.app.history.undo();
        });
        
        document.getElementById('redo-btn').addEventListener('click', () => {
            this.app.history.redo();
        });
        
        // Grid size (kept at a sane minimum; visibility/snap are separate toggles)
        document.getElementById('grid-size').addEventListener('change', (e) => {
            const size = parseInt(e.target.value, 10);
            this.app.gridSize = Number.isFinite(size) && size >= 1 ? size : 10;
            e.target.value = this.app.gridSize;
            this.app.grid.draw();
            this.app.render();
        });
        
        // Font size
        document.getElementById('font-size').addEventListener('change', (e) => {
            this.app.fontSize = parseInt(e.target.value);
            // Update selected text element if any
            if (this.app.selectedElement && this.app.selectedElement.type === 'text') {
                this.app.selectedElement.fontSize = this.app.fontSize;
                this.app.history.saveState();
                this.app.render();
            }
        });
        
        // Export/Import buttons
        document.getElementById('export-btn').addEventListener('click', () => {
            this.app.modalManager.showExportModal();
        });
        
        document.getElementById('import-btn').addEventListener('click', () => {
            this.app.modalManager.showImportModal();
        });

        // Import DXF: open a file picker, then parse the chosen file.
        const dxfBtn = document.getElementById('import-dxf-btn');
        const dxfInput = document.getElementById('dxf-file-input');
        if (dxfBtn && dxfInput) {
            dxfBtn.addEventListener('click', () => dxfInput.click());
            dxfInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                if (/\.dwg$/i.test(file.name)) {
                    notifications.show('DWG isn’t supported — convert it to DXF first (e.g. LibreCAD or the free ODA File Converter)', 6000);
                    dxfInput.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => this.app.importDXF(String(reader.result));
                reader.onerror = () => notifications.show('Could not read that file');
                reader.readAsText(file);
                dxfInput.value = ''; // allow re-importing the same file
            });
        }
        
        // Help button
        document.getElementById('help-btn').addEventListener('click', () => {
            this.app.modalManager.showHelpModal();
        });
    }
    
    updateZoomDisplay() {
        document.getElementById('zoom-level').textContent = Math.round(this.app.zoom * 100) + '%';
    }
}