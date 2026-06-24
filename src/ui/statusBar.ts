import * as vscode from "vscode";
import { MirrorStatus, MirrorType } from "../core/enums";
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

  public initialize(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.statusBarItem);
    this.updateStatus();
    this.statusBarItem.show();
  }

  public updateStatus(): void {
    const status = this.mirrorManager.getStatus();
    const applicableTypes = this.mirrorManager.getApplicableMirrorTypes();
    const configuredTypes = applicableTypes.filter(
      (type) => status.selectedMirrorsByType.get(type) !== undefined,
    );

    if (configuredTypes.length === 0) {
      const selectedMirror = status.selectedMirror;
      if (!selectedMirror) {
        this.statusBarItem.text = "$(mirror) No mirror";
        this.statusBarItem.tooltip = "No mirror selected";
        this.statusBarItem.backgroundColor = undefined;
        return;
      }

      this.renderStatusBarItem(selectedMirror, [
        `Mirror: ${selectedMirror.name}`,
        `Latency: ${selectedMirror.latency || "N/A"}ms`,
        `Status: ${selectedMirror.status}`,
      ]);
      return;
    }

    if (configuredTypes.length === 1) {
      const mirror = status.selectedMirrorsByType.get(configuredTypes[0])!;
      this.renderStatusBarItem(mirror, this.buildTypeTooltip(configuredTypes, status));
      return;
    }

    const primaryMirror =
      status.selectedMirror ||
      status.selectedMirrorsByType.get(configuredTypes[0])!;
    this.statusBarItem.text = `$(mirror) ${configuredTypes.length} types`;
    this.statusBarItem.tooltip = this.buildTypeTooltip(configuredTypes, status).join(
      "\n",
    );
    this.statusBarItem.backgroundColor = this.getBackgroundColor(
      primaryMirror.status,
    );
  }

  private buildTypeTooltip(
    types: MirrorType[],
    status: ReturnType<MirrorManager["getStatus"]>,
  ): string[] {
    const lines = ["Configured mirrors:"];
    for (const type of types) {
      const mirror = status.selectedMirrorsByType.get(type);
      if (mirror) {
        lines.push(
          `${type}: ${mirror.name} (${mirror.latency || "N/A"}ms)`,
        );
      }
    }
    return lines;
  }

  private renderStatusBarItem(
    mirror: { name: string; latency?: number; status: MirrorStatus },
    tooltipLines: string[],
  ): void {
    const statusIcon = this.getStatusIcon(mirror.status);
    const latency = mirror.latency || 0;
    const latencyDisplay = latency > 0 ? `${latency}ms` : "N/A";

    this.statusBarItem.text = `${statusIcon} ${mirror.name} ${latencyDisplay}`;
    this.statusBarItem.tooltip = tooltipLines.join("\n");
    this.statusBarItem.backgroundColor = this.getBackgroundColor(mirror.status);
  }

  private getBackgroundColor(
    status: MirrorStatus,
  ): vscode.ThemeColor | undefined {
    if (status === MirrorStatus.HEALTHY) {
      return undefined;
    }
    if (status === MirrorStatus.SLOW) {
      return new vscode.ThemeColor("statusBarItem.warningBackground");
    }
    return new vscode.ThemeColor("statusBarItem.errorBackground");
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
