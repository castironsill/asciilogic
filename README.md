# asciilogic

A powerful browser-based ASCII diagram tool for creating logic diagrams, flowcharts, elevator schematics, and technical documentation. Create clean ASCII diagrams that can be embedded directly in code, documentation, or emails.

🌐 **Live Demo: [https://asciilogic.com](https://asciilogic.com)**

## ✨ Features

- **Drawing Tools**
  - 📏 Lines with automatic 90° bends
  - ➡️ Directional arrows
  - ⬜ Boxes and rectangles
  - 📝 Text with adjustable font sizes

- **Smart Editing**
  - 🎯 Grid snapping for perfect alignment
  - 🔄 Multi-selection and group operations
  - ↩️ Undo/Redo functionality
  - 💾 Auto-save to browser storage

- **Import/Export**
  - 📤 Export to ASCII (Basic and Extended Unicode)
  - 📥 Import existing ASCII diagrams
  - 📋 Copy to clipboard functionality

- **Navigation**
  - 🔍 Zoom and pan controls
  - 🎯 Fit to content
  - ⌨️ Keyboard shortcuts

## 🚀 Quick Start

Visit [asciilogic.com](https://asciilogic.com) to start creating diagrams instantly - no installation required!

## ⌨️ Keyboard Shortcuts

- `V` - Select tool
- `L` - Line tool
- `A` - Arrow tool
- `B` - Box tool
- `T` - Text tool
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+S` - Save
- `Delete` - Delete selected
- `Shift+Drag` - Pan canvas

## 🎯 Use Cases

- **Software Documentation** - Embed diagrams directly in code comments
- **Network Diagrams** - Show system architecture and data flow
- **Elevator Control Systems** - Document shaft layouts and control logic
- **State Machines** - Create clear state transition diagrams
- **Flowcharts** - Design process flows and decision trees
- **README Files** - Add visual diagrams to your GitHub projects

## 📸 Example Output

```
┌─────────────┐         ┌─────────────┐
│   Client    │────────▶│   Server    │
└─────────────┘         └─────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌─────────────┐         ┌─────────────┐
│   Browser   │         │  Database   │
└─────────────┘         └─────────────┘
```

## 🛠️ Development

### Prerequisites
- Modern web browser
- VS Code (recommended)
- Live Server extension

### Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/castironsill/asciilogic.git
   cd asciilogic
   ```

2. Open in VS Code
   ```bash
   code .
   ```

3. Install Live Server extension in VS Code

4. Right-click on `index.html` → "Open with Live Server"

5. Start developing! The page will auto-refresh on changes.

### Project Structure

```
asciilogic/
├── index.html          # Main HTML file
├── css/
│   └── style.css      # Styles
├── js/
│   ├── app.js         # Entry point
│   ├── DrawingApp.js  # Main application
│   ├── core/          # Core functionality
│   ├── tools/         # Drawing tools
│   ├── ui/            # UI components
│   └── utils/         # Utilities
└── README.md
```

## 🌐 Deployment

This project is deployed on GitHub Pages with a custom domain.

### Deploy Your Own

1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Select source: Deploy from branch (main)
4. Your site will be available at `https://[username].github.io/asciilogic`

### Custom Domain Setup

1. Add a `CNAME` file with your domain
2. Configure DNS A records to GitHub's IPs
3. Enable HTTPS in GitHub Pages settings

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

Built with vanilla JavaScript for maximum performance and compatibility. Designed for engineers and developers who need quick, clean ASCII diagrams.

---

Made with ❤️ for the developer community. If you find this tool useful, please ⭐ star this repository!