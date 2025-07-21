// ui/modals.js

export class ModalManager {
    constructor(app) {
        this.app = app;
        this.setupModalListeners();
        this.checkFirstVisit();
    }
    
    checkFirstVisit() {
        // Check if user has visited before
        const hasVisited = localStorage.getItem('asciilogic-visited');
        if (!hasVisited) {
            this.showHelpModal();
            localStorage.setItem('asciilogic-visited', 'true');
        }
    }
    
    setupModalListeners() {
        // Help modal setup
        const helpModal = document.getElementById('help-modal');
        const helpBtn = document.getElementById('help-btn');
        const closeHelp = document.getElementById('close-help');
        
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.showHelpModal());
        }
        
        if (closeHelp) {
            closeHelp.addEventListener('click', () => this.hideHelpModal());
        }
        
        // Import modal setup
        const importModal = document.getElementById('import-modal');
        const importClose = document.getElementById('close-import-modal'); // Fixed ID
        const importCancel = document.getElementById('import-cancel');
        const importConfirm = document.getElementById('import-confirm');
        const importTextarea = document.getElementById('import-textarea');
        
        if (importClose) {
            importClose.addEventListener('click', () => this.hideImportModal());
        }
        
        if (importCancel) {
            importCancel.addEventListener('click', () => this.hideImportModal());
        }
        
        if (importConfirm) {
            importConfirm.addEventListener('click', () => {
                const text = importTextarea.value;
                if (text.trim()) {
                    this.app.importASCII(text);
                    this.hideImportModal();
                }
            });
        }
        
        // Export modal setup
        const exportModal = document.getElementById('export-modal');
        const exportClose = document.getElementById('close-modal'); // Fixed ID
        const exportCopy = document.getElementById('copy-to-clipboard'); // Fixed ID
        const exportDownload = document.getElementById('download-file'); // Fixed ID
        
        if (exportClose) {
            exportClose.addEventListener('click', () => this.hideExportModal());
        }
        
        if (exportCopy) {
            exportCopy.addEventListener('click', () => this.copyExport());
        }
        
        if (exportDownload) {
            exportDownload.addEventListener('click', () => this.downloadExport());
        }
        
        // Format buttons in export modal
        const formatButtons = document.querySelectorAll('[data-format]');
        formatButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                formatButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const format = btn.dataset.format;
                if (this.app.exportManager) {
                    const asciiText = this.app.exportManager.exportToASCII(format === 'ascii-extended');
                    const exportPreview = document.getElementById('export-preview');
                    if (exportPreview) {
                        exportPreview.textContent = asciiText;
                    }
                }
            });
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === importModal) {
                this.hideImportModal();
            }
            if (e.target === exportModal) {
                this.hideExportModal();
            }
            if (e.target === helpModal) {
                this.hideHelpModal();
            }
        });
    }
    
    showHelpModal() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    hideHelpModal() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    showImportModal() {
        const modal = document.getElementById('import-modal');
        const textarea = document.getElementById('import-textarea');
        if (modal && textarea) {
            modal.style.display = 'flex';
            textarea.value = '';
            textarea.focus();
        }
    }
    
    hideImportModal() {
        const modal = document.getElementById('import-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    showExportModal(asciiText) {
        const modal = document.getElementById('export-modal');
        const exportPreview = document.getElementById('export-preview'); // Changed from export-textarea
        if (modal && exportPreview) {
            modal.style.display = 'flex';
            exportPreview.textContent = asciiText; // Use textContent for div
        }
    }
    
    hideExportModal() {
        const modal = document.getElementById('export-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    copyExport() {
        const exportPreview = document.getElementById('export-preview'); // Changed from export-textarea
        if (exportPreview) {
            const text = exportPreview.textContent;
            
            // Create a temporary textarea to copy from
            const tempTextarea = document.createElement('textarea');
            tempTextarea.value = text;
            tempTextarea.style.position = 'fixed';
            tempTextarea.style.opacity = '0';
            document.body.appendChild(tempTextarea);
            tempTextarea.select();
            document.execCommand('copy');
            document.body.removeChild(tempTextarea);
            
            // Show copy feedback
            const copyBtn = document.getElementById('copy-to-clipboard');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    }
    
    downloadExport() {
        const exportPreview = document.getElementById('export-preview'); // Changed from export-textarea
        if (exportPreview) {
            const text = exportPreview.textContent;
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ascii-drawing.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
}