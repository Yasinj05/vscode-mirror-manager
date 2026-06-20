import axios from "axios";
import { parse } from "yaml";
import { Mirror, MirrorSource } from "./types";
import { MirrorStatus, MirrorType, LogLevel } from "./enums";
import { logger } from "../utils/logger";

export class MirrorSourceManager {
  private sources: MirrorSource[] = [];

  constructor() {
    this.sources = [
      {
        name: "Mirava (Iranian Mirrors)",
        url: "https://raw.githubusercontent.com/MiravaOrg/Mirava/main/mirrors_list.yaml",
        format: "yaml",
        enabled: true,
        priority: 1,
      },
    ];
  }

  public async loadAllMirrors(): Promise<Mirror[]> {
    const allMirrors: Mirror[] = [];

    for (const source of this.sources) {
      if (!source.enabled) continue;

      try {
        const mirrors = await this.loadFromSource(source);
        allMirrors.push(...mirrors);
        logger.info(`✅ Loaded ${mirrors.length} mirrors from ${source.name}`);
      } catch (error) {
        logger.error(`❌ Failed to load from ${source.name}:`, error);
      }
    }

    return this.removeDuplicates(allMirrors);
  }

  private async loadFromSource(source: MirrorSource): Promise<Mirror[]> {
    switch (source.format) {
      case "yaml":
        return this.loadFromYAML(source.url);
      case "json":
        return this.loadFromJSON(source.url);
      case "text":
        return this.loadFromText(source.url);
      default:
        throw new Error(`Unknown format: ${source.format}`);
    }
  }

  private async loadFromYAML(url: string): Promise<Mirror[]> {
    try {
      logger.info(`📥 Fetching YAML from ${url}...`);
      const response = await axios.get(url, { timeout: 10000 });

      if (logger.getLevel() === LogLevel.DEBUG) {
        logger.debug(
          `📊 YAML data preview: ${response.data.substring(0, 200)}...`,
        );
      }

      logger.info(`🔄 Parsing YAML...`);
      const data = parse(response.data);

      if (data && typeof data === "object") {
        const mirrors: Mirror[] = [];

        if (data.mirrors && Array.isArray(data.mirrors)) {
          logger.info(
            `✅ Found ${data.mirrors.length} mirrors in 'mirrors' array`,
          );

          for (const item of data.mirrors) {
            if (item && typeof item === "object" && item.url) {
              const mirror: Mirror = {
                url: item.url,
                name: item.name || "Unknown",
                type: this.parseTypes(item.type || []),
                status: MirrorStatus.UNKNOWN,
                metadata: {
                  country: item.country || "IR",
                  provider: item.provider || "Unknown",
                },
              };
              mirrors.push(mirror);
            }
          }

          logger.info(
            `✅ Successfully loaded ${mirrors.length} mirrors from YAML`,
          );
          return mirrors;
        }

        for (const [key, value] of Object.entries(
          data as Record<string, any>,
        )) {
          if (value && typeof value === "object" && value.url) {
            const mirror: Mirror = {
              url: value.url,
              name: value.name || key,
              type: this.parseTypes(value.type || []),
              status: MirrorStatus.UNKNOWN,
              metadata: {
                country: value.country || "IR",
                provider: value.provider || key,
              },
            };
            mirrors.push(mirror);
          }
        }

        if (mirrors.length > 0) {
          logger.info(
            `✅ Successfully loaded ${mirrors.length} mirrors from YAML (object format)`,
          );
          return mirrors;
        }

        logger.warn(`⚠️ No mirrors found in YAML data`);
        return [];
      }

      logger.warn(`⚠️ Invalid YAML data: data is not an object`);
      return [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          logger.error(`❌ Timeout loading YAML from ${url}`);
        } else if (error.response) {
          logger.error(
            `❌ HTTP ${error.response.status} loading YAML from ${url}`,
          );
        } else if (error.request) {
          logger.error(`❌ No response received from ${url}`);
        } else {
          logger.error(
            `❌ Axios error loading YAML from ${url}: ${error.message}`,
          );
        }
      } else {
        logger.error(`❌ Error loading YAML from ${url}:`, error);
      }
      return [];
    }
  }

  private async loadFromJSON(url: string): Promise<Mirror[]> {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;

      if (Array.isArray(data)) {
        return data.map((item) => ({
          url: item.url,
          name: item.name || item.url,
          type: this.parseTypes(item.type || []),
          status: MirrorStatus.UNKNOWN,
          metadata: item.metadata || {},
        }));
      }

      if (data.mirrors && Array.isArray(data.mirrors)) {
        return data.mirrors;
      }

      return [];
    } catch (error) {
      logger.error(`Error loading JSON from ${url}:`, error);
      return [];
    }
  }

  private async loadFromText(url: string): Promise<Mirror[]> {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const lines = response.data
        .split("\n")
        .filter((line: string) => line.trim());

      return lines.map((line: string) => ({
        url: line.trim(),
        name: `Mirror from ${url}`,
        type: [MirrorType.GENERAL],
        status: MirrorStatus.UNKNOWN,
      }));
    } catch (error) {
      logger.error(`Error loading text from ${url}:`, error);
      return [];
    }
  }

  private parseTypes(types: any): MirrorType[] {
    if (logger.getLevel() === LogLevel.DEBUG) {
      logger.debug(`🔍 parseTypes input: ${JSON.stringify(types)}`);
    }

    if (!types || types.length === 0) {
      return [MirrorType.GENERAL];
    }

    const result: MirrorType[] = [];
    const validTypes = Object.values(MirrorType) as string[];

    if (Array.isArray(types)) {
      for (const type of types) {
        const normalized = type.toLowerCase().trim();
        if (validTypes.includes(normalized)) {
          result.push(normalized as MirrorType);
        }
      }
    } else if (typeof types === "string") {
      const parts = types.split(",").map((t: string) => t.trim().toLowerCase());
      for (const type of parts) {
        if (validTypes.includes(type)) {
          result.push(type as MirrorType);
        }
      }
    }

    if (result.length === 0) {
      result.push(MirrorType.GENERAL);
    }

    return result;
  }

  private removeDuplicates(mirrors: Mirror[]): Mirror[] {
    const seen = new Set<string>();
    return mirrors.filter((mirror) => {
      const key = mirror.url;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  public addSource(source: MirrorSource): void {
    this.sources.push(source);
    logger.info(`Added mirror source: ${source.name}`);
  }

  public getSources(): MirrorSource[] {
    return this.sources;
  }

  public enableSource(name: string): void {
    const source = this.sources.find((s) => s.name === name);
    if (source) {
      source.enabled = true;
      logger.info(`Enabled source: ${name}`);
    }
  }

  public disableSource(name: string): void {
    const source = this.sources.find((s) => s.name === name);
    if (source) {
      source.enabled = false;
      logger.info(`Disabled source: ${name}`);
    }
  }
}
