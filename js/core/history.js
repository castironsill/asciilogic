export class History {
    constructor(app) {
        this.app = app;
        this.history = [];
        this.historyIndex = -1;
    }
    
    saveState() {
        // Remove any states after current index (for when we undo then do something new)
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add current state
        this.history.push(JSON.stringify(this.app.elements));
        this.historyIndex = this.history.length - 1;
        
        // Limit history size to prevent memory issues
        const maxHistory = 50;
        if (this.history.length > maxHistory) {
            this.history = this.history.slice(-maxHistory);
            this.historyIndex = this.history.length - 1;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.app.elements = JSON.parse(this.history[this.historyIndex]);
            this.app.selectedElement = null;
            this.app.selectedElements = [];
            this.app.render();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.app.elements = JSON.parse(this.history[this.historyIndex]);
            this.app.selectedElement = null;
            this.app.selectedElements = [];
            this.app.render();
        }
    }
    
    clear() {
        this.history = [];
        this.historyIndex = -1;
        this.saveState();
    }
}