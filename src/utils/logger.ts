import * as vscode from "vscode";
import { LOG_LEVEL_MAP, LogLevel } from "../core/enums";

class Logger {
  private outputChannel: vscode.OutputChannel;
  private level: LogLevel = LogLevel.INFO;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Mirror Manager");
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.ERROR,
      LogLevel.WARN,
      LogLevel.INFO,
      LogLevel.DEBUG,
    ];
    return levels.indexOf(level) <= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelStr = LOG_LEVEL_MAP[level];
    const formatted = `[${timestamp}] [${levelStr}] ${message}`;

    this.outputChannel.appendLine(formatted);

    if (args.length > 0) {
      try {
        this.outputChannel.appendLine(JSON.stringify(args, null, 2));
      } catch {
        this.outputChannel.appendLine(String(args));
      }
    }
  }

  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  public show(): void {
    this.outputChannel.show();
  }

  public clear(): void {
    this.outputChannel.clear();
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}

export const logger = new Logger();
