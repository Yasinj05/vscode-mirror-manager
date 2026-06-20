import * as vscode from "vscode";
import { ExtensionConfig } from "./core/types";
import { StatusBarManager } from "./ui/statusBar";
import { CommandManager } from "./ui/commands";
import { logger } from "./utils/logger";
import { MirrorManager } from "./core/mirrorManager";
import { parseLogLevel } from "./utils/validator";

let mirrorManager: MirrorManager;
let statusBarManager: StatusBarManager;
let commandManager: CommandManager;

export async function activate(context: vscode.ExtensionContext) {
  logger.info("🚀 Mirror Manager is now active!");

  try {
    const config = vscode.workspace.getConfiguration("mirror-manager");
    const extensionConfig: ExtensionConfig = {
      enabled: config.get("enable", true),
      autoSwitch: config.get("autoSwitch", true),
      autoCheckInterval: config.get("autoCheckInterval", 30),
      timeout: config.get("timeout", 10000),
      logLevel: parseLogLevel(config.get("logLevel", "info")),
      mirrorSources: config.get("mirrorSources", [
        "https://raw.githubusercontent.com/MiravaOrg/Mirava/main/mirrors_list.yaml",
      ]),
      integrations: config.get("integrations", {
        npm: true,
        pip: true,
        docker: true,
        git: true,
        apt: false,
        maven: false,
        go: false,
        composer: false,
        nuget: false,
        rubygems: false,
        cargo: false,
      }),
      profiles: [],
    };

    logger.setLevel(extensionConfig.logLevel);

    mirrorManager = new MirrorManager(extensionConfig);
    await mirrorManager.initialize();

    statusBarManager = new StatusBarManager(mirrorManager);
    statusBarManager.initialize();

    commandManager = new CommandManager(mirrorManager, statusBarManager);
    commandManager.registerCommands(context);

    if (extensionConfig.enabled && extensionConfig.autoSwitch) {
      startBackgroundMonitoring(context, extensionConfig);
    }

    const configChangeListener = vscode.workspace.onDidChangeConfiguration(
      async (event) => {
        if (event.affectsConfiguration("mirror-manager")) {
          logger.info("Configuration changed, reloading...");
          const newConfig = vscode.workspace.getConfiguration("mirror-manager");
          extensionConfig.enabled = newConfig.get("enable", true);
          extensionConfig.autoSwitch = newConfig.get("autoSwitch", true);
          extensionConfig.autoCheckInterval = newConfig.get(
            "autoCheckInterval",
            30,
          );
          extensionConfig.timeout = newConfig.get("timeout", 10000);
          extensionConfig.logLevel = parseLogLevel(
            newConfig.get("logLevel", "info"),
          );
          logger.setLevel(extensionConfig.logLevel);
          extensionConfig.integrations = newConfig.get(
            "integrations",
            extensionConfig.integrations,
          );
          extensionConfig.mirrorSources = newConfig.get(
            "mirrorSources",
            extensionConfig.mirrorSources,
          );

          await mirrorManager.refreshMirrors();
          statusBarManager.updateStatus();
        }
      },
    );
    context.subscriptions.push(configChangeListener);

    logger.info("✅ Mirror Manager initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize Mirror Manager:", error);
    vscode.window.showErrorMessage(
      "Failed to initialize Mirror Manager. Check the output panel for details.",
    );
  }
}

function startBackgroundMonitoring(
  context: vscode.ExtensionContext,
  config: ExtensionConfig,
) {
  const intervalMinutes = config.autoCheckInterval || 30;
  const intervalMs = intervalMinutes * 60 * 1000;

  const timer = setInterval(async () => {
    if (!config.enabled) return;

    try {
      const status = mirrorManager.getStatus();
      const currentMirror = status.selectedMirror;

      if (!currentMirror) {
        logger.debug("No mirror selected, performing fresh test...");
        await mirrorManager.testAndSelectBestMirror();
        statusBarManager.updateStatus();
        return;
      }

      const checker = mirrorManager.getChecker();
      const result = await checker.testMirror(currentMirror);

      if (!result.reachable) {
        logger.warn(`⚠️ Current mirror ${currentMirror.name} is unavailable!`);
        const newMirror = await mirrorManager.testAndSelectBestMirror();
        statusBarManager.updateStatus();

        if (newMirror) {
          vscode.window.showWarningMessage(
            `Mirror ${currentMirror.name} became unavailable. Switched to ${newMirror.name}.`,
          );
        } else {
          vscode.window.showErrorMessage(
            "No healthy mirrors available! Please check your internet connection.",
          );
        }
      } else if (result.latency > 1000) {
        logger.debug(
          `Current mirror ${currentMirror.name} is slow (${result.latency}ms)`,
        );
        const allMirrors = mirrorManager.getAllMirrors();
        const testResults = await checker.testMirrorsParallel(allMirrors);
        const fastest = checker.findFastestMirror(testResults);

        if (
          fastest &&
          fastest.latency &&
          fastest.latency < (result.latency || 0) / 2
        ) {
          logger.info(
            `🔄 Found faster mirror: ${fastest.name} (${fastest.latency}ms)`,
          );
          await mirrorManager.selectMirrorManually(fastest.url);
          statusBarManager.updateStatus();

          vscode.window.showInformationMessage(
            `Switched to faster mirror: ${fastest.name} (${fastest.latency}ms)`,
          );
        }
      }
    } catch (error) {
      logger.error("Error in background monitoring:", error);
    }
  }, intervalMs);

  context.subscriptions.push({
    dispose: () => clearInterval(timer),
  });

  logger.info(
    `🔄 Background monitoring started (interval: ${intervalMinutes} minutes)`,
  );
}

export function deactivate() {
  logger.info("👋 Mirror Manager is now deactivated");
}
