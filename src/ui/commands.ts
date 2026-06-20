import * as vscode from "vscode";
import * as fs from "fs-extra";
import { logger } from "../utils/logger";
import { MirrorManager } from "../core/mirrorManager";
import { StatusBarManager } from "./statusBar";
import { MirrorStatus, MirrorType } from "../core/enums";
import { Mirror } from "../core/types";

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

    const resetToDefault = vscode.commands.registerCommand(
      "mirror-manager.resetToDefault",
      async () => {
        await this.resetToDefault();
      },
    );

    const exportMirrors = vscode.commands.registerCommand(
      "mirror-manager.exportMirrors",
      async () => {
        await this.exportMirrors();
      },
    );

    const filterByType = vscode.commands.registerCommand(
      "mirror-manager.filterByType",
      async () => {
        await this.filterByType();
      },
    );

    const compareMirrors = vscode.commands.registerCommand(
      "mirror-manager.compareMirrors",
      async () => {
        await this.compareMirrors();
      },
    );

    const showHistory = vscode.commands.registerCommand(
      "mirror-manager.showHistory",
      async () => {
        await this.showHistory();
      },
    );

    const exportDiagnostic = vscode.commands.registerCommand(
      "mirror-manager.exportDiagnostic",
      async () => {
        await this.exportDiagnostic();
      },
    );

    const batchTest = vscode.commands.registerCommand(
      "mirror-manager.batchTest",
      async () => {
        await this.batchTestMirrors();
      },
    );

    const addCustomMirror = vscode.commands.registerCommand(
      "mirror-manager.addCustomMirror",
      async () => {
        await this.addCustomMirror();
      },
    );

    context.subscriptions.push(
      showStatus,
      switchToFastest,
      diagnose,
      selectManually,
      refreshList,
      disable,
      resetToDefault,
      exportMirrors,
      filterByType,
      compareMirrors,
      showHistory,
      exportDiagnostic,
      batchTest,
      addCustomMirror,
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

  private async resetToDefault(): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        "This will reset npm, pip, docker, and git to their default settings. Continue?",
        { modal: true },
        "Yes",
        "Cancel",
      );

      if (confirm !== "Yes") {
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Resetting to default settings...",
          cancellable: false,
        },
        async () => {
          const { exec } = require("child_process");

          await new Promise((resolve) => {
            exec("npm config delete registry", (error: Error | null) => {
              if (error) {
                logger.warn("Failed to reset npm:", error.message);
              } else {
                logger.info("✅ npm reset to default");
              }
              resolve(null);
            });
          });

          await new Promise((resolve) => {
            exec("pip config unset global.index-url", (error: Error | null) => {
              if (error) {
                logger.warn("Failed to reset pip:", error.message);
              } else {
                logger.info("✅ pip reset to default");
              }
              resolve(null);
            });
          });

          await new Promise((resolve) => {
            exec(
              "git config --global --unset url.https://github.com.insteadOf",
              (error: Error | null) => {
                if (error) {
                  logger.warn("Failed to reset git:", error.message);
                } else {
                  logger.info("✅ git reset to default");
                }
                resolve(null);
              },
            );
          });

          try {
            const dockerConfigPath =
              process.platform === "win32"
                ? "C:\\ProgramData\\docker\\config\\daemon.json"
                : "/etc/docker/daemon.json";

            if (await fs.pathExists(dockerConfigPath)) {
              const config = await fs.readJson(dockerConfigPath);
              if (config["registry-mirrors"]) {
                delete config["registry-mirrors"];
                await fs.writeJson(dockerConfigPath, config, { spaces: 2 });
                logger.info("✅ docker reset to default");
                logger.warn("⚠️ Docker daemon restart may be required");
              }
            }
          } catch (error) {
            logger.warn("Failed to reset docker:", error);
          }

          const status = this.mirrorManager.getStatus();
          status.selectedMirror = null;
          this.statusBarManager.updateStatus();

          vscode.window.showInformationMessage(
            "✅ All tools reset to default settings!",
          );
        },
      );
    } catch (error) {
      logger.error("Error resetting to default:", error);
      vscode.window.showErrorMessage("Failed to reset to default settings");
    }
  }

  private async exportMirrors(): Promise<void> {
    try {
      const status = this.mirrorManager.getStatus();
      const mirrors = status.mirrors;

      const format = await vscode.window.showQuickPick(
        ["JSON", "CSV", "Markdown"],
        { placeHolder: "Select export format" },
      );

      if (!format) return;

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`mirrors.${format.toLowerCase()}`),
        filters: {
          [format]: [format.toLowerCase()],
        },
      });

      if (!uri) return;

      let content = "";
      switch (format) {
        case "JSON":
          content = JSON.stringify(mirrors, null, 2);
          break;
        case "CSV":
          content =
            "Name,URL,Status,Latency\n" +
            mirrors
              .map(
                (m) => `${m.name},${m.url},${m.status},${m.latency || "N/A"}`,
              )
              .join("\n");
          break;
        case "Markdown":
          content = "| Name | URL | Status | Latency |\n";
          content += "|------|-----|--------|---------|\n";
          content += mirrors
            .map(
              (m) =>
                `| ${m.name} | ${m.url} | ${m.status} | ${m.latency || "N/A"}ms |`,
            )
            .join("\n");
          break;
      }

      await fs.writeFile(uri.fsPath, content);
      vscode.window.showInformationMessage(
        `✅ Mirrors exported to ${uri.fsPath}`,
      );
    } catch (error) {
      logger.error("Error exporting mirrors:", error);
      vscode.window.showErrorMessage("Failed to export mirrors");
    }
  }

  private async filterByType(): Promise<void> {
    try {
      const allMirrors = this.mirrorManager.getAllMirrors();
      const types = [
        "npm",
        "pip",
        "docker",
        "git",
        "apt",
        "maven",
        "go",
        "general",
      ];

      const selected = await vscode.window.showQuickPick(types, {
        placeHolder: "Filter mirrors by type",
      });

      if (!selected) return;

      const filtered = allMirrors.filter((m) =>
        m.type.some((t) => t.toLowerCase() === selected.toLowerCase()),
      );

      if (filtered.length === 0) {
        vscode.window.showInformationMessage(
          `No mirrors found for type: ${selected}`,
        );
        return;
      }

      let message = `📊 Mirrors supporting ${selected}:\n\n`;
      message += filtered
        .map((m) => `  • ${m.name} (${m.latency || "N/A"}ms) - ${m.status}`)
        .join("\n");

      vscode.window.showInformationMessage(message, {
        modal: true,
        detail: message,
      });
    } catch (error) {
      logger.error("Error filtering mirrors:", error);
      vscode.window.showErrorMessage("Failed to filter mirrors");
    }
  }

  private async compareMirrors(): Promise<void> {
    try {
      const mirrors = this.mirrorManager.getAllMirrors();
      const items = mirrors.map((m) => ({
        label: `${m.name} (${m.latency || "N/A"}ms)`,
        description: m.url,
        url: m.url,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select first mirror",
        canPickMany: true,
        matchOnDescription: true,
      });

      if (!selected || selected.length < 2) {
        vscode.window.showErrorMessage("Please select at least 2 mirrors");
        return;
      }

      const [first, second] = selected;
      let message = "🔍 Mirror Comparison:\n\n";
      message += `📌 ${first.label}\n`;
      message += `   URL: ${first.description}\n\n`;
      message += `📌 ${second.label}\n`;
      message += `   URL: ${second.description}\n\n`;

      const firstMirror = mirrors.find((m) => m.url === first.url);
      const secondMirror = mirrors.find((m) => m.url === second.url);

      if (firstMirror?.latency && secondMirror?.latency) {
        const diff = Math.abs(firstMirror.latency - secondMirror.latency);
        const faster =
          firstMirror.latency < secondMirror.latency
            ? firstMirror.name
            : secondMirror.name;
        message += `⚡ Latency Difference: ${diff}ms\n`;
        message += `🏆 Faster: ${faster}`;
      }

      vscode.window.showInformationMessage(message, {
        modal: true,
        detail: message,
      });
    } catch (error) {
      logger.error("Error comparing mirrors:", error);
      vscode.window.showErrorMessage("Failed to compare mirrors");
    }
  }

  private async showHistory(): Promise<void> {
    try {
      const status = this.mirrorManager.getStatus();
      const history = status.testCache;

      if (history.size === 0) {
        vscode.window.showInformationMessage("No mirror history available");
        return;
      }

      let message = "📊 Mirror Test History:\n\n";
      let index = 1;
      for (const [url, result] of history) {
        message += `${index}. ${result.mirror.name}\n`;
        message += `   URL: ${url}\n`;
        message += `   Status: ${result.mirror.status}\n`;
        message += `   Latency: ${result.latency}ms\n`;
        message += `   Last Tested: ${result.mirror.lastTested?.toLocaleString() || "N/A"}\n\n`;
        index++;
      }

      vscode.window.showInformationMessage(message, {
        modal: true,
        detail: message,
      });
    } catch (error) {
      logger.error("Error showing history:", error);
      vscode.window.showErrorMessage("Failed to show history");
    }
  }

  private async exportDiagnostic(): Promise<void> {
    try {
      const status = this.mirrorManager.getStatus();
      const mirrors = status.mirrors;

      let report = "🔍 Mirror Manager Diagnostic Report\n";
      report += "=".repeat(50) + "\n\n";
      report += `Generated: ${new Date().toLocaleString()}\n\n`;

      report += `📊 Total Mirrors: ${mirrors.length}\n`;
      const healthy = mirrors.filter((m) => m.status === MirrorStatus.HEALTHY);
      const slow = mirrors.filter((m) => m.status === MirrorStatus.SLOW);
      const unavailable = mirrors.filter(
        (m) => m.status === MirrorStatus.UNAVAILABLE,
      );

      report += `✅ Healthy: ${healthy.length}\n`;
      report += `⚠️ Slow: ${slow.length}\n`;
      report += `❌ Unavailable: ${unavailable.length}\n\n`;

      report += "📋 Mirror Details:\n";
      report += "-".repeat(50) + "\n";
      for (const mirror of mirrors) {
        report += `[${mirror.status.toUpperCase()}] ${mirror.name}\n`;
        report += `  URL: ${mirror.url}\n`;
        report += `  Latency: ${mirror.latency || "N/A"}ms\n`;
        report += `  Type: ${mirror.type.join(", ")}\n\n`;
      }

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`diagnostic-${Date.now()}.txt`),
        filters: {
          Text: ["txt"],
        },
      });

      if (!uri) return;

      await fs.writeFile(uri.fsPath, report);
      vscode.window.showInformationMessage(
        `✅ Diagnostic report saved to ${uri.fsPath}`,
      );
    } catch (error) {
      logger.error("Error exporting diagnostic:", error);
      vscode.window.showErrorMessage("Failed to export diagnostic");
    }
  }

  private async batchTestMirrors(): Promise<void> {
    try {
      const mirrors = this.mirrorManager.getAllMirrors();
      const items = mirrors.map((m) => ({
        label: `${m.name} (${m.latency || "N/A"}ms)`,
        description: m.url,
        picked: false,
        url: m.url,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select mirrors to test",
        canPickMany: true,
        matchOnDescription: true,
      });

      if (!selected || selected.length === 0) {
        vscode.window.showErrorMessage("No mirrors selected");
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Testing ${selected.length} mirrors...`,
          cancellable: false,
        },
        async () => {
          const checker = this.mirrorManager.getChecker();
          const mirrorsToTest = selected
            .map((s) =>
              this.mirrorManager.getAllMirrors().find((m) => m.url === s.url),
            )
            .filter((m): m is Mirror => m !== undefined);

          const results = await checker.testMirrorsParallel(mirrorsToTest);

          let message = "📊 Test Results:\n\n";
          for (const result of results) {
            const icon = result.reachable ? "✅" : "❌";
            message += `${icon} ${result.mirror.name}: ${result.latency}ms\n`;
          }

          vscode.window.showInformationMessage(message, {
            modal: true,
            detail: message,
          });
        },
      );
    } catch (error) {
      logger.error("Error batch testing mirrors:", error);
      vscode.window.showErrorMessage("Failed to test mirrors");
    }
  }

  private async addCustomMirror(): Promise<void> {
    try {
      const url = await vscode.window.showInputBox({
        prompt: "Enter mirror URL",
        placeHolder: "https://example.com/mirror/",
        validateInput: (value) => {
          if (!value || !value.startsWith("http")) {
            return "Please enter a valid URL starting with http:// or https://";
          }
          return null;
        },
      });

      if (!url) return;

      const name = await vscode.window.showInputBox({
        prompt: "Enter mirror name",
        placeHolder: "My Mirror",
      });

      if (!name) return;

      const type = await vscode.window.showQuickPick(
        ["general", "npm", "pip", "docker", "git", "apt", "maven", "go"],
        { placeHolder: "Select mirror type" },
      );

      if (!type) return;

      const newMirror: Mirror = {
        url,
        name,
        type: [type as MirrorType, MirrorType.GENERAL],
        status: MirrorStatus.UNKNOWN,
      };

      const status = this.mirrorManager.getStatus();
      status.mirrors.push(newMirror);
      this.statusBarManager.updateStatus();

      vscode.window.showInformationMessage(`✅ Custom mirror added: ${name}`);
    } catch (error) {
      logger.error("Error adding custom mirror:", error);
      vscode.window.showErrorMessage("Failed to add custom mirror");
    }
  }
}
