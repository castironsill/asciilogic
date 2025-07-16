export class TextTool {
    constructor(app) {
        this.app = app;
    }
    
    handleMouseDown(x, y, e) {
        const rect = this.app.mainCanvas.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        this.app.startTextInput(clickX, clickY, x, y);
    }
    
    handleMouseMove(x, y, e) {
        // Text tool doesn't need mouse move handling
    }
    
    handleMouseUp(x, y, e) {
        // Text tool doesn't need mouse up handling
    }
    
    getCursor() {
        return 'text';
    }
}