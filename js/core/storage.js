export class Storage {
    constructor(app) {
        this.app = app;
        this.storageKey = 'asciilogic-drawing';
    }
    
    save() {
        const data = {
            elements: this.app.elements,
            zoom: this.app.zoom,
            offsetX: this.app.offsetX,
            offsetY: this.app.offsetY,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    }
    
    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return false;
            
            const data = JSON.parse(stored);
            this.app.elements = data.elements || [];
            this.app.zoom = data.zoom || 1;
            this.app.offsetX = data.offsetX || 0;
            this.app.offsetY = data.offsetY || 0;
            
            return true;
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return false;
        }
    }
    
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
            return false;
        }
    }
    
    hasData() {
        return localStorage.getItem(this.storageKey) !== null;
    }
}