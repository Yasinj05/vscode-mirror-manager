import axios, { AxiosInstance } from "axios";
import { Mirror, MirrorTestResult } from "./types";
import { MirrorStatus, MirrorType } from "./enums";

export class MirrorChecker {
  private axiosInstance: AxiosInstance;
  private timeout: number;

  constructor(timeout: number = 10000) {
    this.timeout = timeout;
    this.axiosInstance = axios.create({
      timeout: timeout,
      headers: {
        "User-Agent": "Mirror-Manager-VSCode/1.0",
        Accept: "*/*",
      },
    });
  }

  public async testMirror(mirror: Mirror): Promise<MirrorTestResult> {
    const startTime = Date.now();

    try {
      const response = await this.axiosInstance.get(mirror.url, {
        timeout: this.timeout,
        validateStatus: (status) => status < 500,
      });

      const latency = Date.now() - startTime;
      const reachable = response.status < 400;

      const HEALTHY_THRESHOLD = 800;
      const SLOW_THRESHOLD = 2000;

      let status: MirrorStatus;
      if (!reachable) {
        status = MirrorStatus.UNAVAILABLE;
      } else if (latency < HEALTHY_THRESHOLD) {
        status = MirrorStatus.HEALTHY;
      } else if (latency < SLOW_THRESHOLD) {
        status = MirrorStatus.SLOW;
      } else {
        status = MirrorStatus.SLOW;
      }

      return {
        mirror: {
          ...mirror,
          status,
          latency,
          lastTested: new Date(),
        },
        reachable,
        latency,
        packageFound: true,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      let errorMessage = "Unknown error";

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          errorMessage = "Connection timeout";
        } else if (error.response) {
          errorMessage = `HTTP ${error.response.status}`;
        } else if (error.request) {
          errorMessage = "No response received";
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        mirror: {
          ...mirror,
          status: MirrorStatus.UNAVAILABLE,
          latency,
          error: errorMessage,
          lastTested: new Date(),
        },
        reachable: false,
        latency,
        error: errorMessage,
      };
    }
  }

  public async testMirrorsParallel(
    mirrors: Mirror[],
  ): Promise<MirrorTestResult[]> {
    const testPromises = mirrors.map((mirror) => this.testMirror(mirror));
    return Promise.all(testPromises);
  }

  public findFastestMirror(testResults: MirrorTestResult[]): Mirror | null {
    const healthyMirrors = testResults
      .filter((result) => result.mirror.status === MirrorStatus.HEALTHY)
      .sort((a, b) => a.latency - b.latency);

    if (healthyMirrors.length > 0) {
      return healthyMirrors[0].mirror;
    }

    const slowMirrors = testResults
      .filter((result) => result.mirror.status === MirrorStatus.SLOW)
      .sort((a, b) => a.latency - b.latency);

    if (slowMirrors.length > 0) {
      return slowMirrors[0].mirror;
    }

    const reachable = testResults
      .filter((result) => result.reachable)
      .sort((a, b) => a.latency - b.latency);

    return reachable.length > 0 ? reachable[0].mirror : null;
  }

  public async checkPackageOnMirror(
    mirror: Mirror,
    packageName: string,
    type:
      | MirrorType.NPM
      | MirrorType.PIP
      | MirrorType.DOCKER
      | MirrorType.MAVEN
      | MirrorType.GENERAL,
  ): Promise<boolean> {
    try {
      let url: string;

      switch (type) {
        case MirrorType.NPM:
          url = `${mirror.url}${packageName}`;
          break;
        case MirrorType.PIP:
          url = `${mirror.url}${packageName}/`;
          break;
        case MirrorType.DOCKER:
          url = `${mirror.url}v2/${packageName}/tags/list`;
          break;
        case MirrorType.MAVEN:
          url = `${mirror.url}${packageName.replace(/\./g, "/")}/`;
          break;
        default:
          return true;
      }

      const response = await this.axiosInstance.get(url, {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });

      return response.status < 400;
    } catch {
      return false;
    }
  }

  public setTimeout(timeout: number): void {
    this.timeout = timeout;
    this.axiosInstance.defaults.timeout = timeout;
  }
}
