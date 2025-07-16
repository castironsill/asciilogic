// js/app.js - Main entry point
import { DrawingApp } from './DrawingApp.js';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new DrawingApp();
    
    // Make app available globally for debugging (optional)
    window.asciilogic = app;
    
    console.log('asciilogic initialized');
});