// js/app.js - Main entry point
import { DrawingApp } from './DrawingApp.js';

// Bump on each release so you can confirm the browser isn't serving a
// stale cached build (a hard refresh — Ctrl+Shift+R — clears it).
export const APP_VERSION = '3.8.0';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new DrawingApp();

    // Make app available globally for debugging (optional)
    window.asciilogic = app;
    app.version = APP_VERSION;

    console.log(`asciilogic v${APP_VERSION} initialized`);
});