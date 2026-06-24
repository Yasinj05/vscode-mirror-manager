# Mirror Manager

Intelligent management of package mirrors for npm, pip, Docker, Git, APT, and more — right inside VS Code and Cursor.

[![Version](https://img.shields.io/visual-studio-marketplace/v/yasinj05.mirror-manager)](https://marketplace.visualstudio.com/items?itemName=yasinj05.mirror-manager)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/yasinj05.mirror-manager)](https://marketplace.visualstudio.com/items?itemName=yasinj05.mirror-manager)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/yasinj05/vscode-mirror-manager/blob/main/LICENSE)

---

## Features

- **Per-type control** — Switch or reset mirrors independently for npm, pip, Docker, Git, and APT
- **Auto-detect** — Finds the fastest healthy mirror on startup
- **Auto-switch** — Switches when a mirror becomes slow or unavailable
- **Multi-tool** — Applies settings to npm, pip, Docker, Git, and APT
- **Status bar** — Shows the active mirror and per-type assignments
- **Manual override** — Pick any mirror for a specific tool type
- **Diagnostic report** — Full health report for troubleshooting
- **Background monitoring** — Periodic health checks in the background
- **Selective reset** — Restore one tool or all tools to default settings
- **Export mirrors** — Save the mirror list as JSON, CSV, or Markdown
- **Filter by type** — Browse mirrors that support a given tool
- **Compare mirrors** — Compare two mirrors side by side
- **Test history** — View previously tested mirrors
- **Custom mirrors** — Add your own mirror to the list
- **Batch test** — Test multiple mirrors at once

---

## Installation

### From Marketplace

1. Open VS Code or Cursor
2. Go to **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **Mirror Manager**
4. Click **Install**

### From VSIX

```bash
code --install-extension mirror-manager-0.0.1.vsix
```

For Cursor:

```bash
cursor --install-extension mirror-manager-0.0.1.vsix
```

---

## Quick Start

1. Install the extension and reload the window.
2. On startup, Mirror Manager loads mirrors from [Mirava](https://github.com/MiravaOrg/Mirava), tests them, and applies the fastest one to your enabled integrations.
3. Check the status bar (bottom-right) for the current mirror.
4. Open **Output → Mirror Manager** for detailed logs.

---

## Per-Type Mirror Control

Mirror Manager lets you configure each tool separately. For example, you can use one mirror for **npm** and a different mirror for **pip** without affecting Docker or Git.

### Switch to fastest (by type)

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **Mirror Manager: Switch to Fastest Mirror (by Type)**
3. Choose a type: npm, pip, Docker, Git, or APT
4. The extension tests mirrors that support that type and applies the fastest one

### Select mirror manually (by type)

1. Run **Mirror Manager: Select Mirror Manually (by Type)**
2. Choose a mirror type
3. Pick a mirror from the filtered list
4. Only that tool's configuration is updated

### Reset to default (by type)

1. Run **Mirror Manager: Reset to Default (by Type)**
2. Select one or more types, or choose **All integrations**
3. Confirm the reset

| Type   | What gets reset                                      |
| ------ | ---------------------------------------------------- |
| npm    | `npm config delete registry`                         |
| pip    | `pip config unset global.index-url`                  |
| Git    | Removes GitHub `url.insteadOf` mirror redirect       |
| Docker | Clears `registry-mirrors` from `daemon.json`         |
| APT    | Restores `sources.list` from backup (if available)   |

---

## Commands

Press `Ctrl+Shift+P` / `Cmd+Shift+P` and search for **Mirror Manager**:

| Command | Description |
| ------- | ----------- |
| Show Status | Display mirror status per tool type |
| Switch to Fastest Mirror (by Type) | Test and apply the fastest mirror for a chosen type |
| Select Mirror Manually (by Type) | Pick a mirror for a specific tool type |
| Reset to Default (by Type) | Reset one or more tool types to defaults |
| Diagnose | Generate a diagnostic report in the Output panel |
| Refresh Mirrors List | Reload mirrors from external sources |
| Disable | Toggle the extension on or off |
| Export Mirrors List | Export mirrors as JSON, CSV, or Markdown |
| Filter Mirrors by Type | List mirrors that support a given type |
| Compare Mirrors | Compare latency between two mirrors |
| Show History | View previously tested mirrors |
| Export Diagnostic Report | Save a diagnostic report to a file |
| Batch Test Mirrors | Test multiple selected mirrors |
| Add Custom Mirror | Add a custom mirror to the list |

---

## Configuration

Open **Settings** (`Ctrl+,` / `Cmd+,`) and search for `mirror-manager`:

| Setting | Default | Description |
| ------- | ------- | ----------- |
| `mirror-manager.enable` | `true` | Enable or disable the extension |
| `mirror-manager.autoSwitch` | `true` | Auto-switch when the current mirror is slow or unavailable |
| `mirror-manager.autoCheckInterval` | `30` | Background health check interval in minutes |
| `mirror-manager.timeout` | `10000` | Mirror test timeout in milliseconds |
| `mirror-manager.logLevel` | `info` | Log level: `error`, `warn`, `info`, or `debug` |
| `mirror-manager.integrations` | see below | Enable or disable each tool integration |

### Integrations (default)

```json
{
  "npm": true,
  "pip": true,
  "docker": true,
  "git": true,
  "apt": false,
  "maven": false,
  "go": false,
  "composer": false,
  "nuget": false
}
```

Only enabled integrations appear in the mirror-type picker and receive settings on startup.

---

## How It Works

1. **Load** — Fetches mirrors from [Mirava](https://github.com/MiravaOrg/Mirava) (with a built-in fallback list)
2. **Test** — Checks mirrors in parallel for reachability and latency
3. **Select** — Picks the fastest healthy mirror
4. **Apply** — Writes settings to npm, pip, Docker, Git, and/or APT
5. **Monitor** — Re-checks health on the configured interval
6. **Switch** — Auto-switches if the mirror becomes unavailable or much slower

On startup, one mirror is applied across all **enabled** integrations. Manual commands let you override individual types without affecting the others.

---

## Status Bar

The status bar item shows:

- The active mirror name and latency when one type is configured
- `N types` when different mirrors are set per tool — hover for details

Click the status bar item to open **Show Status**.

---

## Requirements

- VS Code **1.70.0+** or Cursor
- **Node.js** — for npm integration
- **Python / pip** — optional, for pip integration
- **Docker** — optional, for Docker integration
- **Git** — optional, for Git integration

> **Note:** Docker and APT changes may require elevated permissions or a daemon restart. Check the **Mirror Manager** output channel for details.

---

## Development

```bash
git clone https://github.com/yasinj05/vscode-mirror-manager.git
cd vscode-mirror-manager
npm install
npm run compile
```

Press **F5** to launch an Extension Development Host.

Build a VSIX package:

```bash
npm run package
npx @vscode/vsce package
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Support

- **Issues:** https://github.com/yasinj05/vscode-mirror-manager/issues
- **Telegram:** https://t.me/yasinj05
