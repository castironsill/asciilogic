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
                const svgOptions = document.getElementById('svg-options');
                const asciiOptions = document.getElementById('ascii-options');
                
                // Clear filename when switching formats (optional - remove if you want to keep it)
                // document.getElementById('export-filename').value = '';
                
                // Hide all options by default
                if (svgOptions) svgOptions.style.display = 'none';
                if (asciiOptions) asciiOptions.style.display = 'none';
                
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
                } else if (format === 'svg') {
                    // Show SVG preview
                    if (this.app.exportManager) {
                        // Check if group elements checkbox is checked
                        const groupCheckbox = document.getElementById('svg-group-elements');
                        const groupElements = groupCheckbox ? groupCheckbox.checked : true;
                        
                        const svgText = this.app.exportManager.exportToSVG(groupElements);
                        if (exportPreview) {
                            // Display SVG as both visual preview and text
                            exportPreview.innerHTML = `
                                <div style="border: 1px solid #333; margin-bottom: 10px; background: #1a1a1a;">
                                    ${svgText}
                                </div>
                                <pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 12px; color: #999; max-height: 200px; overflow: auto;">${svgText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                            `;
                        }
                    }
                    // Show/hide appropriate buttons and options
                    if (copyBtn) copyBtn.style.display = 'block';
                    if (downloadBtn) downloadBtn.style.display = 'block';
                    if (downloadImageBtn) downloadImageBtn.style.display = 'none';
                    if (svgOptions) svgOptions.style.display = 'block';
                } else if (format === 'dxf') {
                    // Show DXF preview
                    if (this.app.exportManager) {
                        const dxfText = this.app.exportManager.exportToDXF();
                        if (exportPreview) {
                            exportPreview.textContent = dxfText;
                        }
                    }
                    // Show/hide appropriate buttons
                    if (copyBtn) copyBtn.style.display = 'block';
                    if (downloadBtn) downloadBtn.style.display = 'block';
                    if (downloadImageBtn) downloadImageBtn.style.display = 'none';
                } else {
                    // Show ASCII preview
                    if (this.app.exportManager) {
                        // Get wrapper options
                        const wrapperOptions = {
                            markdownFence: document.getElementById('ascii-markdown-fence')?.checked || false,
                            commentStyle: document.getElementById('ascii-comment-style')?.checked || false,
                            boxFrame: document.getElementById('ascii-box-frame')?.checked || false
                        };
                        
                        const asciiText = this.app.exportManager.exportToASCII(format === 'ascii-extended', wrapperOptions);
                        if (exportPreview) {
                            exportPreview.textContent = asciiText;
                        }
                    }
                    // Show/hide appropriate buttons and options
                    if (copyBtn) copyBtn.style.display = 'block';
                    if (downloadBtn) downloadBtn.style.display = 'block';
                    if (downloadImageBtn) downloadImageBtn.style.display = 'none';
                    if (asciiOptions) asciiOptions.style.display = 'block';
                }
            });
        });
        
        // SVG group elements checkbox listener
        const svgGroupCheckbox = document.getElementById('svg-group-elements');
        if (svgGroupCheckbox) {
            svgGroupCheckbox.addEventListener('change', () => {
                // Update preview if SVG is currently selected
                const activeFormat = document.querySelector('[data-format].active');
                if (activeFormat && activeFormat.dataset.format === 'svg') {
                    activeFormat.click(); // Re-trigger the format selection to update preview
                }
            });
        }
        
        // ASCII wrapper option listeners
        const asciiOptions = ['ascii-markdown-fence', 'ascii-comment-style', 'ascii-box-frame'];
        asciiOptions.forEach(optionId => {
            const checkbox = document.getElementById(optionId);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    // Update preview if ASCII is currently selected
                    const activeFormat = document.querySelector('[data-format].active');
                    if (activeFormat && (activeFormat.dataset.format === 'ascii-basic' || activeFormat.dataset.format === 'ascii-extended')) {
                        activeFormat.click(); // Re-trigger to update preview
                    }
                });
            }
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
        const asciiOptions = document.getElementById('ascii-options');
        
        if (modal && exportPreview) {
            modal.style.display = 'flex';
            // Auto-load ASCII Basic preview with no wrappers
            if (this.app.exportManager) {
                const basicAscii = this.app.exportManager.exportToASCII(false, {}); // false = basic ASCII, {} = no wrappers
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
            
            // Show ASCII options since ASCII Basic is selected by default
            if (asciiOptions) {
                asciiOptions.style.display = 'block';
            }
            
            // Reset checkboxes
            const checkboxes = ['ascii-markdown-fence', 'ascii-comment-style', 'ascii-box-frame'];
            checkboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) checkbox.checked = false;
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
            // Check which format is active
            const activeFormat = document.querySelector('[data-format].active');
            const formatType = activeFormat ? activeFormat.dataset.format : 'ascii-basic';
            
            let textToCopy;
            
            if (formatType === 'svg') {
                // For SVG, get the actual SVG code
                // Check if group elements checkbox is checked
                const groupCheckbox = document.getElementById('svg-group-elements');
                const groupElements = groupCheckbox ? groupCheckbox.checked : true;
                textToCopy = this.app.exportManager.exportToSVG(groupElements);
            } else {
                // For other formats, get the text content
                // For ASCII formats, regenerate with current options
                if (formatType === 'ascii-basic' || formatType === 'ascii-extended') {
                    const wrapperOptions = {
                        markdownFence: document.getElementById('ascii-markdown-fence')?.checked || false,
                        commentStyle: document.getElementById('ascii-comment-style')?.checked || false,
                        boxFrame: document.getElementById('ascii-box-frame')?.checked || false
                    };
                    textToCopy = this.app.exportManager.exportToASCII(formatType === 'ascii-extended', wrapperOptions);
                } else {
                    textToCopy = exportPreview.textContent;
                }
            }
            
            // Create a temporary textarea to copy from
            const tempTextarea = document.createElement('textarea');
            tempTextarea.value = textToCopy;
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
        const exportPreview = document.getElementById('export-preview');
        const filenameInput = document.getElementById('export-filename');
        
        if (exportPreview) {
            // Check which format is active
            const activeFormat = document.querySelector('[data-format].active');
            const formatType = activeFormat ? activeFormat.dataset.format : 'ascii-basic';
            
            // Get custom filename or generate default
            const customFilename = filenameInput ? filenameInput.value.trim() : '';
            const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            let filename;
            let mimeType = 'text/plain;charset=utf-8';
            let finalContent;
            
            if (formatType === 'svg') {
                // SVG export
                // Check if group elements checkbox is checked
                const groupCheckbox = document.getElementById('svg-group-elements');
                const groupElements = groupCheckbox ? groupCheckbox.checked : true;
                finalContent = this.app.exportManager.exportToSVG(groupElements);
                if (customFilename) {
                    filename = customFilename.endsWith('.svg') ? customFilename : customFilename + '.svg';
                } else {
                    filename = `ascii-drawing_${date}.svg`;
                }
                mimeType = 'image/svg+xml;charset=utf-8';
            } else if (formatType === 'dxf') {
                // DXF export
                finalContent = exportPreview.textContent;
                if (customFilename) {
                    filename = customFilename.endsWith('.dxf') ? customFilename : customFilename + '.dxf';
                } else {
                    filename = `ascii-drawing_${date}.dxf`;
                }
                mimeType = 'application/dxf';
            } else {
                // ASCII export
                const isExtended = formatType === 'ascii-extended';
                const wrapperOptions = {
                    markdownFence: document.getElementById('ascii-markdown-fence')?.checked || false,
                    commentStyle: document.getElementById('ascii-comment-style')?.checked || false,
                    boxFrame: document.getElementById('ascii-box-frame')?.checked || false
                };
                finalContent = this.app.exportManager.exportToASCII(isExtended, wrapperOptions);
                
                if (customFilename) {
                    filename = customFilename.endsWith('.txt') ? customFilename : customFilename + '.txt';
                } else {
                    filename = isExtended ? `ascii-drawing-unicode_${date}.txt` : `ascii-drawing_${date}.txt`;
                }
                // Add UTF-8 BOM for extended ASCII
                finalContent = isExtended ? '\uFEFF' + finalContent : finalContent;
            }
            
            console.log('Downloading with filename:', filename); // Debug log
            
            const blob = new Blob([finalContent], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    
    downloadImage() {
        const exportPreview = document.getElementById('export-preview');
        const filenameInput = document.getElementById('export-filename');
        
        if (exportPreview) {
            const canvas = exportPreview.querySelector('canvas');
            if (canvas) {
                // Get custom filename or generate default
                const customFilename = filenameInput ? filenameInput.value.trim() : '';
                const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
                
                let filename;
                if (customFilename) {
                    // Add .png extension if not present
                    filename = customFilename.endsWith('.png') ? customFilename : customFilename + '.png';
                } else {
                    // Auto-generated name with date
                    filename = `ascii-drawing_${date}.png`;
                }
                
                console.log('Downloading PNG with filename:', filename); // Debug log
                
                // Export at higher quality
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 'image/png', 1.0); // 1.0 = maximum quality
            }
        }
    }
}