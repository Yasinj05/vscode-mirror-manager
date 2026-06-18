import * as vscode from "vscode";
import { MirrorStatus } from "../core/enums";
import { MirrorManager } from "../core/mirrorManager";

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private mirrorManager: MirrorManager;

  constructor(mirrorManager: MirrorManager) {
    this.mirrorManager = mirrorManager;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.statusBarItem.command = "mirror-manager.showStatus";
  }

  public initialize(): void {
    this.updateStatus();
    this.statusBarItem.show();
  }

  public updateStatus(): void {
    const status = this.mirrorManager.getStatus();
    const selectedMirror = status.selectedMirror;

    if (!selectedMirror) {
      this.statusBarItem.text = "$(mirror) No mirror";
      this.statusBarItem.tooltip = "No mirror selected";
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    const statusIcon = this.getStatusIcon(selectedMirror.status);
    const latency = selectedMirror.latency || 0;
    const latencyDisplay = latency > 0 ? `${latency}ms` : "N/A";

    this.statusBarItem.text = `${statusIcon} ${selectedMirror.name} ${latencyDisplay}`;
    this.statusBarItem.tooltip = `Mirror: ${selectedMirror.name}\nLatency: ${latencyDisplay}\nStatus: ${selectedMirror.status}`;

    // Color coding based on status
    if (selectedMirror.status === MirrorStatus.HEALTHY) {
      this.statusBarItem.backgroundColor = undefined;
    } else if (selectedMirror.status === MirrorStatus.SLOW) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    } else {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground",
      );
    }
  }

  private getStatusIcon(status: MirrorStatus): string {
    switch (status) {
      case MirrorStatus.HEALTHY:
        return "$(check)";
      case MirrorStatus.SLOW:
        return "$(watch)";
      case MirrorStatus.UNAVAILABLE:
        return "$(error)";
      case MirrorStatus.ERROR:
        return "$(warning)";
      default:
        return "$(question)";
    }
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
