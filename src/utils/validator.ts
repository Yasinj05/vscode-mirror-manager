import { LogLevel } from "../core/enums";

export function parseLogLevel(value: string): LogLevel {
  const normalized = value.toLowerCase();
  switch (normalized) {
    case "error":
      return LogLevel.ERROR;
    case "warn":
      return LogLevel.WARN;
    case "info":
      return LogLevel.INFO;
    case "debug":
      return LogLevel.DEBUG;
    default:
      return LogLevel.INFO;
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function formatLatency(ms: number): string {
  if (ms < 0) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
