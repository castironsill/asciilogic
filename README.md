# asciilogic

A powerful browser-based ASCII diagram tool for creating logic diagrams, flowcharts, elevator schematics, and technical documentation. Create clean ASCII diagrams that can be embedded directly in code, documentation, or emails.

🌐 **Live Demo: [https://asciilogic.com](https://asciilogic.com)**

## ✨ Features

- **Drawing Tools**
  - 📏 Lines with automatic 90° bends and multiple styles (solid, dashed, dotted)
  - ➡️ Directional arrows with line styles
  - ⬜ Boxes with fills (solid colors, hatching patterns)
  - ⭕ Circles and ellipses with the same fill/pattern/color options
  - 📝 Text with adjustable font sizes
  - 🎨 Color picker for all elements (8 color options)

- **Smart Editing**
  - 🎯 Grid snapping for perfect alignment
  - 👁️ Grid toggle - hide/show grid while preserving snap settings
  - 📋 Copy/Paste functionality (Ctrl+C/V) with cursor positioning
  - 🔄 Multi-selection and group operations
  - ↩️ Undo/Redo functionality
  - 💾 Auto-save to browser storage

- **Box Styling**
  - 🎨 Fill options: None, Solid, or Pattern
  - 📐 Pattern types: Diagonal, Crosshatch, Horizontal, Vertical, Dots (Light/Medium/Dense)
  - 🌈 All patterns respect element colors
  - 👻 Semi-transparent fills to see overlapped content

- **Import/Export**
  - 📤 Export to multiple formats:
    - ASCII Basic & Extended Unicode
    - PNG (high-resolution)
    - SVG (scalable, with patterns)
    - DXF (for CAD software)
  - 📥 Import existing ASCII diagrams
  - 📋 Copy to clipboard functionality
  - 🎁 Export wrappers (Markdown fence, C-style comments, decorative box)

- **Navigation**
  - 🔍 Zoom and pan controls
  - 🎯 Fit to content
  - ⌨️ Keyboard shortcuts
  - 🖱️ Middle-mouse pan

## 🚀 Quick Start

Visit [asciilogic.com](https://asciilogic.com) to start creating diagrams instantly - no installation required!

## ⌨️ Keyboard Shortcuts

- `V` - Select tool
- `L` - Line tool
- `A` - Arrow tool
- `B` - Box tool
- `C` - Ellipse / circle tool
- `T` - Text tool
- `Ctrl+C` - Copy selected elements
- `Ctrl+V` - Paste at cursor position
- `Ctrl+D` - Duplicate selected elements
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+S` - Save
- `Delete` - Delete selected
- `Shift+Drag` - Pan canvas

## 🎨 New Features

### Box Fills & Patterns
Create visually distinct boxes with various fill styles:
- Solid fills with transparency
- Hatching patterns for technical diagrams
- All patterns respect the selected color
- Perfect for highlighting different components

### Smart Copy/Paste
- Copy elements with `Ctrl+C`
- Paste at current cursor position with `Ctrl+V`
- Maintains relative positions for multiple elements
- Quick duplicate with `Ctrl+D`

### Grid Toggle
- Click the grid icon or set grid size to 0 to hide grid
- Elements still snap to invisible grid
- Better visibility for filled/patterned boxes

### Enhanced Line Styles
- Solid, dashed, and dotted lines
- Styles available for both lines and arrows
- Exported correctly in all formats

## 🎯 Use Cases

- **Software Documentation** - Embed diagrams directly in code comments
- **Network Diagrams** - Show system architecture and data flow
- **Elevator Control Systems** - Document shaft layouts and control logic
- **State Machines** - Create clear state transition diagrams with styled boxes
- **Flowcharts** - Design process flows with visual distinction
- **Technical Schematics** - Use patterns to indicate different materials or states
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

With patterns and colors, you can create more expressive diagrams:
- Filled boxes for emphasis
- Hatched patterns for different component types
- Colored elements for better visual organization

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

### Testing

The shipped site has **zero runtime dependencies**. Tests are dev-only and run
on the pure logic modules (geometry, ASCII export/import) via [Vitest](https://vitest.dev/):

```bash
npm install   # one-time, installs devDependencies (vitest, jsdom)
npm test      # run the suite once
npm run test:watch  # re-run on change
```

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
│       ├── export.js  # Export functionality
│       ├── grid.js    # Grid system
│       ├── lineStyles.js    # Line styling
│       └── boxStyles.js     # Box styling
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

## 🚨 Browser Compatibility

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Any modern browser with Canvas support

SVG exports are optimized for cross-browser compatibility.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

### Recent Contributors
Thank you to everyone who has helped improve asciilogic!

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Inspired by [ASCIIFlow](https://asciiflow.com) - a fantastic ASCII diagram tool
- Built with vanilla JavaScript for maximum performance and compatibility
- Designed for engineers and developers who need quick, clean ASCII diagrams
- Special thanks to the community for feature requests and bug reports

## 🎉 What's New

### Version 2.0 (Latest)
- 🎨 Box fills and patterns with color support
- 📋 Copy/paste functionality with smart positioning
- 👁️ Grid toggle for better visibility
- 🔀 Multiple line styles (solid, dashed, dotted)
- 🖼️ Enhanced export formats with proper style support
- 🛠️ Fixed grid size 0 handling for all exports

---

Made with ❤️ for the developer community. If you find this tool useful, please ⭐ star this repository!