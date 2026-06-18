export enum MirrorType {
  NPM = "npm",
  PIP = "pip",
  DOCKER = "docker",
  GIT = "git",
  APT = "apt",
  MAVEN = "maven",
  GO = "go",
  COMPOSER = "composer",
  NUGET = "nuget",
  RUBYGEMS = "rubygems",
  CARGO = "cargo",
  GENERAL = "general",
}

export enum MirrorStatus {
  UNKNOWN = "unknown",
  HEALTHY = "healthy",
  SLOW = "slow",
  UNAVAILABLE = "unavailable",
  ERROR = "error",
}

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

export const LOG_LEVEL_MAP: Record<LogLevel, string> = {
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.WARN]: "WARN",
  [LogLevel.INFO]: "INFO",
  [LogLevel.DEBUG]: "DEBUG",
};

export enum ManagerState {
  IDLE = "idle",
  TESTING = "testing",
  READY = "ready",
  ERROR = "error",
}
