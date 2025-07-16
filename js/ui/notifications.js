// js/ui/notifications.js - Notification system

export class NotificationManager {
    constructor() {
        this.addStyles();
    }
    
    show(message, duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'app-notification';
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
    }
    
    addStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .app-notification {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translate(-50%, 20px);
                background: var(--accent);
                color: white;
                padding: 12px 24px;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                z-index: 3000;
                opacity: 0;
                transition: all 0.3s ease-out;
                font-size: 14px;
            }
            
            .app-notification.show {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        `;
        document.head.appendChild(style);
    }
}

// Create singleton instance
export const notifications = new NotificationManager();