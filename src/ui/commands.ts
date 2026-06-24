import * as vscode from "vscode";
import * as fs from "fs-extra";
import { logger } from "../utils/logger";
import { MirrorManager } from "../core/mirrorManager";
import { StatusBarManager } from "./statusBar";
import { MirrorStatus, MirrorType } from "../core/enums";
import { Mirror, ToolName } from "../core/types";
import { getMirrorTypeLabel } from "../utils/mirrorTypes";

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

  private async pickMirrorType(
    placeHolder: string,
  ): Promise<ToolName | undefined> {
    const types = this.mirrorManager.getApplicableMirrorTypes();
    if (types.length === 0) {
      vscode.window.showWarningMessage(
        "No mirror integrations are enabled. Enable them in Mirror Manager settings.",
      );
      return undefined;
    }

    const selected = await vscode.window.showQuickPick(
      types.map((type) => ({
        label: getMirrorTypeLabel(type),
        description: `Switch mirror for ${getMirrorTypeLabel(type)}`,
        type,
      })),
      { placeHolder },
    );

    return selected?.type;
  }

  private async pickMirrorTypesForReset(): Promise<ToolName[] | undefined> {
    const types = this.mirrorManager.getApplicableMirrorTypes();
    if (types.length === 0) {
      vscode.window.showWarningMessage(
        "No mirror integrations are enabled. Enable them in Mirror Manager settings.",
      );
      return undefined;
    }

    const items = [
      {
        label: "All integrations",
        description: "Reset npm, pip, docker, git, and apt settings",
        type: "all" as const,
        picked: false,
      },
      ...types.map((type) => ({
        label: getMirrorTypeLabel(type),
        description: `Reset only ${getMirrorTypeLabel(type)} to default`,
        type,
        picked: false,
      })),
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select mirror type(s) to reset",
      canPickMany: true,
    });

    if (!selected || selected.length === 0) {
      return undefined;
    }

    if (selected.some((item) => item.type === "all")) {
      return types;
    }

    return selected.map((item) => item.type as ToolName);
  }

  private beginCommand(title: string): void {
    logger.section(title);
  }

  private endCommand(status = "Done"): void {
    logger.sectionEnd(status);
  }

  private async showStatus(): Promise<void> {
    this.beginCommand("Show Status");
    try {
      const status = this.mirrorManager.getStatus();
      const selectedMirror = status.selectedMirror;

      let message = "Mirror Manager Status:\n";
      message += `\n📊 Total Mirrors: ${status.mirrors.length}`;

      const applicableTypes = this.mirrorManager.getApplicableMirrorTypes();
      if (applicableTypes.length > 0) {
        message += "\n\n🔍 Selected mirrors by type:";
        for (const type of applicableTypes) {
          const mirror = this.mirrorManager.getSelectedMirrorForType(type);
          if (mirror) {
            message += `\n   ${getMirrorTypeLabel(type)}: ${mirror.name} (${mirror.latency || "N/A"}ms)`;
            message += `\n      ${mirror.url}`;
          } else {
            message += `\n   ${getMirrorTypeLabel(type)}: None`;
          }
        }
      }

      if (selectedMirror) {
        message += `\n\n⭐ Last active mirror: ${selectedMirror.name}`;
        message += `\n   ⚡ Latency: ${selectedMirror.latency || "N/A"}ms`;
        message += `\n   📊 Status: ${selectedMirror.status}`;
      }

      message += `\n\n🔄 Last Test: ${status.lastTest ? status.lastTest.toLocaleString() : "Never"}`;
      message += `\n📊 Manager State: ${status.status}`;

      vscode.window.showInformationMessage("Mirror Manager Status", {
        detail: message,
        modal: false,
      });

      logger.blank();
      logger.block(message);
      this.endCommand("Status displayed");
    } catch (error) {
      logger.error("Error showing status:", error);
      this.endCommand("Failed");
      vscode.window.showErrorMessage("Failed to get mirror status");
    }
  }

  private async switchToFastest(): Promise<void> {
    try {
      const mirrorType = await this.pickMirrorType(
        "Select mirror type to switch",
      );
      if (!mirrorType) {
        return;
      }

      this.beginCommand(
        `Switch to Fastest (${getMirrorTypeLabel(mirrorType)})`,
      );

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Testing ${getMirrorTypeLabel(mirrorType)} mirrors...`,
          cancellable: false,
        },
        async () => {
          const fastest =
            await this.mirrorManager.testAndSelectBestMirrorForType(mirrorType);

          if (fastest) {
            vscode.window.showInformationMessage(
              `✅ Switched ${getMirrorTypeLabel(mirrorType)} to fastest mirror: ${fastest.name} (${fastest.latency}ms)`,
            );
            this.statusBarManager.updateStatus();
            this.endCommand(`Selected ${fastest.name}`);
          } else {
            this.endCommand("No healthy mirrors");
            vscode.window.showErrorMessage(
              `❌ No healthy ${getMirrorTypeLabel(mirrorType)} mirrors found!`,
            );
          }
        },
      );
    } catch (error) {
      logger.error("Error switching to fastest mirror:", error);
      this.endCommand("Failed");
      vscode.window.showErrorMessage("Failed to switch to fastest mirror");
    }
  }

  private async diagnose(): Promise<void> {
    this.beginCommand("Diagnostic Report");
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

      logger.blank();
      logger.block(report);

      vscode.window.showInformationMessage(
        "✅ Diagnostic report generated. Check Output panel.",
      );
      this.endCommand("Report generated");
    } catch (error) {
      logger.error("Error running diagnose:", error);
      this.endCommand("Failed");
      vscode.window.showErrorMessage("Failed to run diagnosis");
    }
  }

  private async selectManually(): Promise<void> {
    try {
      const mirrorType = await this.pickMirrorType(
        "Select mirror type to configure",
      );
      if (!mirrorType) {
        return;
      }

      this.beginCommand(
        `Select Mirror (${getMirrorTypeLabel(mirrorType)})`,
      );

      const mirrors = this.mirrorManager.getMirrorsForType(mirrorType);
      if (mirrors.length === 0) {
        logger.warn(`No mirrors available for ${getMirrorTypeLabel(mirrorType)}`);
        this.endCommand("No mirrors found");
        vscode.window.showWarningMessage(
          `No mirrors available for ${getMirrorTypeLabel(mirrorType)}.`,
        );
        return;
      }

      const items = mirrors.map((mirror) => ({
        label: `${mirror.name} (${mirror.latency || "N/A"}ms)`,
        description: mirror.url,
        url: mirror.url,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Select a ${getMirrorTypeLabel(mirrorType)} mirror`,
        matchOnDescription: true,
      });

      if (selected) {
        const result = await this.mirrorManager.selectMirrorForType(
          selected.url,
          mirrorType,
        );
        if (result) {
          vscode.window.showInformationMessage(
            `✅ Selected ${getMirrorTypeLabel(mirrorType)} mirror: ${result.name}`,
          );
          this.statusBarManager.updateStatus();
          this.endCommand(`Selected ${result.name}`);
        } else {
          this.endCommand("Mirror unreachable");
          vscode.window.showErrorMessage("❌ Mirror is not reachable");
        }
      } else {
        this.endCommand("Cancelled");
      }
    } catch (error) {
      logger.error("Error selecting mirror manually:", error);
      this.endCommand("Failed");
      vscode.window.showErrorMessage("Failed to select mirror");
    }
  }

  private async refreshList(): Promise<void> {
    this.beginCommand("Refresh Mirrors");
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
          this.endCommand("List refreshed");
        },
      );
    } catch (error) {
      logger.error("Error refreshing mirrors:", error);
      this.endCommand("Failed");
      vscode.window.showErrorMessage("Failed to refresh mirrors");
    }
  }

  private async disable(): Promise<void> {
    this.beginCommand("Toggle Extension");
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
      this.endCommand(current ? "Disabled" : "Enabled");
    } catch (error) {
      logger.error("Error disabling/enabling:", error);
      this.endCommand("Failed");
      vscode.window.showErrorMessage("Failed to change state");
    }
  }

  private async resetToDefault(): Promise<void> {
    try {
      const types = await this.pickMirrorTypesForReset();
      if (!types || types.length === 0) {
        return;
      }

      const typeLabels = types.map((type) => getMirrorTypeLabel(type)).join(", ");
      const confirm = await vscode.window.showWarningMessage(
        `Reset ${typeLabels} to default settings?`,
        { modal: true },
        "Yes",
        "Cancel",
      );

      if (confirm !== "Yes") {
        return;
      }

      this.beginCommand(`Reset to Default (${typeLabels})`);

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Resetting mirror settings...",
          cancellable: false,
        },
        async () => {
          await this.mirrorManager.resetMirrorTypes(types);
          this.statusBarManager.updateStatus();

          vscode.window.showInformationMessage(
            `✅ Reset to default: ${typeLabels}`,
          );
          this.endCommand("Reset complete");
        },
      );
    } catch (error) {
      logger.error("Error resetting to default:", error);
      this.endCommand("Failed");
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

      this.beginCommand("Export Mirrors");

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
      logger.info(`Exported ${mirrors.length} mirrors as ${format}`);
      logger.info(`Saved to: ${uri.fsPath}`);
      this.endCommand("Export complete");
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

      this.beginCommand(`Filter Mirrors (${selected})`);

      const filtered = allMirrors.filter((m) =>
        m.type.some((t) => t.toLowerCase() === selected.toLowerCase()),
      );

      if (filtered.length === 0) {
        logger.warn(`No mirrors found for type: ${selected}`);
        this.endCommand("No results");
        vscode.window.showInformationMessage(
          `No mirrors found for type: ${selected}`,
        );
        return;
      }

      let message = `Mirrors supporting ${selected}:\n\n`;
      message += filtered
        .map((m) => `  • ${m.name} (${m.latency || "N/A"}ms) - ${m.status}`)
        .join("\n");

      logger.block(message);
      vscode.window.showInformationMessage(message, {
        modal: true,
        detail: message,
      });
      this.endCommand(`${filtered.length} mirrors`);
    } catch (error) {
      logger.error("Error filtering mirrors:", error);
      this.endCommand("Failed");
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
      this.beginCommand("Compare Mirrors");

      let message = "Mirror Comparison:\n\n";
      message += `${first.label}\n`;
      message += `   URL: ${first.description}\n\n`;
      message += `${second.label}\n`;
      message += `   URL: ${second.description}\n\n`;

      const firstMirror = mirrors.find((m) => m.url === first.url);
      const secondMirror = mirrors.find((m) => m.url === second.url);

      if (firstMirror?.latency && secondMirror?.latency) {
        const diff = Math.abs(firstMirror.latency - secondMirror.latency);
        const faster =
          firstMirror.latency < secondMirror.latency
            ? firstMirror.name
            : secondMirror.name;
        message += `Latency difference: ${diff}ms\n`;
        message += `Faster: ${faster}`;
      }

      logger.block(message);
      vscode.window.showInformationMessage(message, {
        modal: true,
        detail: message,
      });
      this.endCommand("Comparison complete");
    } catch (error) {
      logger.error("Error comparing mirrors:", error);
      this.endCommand("Failed");
      vscode.window.showErrorMessage("Failed to compare mirrors");
    }
  }

  private async showHistory(): Promise<void> {
    this.beginCommand("Test History");
    try {
      const status = this.mirrorManager.getStatus();
      const history = status.testCache;

      if (history.size === 0) {
        logger.info("No mirror history available yet");
        this.endCommand("Empty");
        vscode.window.showInformationMessage("No mirror history available");
        return;
      }

      let message = "Mirror Test History:\n\n";
      let index = 1;
      for (const [url, result] of history) {
        message += `${index}. ${result.mirror.name}\n`;
        message += `   URL: ${url}\n`;
        message += `   Status: ${result.mirror.status}\n`;
        message += `   Latency: ${result.latency}ms\n`;
        message += `   Last Tested: ${result.mirror.lastTested?.toLocaleString() || "N/A"}\n\n`;
        index++;
      }

      logger.block(message);
      vscode.window.showInformationMessage(message, {
        modal: true,
        detail: message,
      });
      this.endCommand(`${history.size} entries`);
    } catch (error) {
      logger.error("Error showing history:", error);
      this.endCommand("Failed");
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

      this.beginCommand("Export Diagnostic");
      await fs.writeFile(uri.fsPath, report);
      logger.info(`Report saved to: ${uri.fsPath}`);
      this.endCommand("Export complete");
      vscode.window.showInformationMessage(
        `✅ Diagnostic report saved to ${uri.fsPath}`,
      );
    } catch (error) {
      logger.error("Error exporting diagnostic:", error);
      this.endCommand("Failed");
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

      this.beginCommand(`Batch Test (${selected.length} mirrors)`);

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

          let message = "Test Results:\n\n";
          for (const result of results) {
            const icon = result.reachable ? "OK" : "FAIL";
            message += `[${icon}] ${result.mirror.name}: ${result.latency}ms\n`;
          }

          logger.block(message);
          vscode.window.showInformationMessage(message, {
            modal: true,
            detail: message,
          });
          this.endCommand(`${results.length} mirrors tested`);
        },
      );
    } catch (error) {
      logger.error("Error batch testing mirrors:", error);
      this.endCommand("Failed");
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

      this.beginCommand("Add Custom Mirror");

      const newMirror: Mirror = {
        url,
        name,
        type: [type as MirrorType, MirrorType.GENERAL],
        status: MirrorStatus.UNKNOWN,
      };

      const status = this.mirrorManager.getStatus();
      status.mirrors.push(newMirror);
      this.statusBarManager.updateStatus();

      logger.info(`Added custom mirror: ${name} (${type})`);
      logger.info(`URL: ${url}`);
      this.endCommand("Mirror added");

      vscode.window.showInformationMessage(`✅ Custom mirror added: ${name}`);
    } catch (error) {
      logger.error("Error adding custom mirror:", error);
      this.endCommand("Failed");
      vscode.window.showErrorMessage("Failed to add custom mirror");
    }
  }
}
