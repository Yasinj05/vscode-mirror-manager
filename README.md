# Mirror Manager

Intelligent management of package mirrors for npm, pip, docker, git, apt and more

[![Version](https://img.shields.io/visual-studio-marketplace/v/yasinj05.mirror-manager)](https://marketplace.visualstudio.com/items?itemName=yasinj05.mirror-manager)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/yasinj05.mirror-manager)](https://marketplace.visualstudio.com/items?itemName=yasinj05.mirror-manager)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/yasinj05/vscode-mirror-manager/blob/main/LICENSE)

---

## Features

- Auto-Detect – Finds the fastest mirror automatically
- Auto-Switch – Switches when mirror becomes slow or unavailable
- Multi-Tool – Works with npm, pip, docker, git, apt
- Status Bar – Shows current mirror and latency
- Manual Override – Select any mirror manually
- Diagnostic Report – Full report for troubleshooting
- Background Monitoring – Continuous health checks
- Reset to Default – Restore all tools to their original settings
- Export Mirrors – Save mirror list to JSON, CSV, or Markdown
- Filter by Type – Show only mirrors for specific tools
- Compare Mirrors – Compare two mirrors side by side
- Show History – View previously tested mirrors
- Add Custom Mirror – Manually add a mirror to the list
- Batch Test – Test multiple selected mirrors at once

---

## Installation

### From Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Mirror Manager"
4. Click Install

### From VSIX

Run this command in terminal:

```
code --install-extension mirror-manager-0.0.1.vsix
```

---

## Commands

Press Ctrl+Shift+P and use these commands:

| Command                  | Description                                 |
| ------------------------ | ------------------------------------------- |
| Switch to Fastest Mirror | Find and switch to fastest mirror           |
| Show Status              | Display current mirror status               |
| Diagnose                 | Generate diagnostic report                  |
| Select Mirror Manually   | Pick a mirror from the list                 |
| Refresh Mirrors List     | Reload mirrors from sources                 |
| Disable                  | Disable or enable the extension             |
| Reset to Default         | Restore all tools to their default settings |
| Export Mirrors List      | Save mirror list as JSON, CSV, or Markdown  |
| Filter Mirrors by Type   | Show mirrors for specific tools             |
| Compare Mirrors          | Compare two mirrors side by side            |
| Show History             | View previously tested mirrors              |
| Export Diagnostic Report | Save diagnostic report to a file            |
| Batch Test Mirrors       | Test multiple selected mirrors              |
| Add Custom Mirror        | Manually add a custom mirror                |

---

## Configuration

Go to Settings (Ctrl+,) and search for "mirror-manager":

| Setting           | Default | Description                      |
| ----------------- | ------- | -------------------------------- |
| enable            | true    | Enable or disable extension      |
| autoSwitch        | true    | Auto-switch on slowness          |
| autoCheckInterval | 30      | Health check interval in minutes |
| timeout           | 10000   | Test timeout in milliseconds     |
| logLevel          | info    | error, warn, info, or debug      |

---

## How It Works

1. Loads mirrors from Mirava (https://github.com/MiravaOrg/Mirava)
2. Tests all mirrors in parallel for speed and health
3. Selects the fastest healthy mirror
4. Applies it to your tools (npm, pip, docker, git, apt)
5. Monitors health every 30 minutes in the background
6. Auto-switches if mirror becomes slow or unavailable
7. Reset to default when needed

---

## Requirements

- VS Code 1.70.0 or higher
- Node.js (for npm)
- Python (for pip - optional)
- Docker (for Docker - optional)

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request

Clone and build:

```
git clone https://github.com/yasinj05/vscode-mirror-manager.git
cd mirror-manager
npm install
npm run compile
```

Press F5 to test the extension.

---

## License

MIT License - see the LICENSE file for details.

---

## Support

- Issues: https://github.com/yasinj05/vscode-mirror-manager/issues
- Telegram: https://t.me/yasinj05
