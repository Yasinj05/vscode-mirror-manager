import {
  Mirror,
  ExtensionConfig,
  MirrorManagerState,
  MirrorTestResult,
} from "./types";
import { logger } from "../utils/logger";
import { MirrorStatus, ManagerState, MirrorType } from "./enums";
import { MirrorChecker } from "./mirrorChecker";

export class MirrorManager {
  private checker: MirrorChecker;
  private state: MirrorManagerState;
  private config: ExtensionConfig;

  constructor(config: ExtensionConfig) {
    this.checker = new MirrorChecker(config.timeout || 10000);
    this.config = config;
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
      this.state.mirrors = this.getDefaultMirrors();
      logger.info(`Loaded ${this.state.mirrors.length} mirrors`);
    } catch (error) {
      logger.error("Error loading mirrors:", error);
      this.state.mirrors = this.getDefaultMirrors();
    }
  }

  private getDefaultMirrors(): Mirror[] {
    return [
      {
        url: "https://mirror.shatel.ir/ubuntu/",
        name: "Shatel",
        type: [MirrorType.APT, MirrorType.GENERAL],
        status: MirrorStatus.UNKNOWN,
        metadata: { country: "IR", provider: "Shatel" },
      },
      {
        url: "https://repo-portal.ito.gov.ir/repo",
        name: "ITO Portal",
        type: [MirrorType.NPM, MirrorType.PIP, MirrorType.GENERAL],
        status: MirrorStatus.UNKNOWN,
        metadata: { country: "IR", provider: "ITO" },
      },
      {
        url: "https://hub.hamdocker.ir",
        name: "HamDocker",
        type: [MirrorType.DOCKER],
        status: MirrorStatus.UNKNOWN,
        metadata: { country: "IR", provider: "HamDocker" },
      },
      {
        url: "https://repo.iut.ac.ir",
        name: "IUT Mirror",
        type: [MirrorType.APT, MirrorType.GENERAL],
        status: MirrorStatus.UNKNOWN,
        metadata: {
          country: "IR",
          provider: "Isfahan University of Technology",
        },
      },
      {
        url: "https://liara.ir/mirrors",
        name: "Liara",
        type: [
          MirrorType.NPM,
          MirrorType.PIP,
          MirrorType.DOCKER,
          MirrorType.GO,
          MirrorType.COMPOSER,
          MirrorType.NUGET,
          MirrorType.GENERAL,
        ],
        status: MirrorStatus.UNKNOWN,
        metadata: { country: "IR", provider: "Liara" },
      },
      {
        url: "https://mirrors.pardisco.co",
        name: "Pardisco",
        type: [
          MirrorType.NPM,
          MirrorType.PIP,
          MirrorType.DOCKER,
          MirrorType.GO,
          MirrorType.NUGET,
          MirrorType.GENERAL,
        ],
        status: MirrorStatus.UNKNOWN,
        metadata: { country: "IR", provider: "Pardisco" },
      },
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

      // ✅ به‌روزرسانی وضعیت میرورها در لیست اصلی با نتایج تست
      results.forEach((result: MirrorTestResult) => {
        this.state.testCache.set(result.mirror.url, result);

        // ✅ پیدا کردن و به‌روزرسانی میرور در لیست اصلی
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
        // ✅ پیدا کردن نسخه به‌روز شده میرور از لیست اصلی
        const updatedMirror = this.state.mirrors.find(
          (m) => m.url === fastest.url,
        );
        this.state.selectedMirror = updatedMirror || fastest;
        this.state.lastTest = new Date();
        this.state.status = ManagerState.READY;
        logger.info(
          `Selected fastest mirror: ${this.state.selectedMirror.name} (${this.state.selectedMirror.latency}ms)`,
        );
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
      // ✅ به‌روزرسانی وضعیت در لیست اصلی
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
      return this.state.selectedMirror;
    } else {
      logger.warn(`Mirror ${mirror.name} is not reachable`);
      return null;
    }
  }
}
