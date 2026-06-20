import * as path from "path";
import * as fs from "fs-extra";
import {
  Mirror,
  ExtensionConfig,
  MirrorManagerState,
  MirrorTestResult,
} from "./types";
import { logger } from "../utils/logger";
import { MirrorStatus, ManagerState, MirrorType } from "./enums";
import { MirrorChecker } from "./mirrorChecker";
import { MirrorSourceManager } from "./mirrorSources";

export class MirrorManager {
  private checker: MirrorChecker;
  private state: MirrorManagerState;
  private config: ExtensionConfig;
  private sourceManager: MirrorSourceManager;

  constructor(config: ExtensionConfig) {
    this.checker = new MirrorChecker(config.timeout || 10000);
    this.config = config;
    this.sourceManager = new MirrorSourceManager();
    this.state = {
      mirrors: [],
      selectedMirror: null,
      isTesting: false,
      lastTest: null,
      testCache: new Map(),
      status: ManagerState.IDLE,
    };
  }

  public async initialize(): Promise<void> {
    logger.info("Initializing Mirror Manager...");
    await this.loadMirrors();

    if (this.config.enabled) {
      await this.testAndSelectBestMirror();
    }
  }

  private async loadMirrors(): Promise<void> {
    try {
      const mirrors = await this.sourceManager.loadAllMirrors();

      if (mirrors.length > 0) {
        this.state.mirrors = mirrors;
        logger.info(`Loaded ${mirrors.length} mirrors from external sources`);
      } else {
        logger.warn("No external mirrors loaded, using default mirrors");
        this.state.mirrors = this.getDefaultMirrors();
        logger.info(`Loaded ${this.state.mirrors.length} default mirrors`);
      }
    } catch (error) {
      logger.error("Error loading mirrors:", error);
      this.state.mirrors = this.getDefaultMirrors();
      logger.info(
        `Loaded ${this.state.mirrors.length} default mirrors (fallback)`,
      );
    }
  }

  private getDefaultMirrors(): Mirror[] {
    return [
      // ... (same as DEFAULT_MIRRORS in types.ts)
    ];
  }

  public async testAndSelectBestMirror(): Promise<Mirror | null> {
    if (this.state.mirrors.length === 0) {
      logger.warn("No mirrors available to test");
      return null;
    }

    this.state.isTesting = true;
    this.state.status = ManagerState.TESTING;
    logger.info(`Testing ${this.state.mirrors.length} mirrors...`);

    try {
      const activeMirrors = this.getActiveMirrors();
      const results = await this.checker.testMirrorsParallel(activeMirrors);

      results.forEach((result: MirrorTestResult) => {
        this.state.testCache.set(result.mirror.url, result);

        const index = this.state.mirrors.findIndex(
          (m) => m.url === result.mirror.url,
        );
        if (index !== -1) {
          this.state.mirrors[index] = {
            ...this.state.mirrors[index],
            status: result.mirror.status,
            latency: result.mirror.latency,
            error: result.mirror.error,
            lastTested: result.mirror.lastTested,
          };
        }
      });

      const fastest = this.checker.findFastestMirror(results);

      if (fastest) {
        const updatedMirror = this.state.mirrors.find(
          (m) => m.url === fastest.url,
        );
        this.state.selectedMirror = updatedMirror || fastest;
        this.state.lastTest = new Date();
        this.state.status = ManagerState.READY;
        logger.info(
          `Selected fastest mirror: ${this.state.selectedMirror.name} (${this.state.selectedMirror.latency}ms)`,
        );

        await this.applyMirrorToIntegrations(this.state.selectedMirror);

        return this.state.selectedMirror;
      } else {
        logger.warn("No healthy mirrors found!");
        this.state.selectedMirror = null;
        this.state.status = ManagerState.ERROR;
        this.state.lastError = "No healthy mirrors found";
        return null;
      }
    } finally {
      this.state.isTesting = false;
    }
  }

  private getActiveMirrors(): Mirror[] {
    const activeIntegrations = Object.keys(this.config.integrations).filter(
      (key) =>
        this.config.integrations[key as keyof typeof this.config.integrations],
    );

    return this.state.mirrors.filter(
      (mirror) =>
        mirror.type.some((type) => activeIntegrations.includes(type)) ||
        mirror.type.includes(MirrorType.GENERAL),
    );
  }

  private async applyMirrorToIntegrations(mirror: Mirror): Promise<void> {
    const integrations = this.config.integrations;

    if (integrations.npm) {
      await this.applyNpmMirror(mirror);
    }
    if (integrations.pip) {
      await this.applyPipMirror(mirror);
    }
    if (integrations.docker) {
      await this.applyDockerMirror(mirror);
    }
    if (integrations.git) {
      await this.applyGitMirror(mirror);
    }
    if (integrations.apt) {
      await this.applyAptMirror(mirror);
    }

    logger.info("✅ Applied mirror to all active integrations");
  }

  private async applyNpmMirror(mirror: Mirror): Promise<void> {
    try {
      let npmUrl = mirror.url;
      if (!npmUrl.endsWith("/")) {
        npmUrl += "/";
      }

      logger.info(`🔧 Setting npm registry to: ${npmUrl}`);

      const { exec } = require("child_process");
      const command = `npm config set registry ${npmUrl}`;

      return new Promise((resolve, reject) => {
        exec(
          command,
          (error: Error | null, _stdout: string, stderr: string) => {
            if (error) {
              logger.error(
                `❌ Error applying npm mirror: ${stderr || error.message}`,
              );
              reject(error);
            } else {
              logger.info(`✅ npm mirror set to ${npmUrl}`);
              this.verifyNpmConfig(npmUrl);
              resolve();
            }
          },
        );
      });
    } catch (error) {
      logger.error("Failed to apply npm mirror:", error);
    }
  }

  private async verifyNpmConfig(expectedUrl: string): Promise<void> {
    try {
      const { exec } = require("child_process");
      exec("npm config get registry", (error: Error | null, stdout: string) => {
        if (!error && stdout.trim() === expectedUrl) {
          logger.debug(`✅ npm registry verified: ${expectedUrl}`);
        } else if (!error) {
          logger.warn(
            `⚠️ npm registry mismatch. Expected: ${expectedUrl}, Got: ${stdout.trim()}`,
          );
        }
      });
    } catch {
      // ignore
    }
  }

  private async applyPipMirror(mirror: Mirror): Promise<void> {
    try {
      let pipUrl = mirror.url;
      if (!pipUrl.endsWith("/")) {
        pipUrl += "/";
      }
      if (!pipUrl.includes("simple")) {
        pipUrl += "simple/";
      }

      logger.info(`🔧 Setting pip index-url to: ${pipUrl}`);

      const { exec } = require("child_process");
      const command = `pip config set global.index-url ${pipUrl}`;

      return new Promise((resolve, reject) => {
        exec(
          command,
          (error: Error | null, _stdout: string, stderr: string) => {
            if (error) {
              logger.error(
                `❌ Error applying pip mirror: ${stderr || error.message}`,
              );
              reject(error);
            } else {
              logger.info(`✅ pip mirror set to ${pipUrl}`);
              resolve();
            }
          },
        );
      });
    } catch (error) {
      logger.error("Failed to apply pip mirror:", error);
    }
  }

  private async applyDockerMirror(mirror: Mirror): Promise<void> {
    try {
      if (!mirror.type.includes(MirrorType.DOCKER)) {
        logger.debug(
          `⏭️ Skipping Docker for ${mirror.name} (no docker support)`,
        );
        return;
      }

      const dockerConfigPath =
        process.platform === "win32"
          ? "C:\\ProgramData\\docker\\config\\daemon.json"
          : "/etc/docker/daemon.json";

      const configDir = path.dirname(dockerConfigPath);
      await fs.ensureDir(configDir);

      let config: any = {};
      if (await fs.pathExists(dockerConfigPath)) {
        config = await fs.readJson(dockerConfigPath);
      }

      if (!config["registry-mirrors"]) {
        config["registry-mirrors"] = [];
      }

      const dockerUrl = mirror.url;
      if (!config["registry-mirrors"].includes(dockerUrl)) {
        config["registry-mirrors"].push(dockerUrl);
        await fs.writeJson(dockerConfigPath, config, { spaces: 2 });
        logger.info(`✅ Docker mirror added to config: ${dockerUrl}`);
        logger.warn("⚠️ Docker daemon restart may be required");
      }
    } catch (error) {
      logger.error("Failed to apply Docker mirror:", error);
    }
  }

  private async applyGitMirror(mirror: Mirror): Promise<void> {
    try {
      const { exec } = require("child_process");
      const command = `git config --global url."${mirror.url}".insteadOf "https://github.com"`;

      return new Promise((resolve, reject) => {
        exec(
          command,
          (error: Error | null, _stdout: string, stderr: string) => {
            if (error) {
              logger.error(
                `❌ Error applying git mirror: ${stderr || error.message}`,
              );
              reject(error);
            } else {
              logger.info(`✅ Git mirror set to ${mirror.url}`);
              resolve();
            }
          },
        );
      });
    } catch (error) {
      logger.error("Failed to apply git mirror:", error);
    }
  }

  private async applyAptMirror(mirror: Mirror): Promise<void> {
    try {
      if (process.platform !== "linux") {
        logger.debug("⏭️ Skipping apt mirror on non-Linux platform");
        return;
      }

      const sourcesPath = "/etc/apt/sources.list";
      const backupPath = "/etc/apt/sources.list.bak";

      if (!(await fs.pathExists(sourcesPath))) {
        logger.warn("⚠️ sources.list not found, skipping apt mirror");
        return;
      }

      await fs.copy(sourcesPath, backupPath);
      logger.info(`📁 Backup created at ${backupPath}`);

      let content = await fs.readFile(sourcesPath, "utf8");

      const aptUrl = mirror.url;
      const newContent = content.replace(
        /(deb\s+)(https?:\/\/)(archive\.ubuntu\.com|us\.archive\.ubuntu\.com)(\/[^\s]*)/g,
        `$1$2${aptUrl}$4`,
      );

      if (content !== newContent) {
        await fs.writeFile(sourcesPath, newContent, "utf8");
        logger.info(`✅ APT mirror applied: ${aptUrl}`);
        logger.warn('⚠️ Run "sudo apt update" to apply changes');
      } else {
        logger.debug("ℹ️ No changes needed for apt sources");
      }
    } catch (error) {
      logger.error("Failed to apply apt mirror:", error);
    }
  }

  public getStatus(): MirrorManagerState {
    return this.state;
  }

  public getSelectedMirror(): Mirror | null {
    return this.state.selectedMirror;
  }

  public getAllMirrors(): Mirror[] {
    return this.state.mirrors;
  }

  public async refreshMirrors(): Promise<void> {
    await this.loadMirrors();
    await this.testAndSelectBestMirror();
  }

  public async selectMirrorManually(url: string): Promise<Mirror | null> {
    const mirror = this.state.mirrors.find((m) => m.url === url);
    if (!mirror) {
      logger.warn(`Mirror with URL ${url} not found`);
      return null;
    }

    const result = await this.checker.testMirror(mirror);
    if (result.reachable) {
      const index = this.state.mirrors.findIndex((m) => m.url === url);
      if (index !== -1) {
        this.state.mirrors[index] = {
          ...this.state.mirrors[index],
          status: result.mirror.status,
          latency: result.mirror.latency,
          error: result.mirror.error,
          lastTested: result.mirror.lastTested,
        };
        this.state.selectedMirror = this.state.mirrors[index];
      } else {
        this.state.selectedMirror = result.mirror;
      }
      this.state.status = ManagerState.READY;

      await this.applyMirrorToIntegrations(this.state.selectedMirror);

      return this.state.selectedMirror;
    } else {
      logger.warn(`Mirror ${mirror.name} is not reachable`);
      return null;
    }
  }

  public getChecker(): MirrorChecker {
    return this.checker;
  }
}
