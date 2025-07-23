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
        const downloadImage = document.getElementById('download-image');
        
        if (exportClose) {
            exportClose.addEventListener('click', () => this.hideExportModal());
        }
        
        if (exportCopy) {
            exportCopy.addEventListener('click', () => this.copyExport());
        }
        
        if (exportDownload) {
            exportDownload.addEventListener('click', () => this.downloadExport());
        }
        
        if (downloadImage) {
            downloadImage.addEventListener('click', () => this.downloadImage());
        }
        
        // Format buttons in export modal
        const formatButtons = document.querySelectorAll('[data-format]');
        formatButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                formatButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const format = btn.dataset.format;
                
                const exportPreview = document.getElementById('export-preview');
                const copyBtn = document.getElementById('copy-to-clipboard');
                const downloadBtn = document.getElementById('download-file');
                const downloadImageBtn = document.getElementById('download-image');
                
                // Clear filename when switching formats (optional - remove if you want to keep it)
                // document.getElementById('export-filename').value = '';
                
                if (format === 'png') {
                    // Show image preview
                    if (this.app.exportManager) {
                        const canvas = this.app.exportManager.exportToPNG();
                        if (exportPreview) {
                            exportPreview.innerHTML = '';
                            exportPreview.appendChild(canvas);
                        }
                    }
                    // Show/hide appropriate buttons
                    if (copyBtn) copyBtn.style.display = 'none';
                    if (downloadBtn) downloadBtn.style.display = 'none';
                    if (downloadImageBtn) downloadImageBtn.style.display = 'block';
                } else {
                    // Show ASCII preview
                    if (this.app.exportManager) {
                        const asciiText = this.app.exportManager.exportToASCII(format === 'ascii-extended');
                        if (exportPreview) {
                            exportPreview.textContent = asciiText;
                        }
                    }
                    // Show/hide appropriate buttons
                    if (copyBtn) copyBtn.style.display = 'block';
                    if (downloadBtn) downloadBtn.style.display = 'block';
                    if (downloadImageBtn) downloadImageBtn.style.display = 'none';
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
        const exportPreview = document.getElementById('export-preview');
        if (modal && exportPreview) {
            modal.style.display = 'flex';
            // Auto-load ASCII Basic preview
            if (this.app.exportManager) {
                const basicAscii = this.app.exportManager.exportToASCII(false); // false = basic ASCII
                exportPreview.textContent = basicAscii;
            }
            // Reset button states
            const formatButtons = document.querySelectorAll('[data-format]');
            formatButtons.forEach(btn => {
                if (btn.dataset.format === 'ascii-basic') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
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
            // Check which format is active
            const activeFormat = document.querySelector('[data-format].active');
            const isExtended = activeFormat && activeFormat.dataset.format === 'ascii-extended';
            
            // Add UTF-8 BOM for extended ASCII to ensure proper encoding
            const finalText = isExtended ? '\uFEFF' + text : text;
            const blob = new Blob([finalText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = isExtended ? 'ascii-drawing-unicode.txt' : 'ascii-drawing.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    
    downloadImage() {
        const exportPreview = document.getElementById('export-preview');
        if (exportPreview) {
            const canvas = exportPreview.querySelector('canvas');
            if (canvas) {
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'ascii-drawing.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 'image/png');
            }
        }
    }
}