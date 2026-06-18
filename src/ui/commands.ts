import * as vscode from "vscode";
import { logger } from "../utils/logger";
import { MirrorManager } from "../core/mirrorManager";
import { StatusBarManager } from "./statusBar";
import { MirrorStatus } from "../core/enums";

export class CommandManager {
  private mirrorManager: MirrorManager;
  private statusBarManager: StatusBarManager;

  constructor(
    mirrorManager: MirrorManager,
    statusBarManager: StatusBarManager,
  ) {
    this.mirrorManager = mirrorManager;
    this.statusBarManager = statusBarManager;
  }

  public registerCommands(context: vscode.ExtensionContext): void {
    const showStatus = vscode.commands.registerCommand(
      "mirror-manager.showStatus",
      async () => {
        await this.showStatus();
      },
    );

    const switchToFastest = vscode.commands.registerCommand(
      "mirror-manager.switchToFastest",
      async () => {
        await this.switchToFastest();
      },
    );

    const diagnose = vscode.commands.registerCommand(
      "mirror-manager.diagnose",
      async () => {
        await this.diagnose();
      },
    );

    const selectManually = vscode.commands.registerCommand(
      "mirror-manager.selectManually",
      async () => {
        await this.selectManually();
      },
    );

    const refreshList = vscode.commands.registerCommand(
      "mirror-manager.refreshList",
      async () => {
        await this.refreshList();
      },
    );

    const disable = vscode.commands.registerCommand(
      "mirror-manager.disable",
      async () => {
        await this.disable();
      },
    );

    context.subscriptions.push(
      showStatus,
      switchToFastest,
      diagnose,
      selectManually,
      refreshList,
      disable,
    );
  }

  private async showStatus(): Promise<void> {
    try {
      const status = this.mirrorManager.getStatus();
      const selectedMirror = status.selectedMirror;

      let message = "Mirror Manager Status:\n";
      message += `\n📊 Total Mirrors: ${status.mirrors.length}`;
      message += `\n🔍 Selected: ${selectedMirror ? selectedMirror.name : "None"}`;

      if (selectedMirror) {
        message += `\n   📍 URL: ${selectedMirror.url}`;
        message += `\n   ⚡ Latency: ${selectedMirror.latency || "N/A"}ms`;
        message += `\n   📊 Status: ${selectedMirror.status}`;
      }

      message += `\n\n🔄 Last Test: ${status.lastTest ? status.lastTest.toLocaleString() : "Never"}`;
      message += `\n📊 Manager State: ${status.status}`;

      vscode.window.showInformationMessage("Mirror Manager Status", {
        detail: message,
        modal: false,
      });

      logger.info(message);
      logger.show();
    } catch (error) {
      logger.error("Error showing status:", error);
      vscode.window.showErrorMessage("Failed to get mirror status");
    }
  }

  private async switchToFastest(): Promise<void> {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Testing mirrors...",
          cancellable: false,
        },
        async () => {
          const fastest = await this.mirrorManager.testAndSelectBestMirror();

          if (fastest) {
            vscode.window.showInformationMessage(
              `✅ Switched to fastest mirror: ${fastest.name} (${fastest.latency}ms)`,
            );
            this.statusBarManager.updateStatus();
          } else {
            vscode.window.showErrorMessage("❌ No healthy mirrors found!");
          }
        },
      );
    } catch (error) {
      logger.error("Error switching to fastest mirror:", error);
      vscode.window.showErrorMessage("Failed to switch to fastest mirror");
    }
  }
  private async diagnose(): Promise<void> {
    try {
      const status = this.mirrorManager.getStatus();
      const mirrors = status.mirrors;

      let report = "🔍 Mirror Manager Diagnostic Report\n";
      report += "=".repeat(50) + "\n\n";

      report += `📊 Total Mirrors: ${mirrors.length}\n`;

      // ✅ استفاده از enum برای مقایسه
      const healthy = mirrors.filter((m) => m.status === MirrorStatus.HEALTHY);
      const slow = mirrors.filter((m) => m.status === MirrorStatus.SLOW);
      const unavailable = mirrors.filter(
        (m) => m.status === MirrorStatus.UNAVAILABLE,
      );
      const unknown = mirrors.filter((m) => m.status === MirrorStatus.UNKNOWN);
      const error = mirrors.filter((m) => m.status === MirrorStatus.ERROR);

      report += `✅ Healthy Mirrors: ${healthy.length}\n`;
      report += `⚠️ Slow Mirrors: ${slow.length}\n`;
      report += `❌ Unavailable Mirrors: ${unavailable.length}\n`;
      report += `❓ Unknown Mirrors: ${unknown.length}\n`;
      report += `💥 Error Mirrors: ${error.length}\n\n`;

      report += "📋 Mirror Details:\n";
      report += "-".repeat(50) + "\n";

      for (const mirror of mirrors) {
        // ✅ استفاده از enum برای تعیین آیکون
        let statusIcon: string;
        switch (mirror.status) {
          case MirrorStatus.HEALTHY:
            statusIcon = "✅";
            break;
          case MirrorStatus.SLOW:
            statusIcon = "⚠️";
            break;
          case MirrorStatus.UNAVAILABLE:
            statusIcon = "❌";
            break;
          case MirrorStatus.ERROR:
            statusIcon = "💥";
            break;
          default:
            statusIcon = "❓";
        }

        report += `${statusIcon} ${mirror.name}\n`;
        report += `   📍 URL: ${mirror.url}\n`;
        report += `   ⚡ Latency: ${mirror.latency || "N/A"}ms\n`;
        report += `   📊 Status: ${mirror.status}\n`;
        report += `   🏷️ Type: ${mirror.type.join(", ")}\n`;

        if (mirror.error) {
          report += `   ❗ Error: ${mirror.error}\n`;
        }

        report += "\n";
      }

      logger.info(report);
      logger.show();

      vscode.window.showInformationMessage(
        "✅ Diagnostic report generated. Check Output panel.",
      );
    } catch (error) {
      logger.error("Error running diagnose:", error);
      vscode.window.showErrorMessage("Failed to run diagnosis");
    }
  }

  private async selectManually(): Promise<void> {
    try {
      const mirrors = this.mirrorManager.getAllMirrors();
      const items = mirrors.map((m) => ({
        label: `${m.name} (${m.latency || "N/A"}ms)`,
        description: m.url,
        url: m.url,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a mirror to use",
        matchOnDescription: true,
      });

      if (selected) {
        const result = await this.mirrorManager.selectMirrorManually(
          selected.url,
        );
        if (result) {
          vscode.window.showInformationMessage(
            `✅ Selected mirror: ${result.name}`,
          );
          this.statusBarManager.updateStatus();
        } else {
          vscode.window.showErrorMessage("❌ Mirror is not reachable");
        }
      }
    } catch (error) {
      logger.error("Error selecting mirror manually:", error);
      vscode.window.showErrorMessage("Failed to select mirror");
    }
  }

  private async refreshList(): Promise<void> {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Refreshing mirrors list...",
          cancellable: false,
        },
        async () => {
          await this.mirrorManager.refreshMirrors();
          this.statusBarManager.updateStatus();
          vscode.window.showInformationMessage(
            "✅ Mirrors list refreshed successfully!",
          );
        },
      );
    } catch (error) {
      logger.error("Error refreshing mirrors:", error);
      vscode.window.showErrorMessage("Failed to refresh mirrors");
    }
  }

  private async disable(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("mirror-manager");
      const current = config.get("enable", true);
      await config.update(
        "enable",
        !current,
        vscode.ConfigurationTarget.Global,
      );

      vscode.window.showInformationMessage(
        current ? "Mirror Manager disabled" : "Mirror Manager enabled",
      );

      this.statusBarManager.updateStatus();
    } catch (error) {
      logger.error("Error disabling/enabling:", error);
      vscode.window.showErrorMessage("Failed to change state");
    }
  }
}
