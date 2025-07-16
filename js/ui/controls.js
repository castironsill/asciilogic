// js/ui/controls.js - UI controls (zoom, pan, etc.)

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
        
        // Grid size
        document.getElementById('grid-size').addEventListener('change', (e) => {
            this.app.gridSize = parseInt(e.target.value);
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
        
        // Help button
        document.getElementById('help-btn').addEventListener('click', () => {
            this.app.modalManager.showHelpModal();
        });
    }
    
    updateZoomDisplay() {
        document.getElementById('zoom-level').textContent = Math.round(this.app.zoom * 100) + '%';
    }
}