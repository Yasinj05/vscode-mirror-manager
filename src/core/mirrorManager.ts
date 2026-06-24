import * as path from "path";
import * as fs from "fs-extra";
import {
  Mirror,
  ExtensionConfig,
  MirrorManagerState,
  MirrorTestResult,
  DEFAULT_MIRRORS,
} from "./types";
import { logger } from "../utils/logger";
import {
  APPLICABLE_MIRROR_TYPES,
  filterMirrorsByType,
  mirrorSupportsType,
} from "../utils/mirrorTypes";
import { MirrorStatus, ManagerState, MirrorType } from "./enums";
import { MirrorChecker } from "./mirrorChecker";
import { MirrorSourceManager } from "./mirrorSources";
import { ToolName } from "./types";

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
      selectedMirrorsByType: new Map(),
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
    return DEFAULT_MIRRORS.map((mirror) => ({ ...mirror }));
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
        this.syncSelectedMirrorsByType(this.state.selectedMirror);
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
    const types = this.getApplicableMirrorTypes().filter((type) =>
      mirrorSupportsType(mirror, type),
    );

    const results = await Promise.allSettled(
      types.map((type) => this.applyMirrorForType(mirror, type)),
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        logger.warn(
          `Failed to apply ${types[index]} mirror:`,
          result.reason,
        );
      }
    });

    logger.info("✅ Mirror integration apply pass completed");
  }

  public getApplicableMirrorTypes(): ToolName[] {
    return APPLICABLE_MIRROR_TYPES.filter(
      (type) =>
        this.config.integrations[
          type as keyof typeof this.config.integrations
        ],
    );
  }

  public getMirrorsForType(type: MirrorType): Mirror[] {
    return filterMirrorsByType(this.state.mirrors, type);
  }

  public getSelectedMirrorForType(type: MirrorType): Mirror | null {
    return this.state.selectedMirrorsByType.get(type) ?? null;
  }

  private syncSelectedMirrorsByType(mirror: Mirror | null): void {
    if (!mirror) {
      return;
    }

    for (const type of this.getApplicableMirrorTypes()) {
      if (mirrorSupportsType(mirror, type)) {
        this.state.selectedMirrorsByType.set(type, mirror);
      }
    }
  }

  public async testAndSelectBestMirrorForType(
    type: MirrorType,
  ): Promise<Mirror | null> {
    const mirrors = this.getMirrorsForType(type);
    if (mirrors.length === 0) {
      logger.warn(`No mirrors available for type: ${type}`);
      return null;
    }

    this.state.isTesting = true;
    this.state.status = ManagerState.TESTING;
    logger.info(`Testing ${mirrors.length} mirrors for ${type}...`);

    try {
      const results = await this.checker.testMirrorsParallel(mirrors);

      results.forEach((result: MirrorTestResult) => {
        this.state.testCache.set(result.mirror.url, result);
        this.updateMirrorInState(result.mirror);
      });

      const fastest = this.checker.findFastestMirror(results);
      if (!fastest) {
        logger.warn(`No healthy mirrors found for ${type}`);
        this.state.selectedMirrorsByType.delete(type);
        return null;
      }

      const updatedMirror =
        this.state.mirrors.find((mirror) => mirror.url === fastest.url) ||
        fastest;

      this.state.selectedMirrorsByType.set(type, updatedMirror);
      this.state.selectedMirror = updatedMirror;
      this.state.lastTest = new Date();
      this.state.status = ManagerState.READY;

      await this.applyMirrorForType(updatedMirror, type);

      logger.info(
        `Selected fastest ${type} mirror: ${updatedMirror.name} (${updatedMirror.latency}ms)`,
      );
      return updatedMirror;
    } finally {
      this.state.isTesting = false;
    }
  }

  public async selectMirrorForType(
    url: string,
    type: MirrorType,
  ): Promise<Mirror | null> {
    const mirror = this.state.mirrors.find((item) => item.url === url);
    if (!mirror) {
      logger.warn(`Mirror with URL ${url} not found`);
      return null;
    }

    if (!mirrorSupportsType(mirror, type)) {
      logger.warn(`Mirror ${mirror.name} does not support ${type}`);
      return null;
    }

    const result = await this.checker.testMirror(mirror);
    if (!result.reachable) {
      logger.warn(`Mirror ${mirror.name} is not reachable`);
      return null;
    }

    const updatedMirror = this.updateMirrorInState(result.mirror);
    this.state.selectedMirrorsByType.set(type, updatedMirror);
    this.state.selectedMirror = updatedMirror;
    this.state.status = ManagerState.READY;

    await this.applyMirrorForType(updatedMirror, type);
    return updatedMirror;
  }

  public async applyMirrorForType(
    mirror: Mirror,
    type: MirrorType,
  ): Promise<void> {
    if (
      !this.config.integrations[
        type as keyof typeof this.config.integrations
      ]
    ) {
      logger.debug(`Skipping ${type} mirror apply (integration disabled)`);
      return;
    }

    switch (type) {
      case MirrorType.NPM:
        await this.applyNpmMirror(mirror);
        break;
      case MirrorType.PIP:
        await this.applyPipMirror(mirror);
        break;
      case MirrorType.DOCKER:
        await this.applyDockerMirror(mirror);
        break;
      case MirrorType.GIT:
        await this.applyGitMirror(mirror);
        break;
      case MirrorType.APT:
        await this.applyAptMirror(mirror);
        break;
      default:
        logger.debug(`No apply handler for mirror type: ${type}`);
    }
  }

  public async resetMirrorType(type: MirrorType): Promise<boolean> {
    const { exec } = require("child_process");

    switch (type) {
      case MirrorType.NPM:
        await new Promise<void>((resolve) => {
          exec("npm config delete registry", (error: Error | null) => {
            if (error) {
              logger.warn("Failed to reset npm:", error.message);
            } else {
              logger.info("✅ npm reset to default");
            }
            resolve();
          });
        });
        break;
      case MirrorType.PIP:
        await new Promise<void>((resolve) => {
          exec(
            "pip config unset global.index-url",
            (error: Error | null) => {
              if (error) {
                logger.warn("Failed to reset pip:", error.message);
              } else {
                logger.info("✅ pip reset to default");
              }
              resolve();
            },
          );
        });
        break;
      case MirrorType.GIT:
        await new Promise<void>((resolve) => {
          exec(
            "git config --global --unset url.https://github.com.insteadOf",
            (error: Error | null) => {
              if (error) {
                logger.warn("Failed to reset git:", error.message);
              } else {
                logger.info("✅ git reset to default");
              }
              resolve();
            },
          );
        });
        break;
      case MirrorType.DOCKER:
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
          return false;
        }
        break;
      case MirrorType.APT:
        try {
          const sourcesPath = "/etc/apt/sources.list";
          const backupPath = "/etc/apt/sources.list.bak";

          if (
            process.platform === "linux" &&
            (await fs.pathExists(backupPath))
          ) {
            await fs.copy(backupPath, sourcesPath);
            logger.info("✅ apt restored from backup");
            logger.warn('⚠️ Run "sudo apt update" to apply changes');
          } else {
            logger.warn(
              "⚠️ APT backup not found. Restore sources.list manually if needed.",
            );
          }
        } catch (error) {
          logger.warn("Failed to reset apt:", error);
          return false;
        }
        break;
      default:
        logger.warn(`Reset is not supported for mirror type: ${type}`);
        return false;
    }

    this.state.selectedMirrorsByType.delete(type);
    if (!this.hasAnySelectedMirrorByType()) {
      this.state.selectedMirror = null;
    }

    return true;
  }

  public async resetMirrorTypes(types: MirrorType[]): Promise<void> {
    for (const type of types) {
      await this.resetMirrorType(type);
    }
  }

  private hasAnySelectedMirrorByType(): boolean {
    return this.state.selectedMirrorsByType.size > 0;
  }

  private updateMirrorInState(mirror: Mirror): Mirror {
    const index = this.state.mirrors.findIndex((item) => item.url === mirror.url);
    if (index !== -1) {
      this.state.mirrors[index] = {
        ...this.state.mirrors[index],
        status: mirror.status,
        latency: mirror.latency,
        error: mirror.error,
        lastTested: mirror.lastTested,
      };
      return this.state.mirrors[index];
    }

    return mirror;
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

      return new Promise((resolve) => {
        exec(
          command,
          (error: Error | null, _stdout: string, stderr: string) => {
            if (error) {
              logger.error(
                `❌ Error applying npm mirror: ${stderr || error.message}`,
              );
              resolve();
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

      return new Promise((resolve) => {
        exec(
          command,
          (error: Error | null, _stdout: string, stderr: string) => {
            if (error) {
              logger.error(
                `❌ Error applying pip mirror: ${stderr || error.message}`,
              );
              resolve();
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

      return new Promise((resolve) => {
        exec(
          command,
          (error: Error | null, _stdout: string, stderr: string) => {
            if (error) {
              logger.error(
                `❌ Error applying git mirror: ${stderr || error.message}`,
              );
              resolve();
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
    const enabledTypes = this.getApplicableMirrorTypes();
    if (enabledTypes.length === 1) {
      return this.selectMirrorForType(url, enabledTypes[0]);
    }

    const mirror = this.state.mirrors.find((item) => item.url === url);
    if (!mirror) {
      logger.warn(`Mirror with URL ${url} not found`);
      return null;
    }

    const supportedTypes = enabledTypes.filter((type) =>
      mirrorSupportsType(mirror, type),
    );
    if (supportedTypes.length === 0) {
      logger.warn(`Mirror ${mirror.name} does not support any enabled type`);
      return null;
    }

    if (supportedTypes.length === 1) {
      return this.selectMirrorForType(url, supportedTypes[0]);
    }

    for (const type of supportedTypes) {
      await this.selectMirrorForType(url, type);
    }

    return this.state.selectedMirror;
  }

  public getChecker(): MirrorChecker {
    return this.checker;
  }
}
