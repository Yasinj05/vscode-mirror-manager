import * as vscode from "vscode";
import { LOG_LEVEL_MAP, LogLevel } from "../core/enums";

const SEPARATOR = "─".repeat(56);

const LEVEL_ICONS: Record<LogLevel, string> = {
  [LogLevel.ERROR]: "✖",
  [LogLevel.WARN]: "⚠",
  [LogLevel.INFO]: "•",
  [LogLevel.DEBUG]: "…",
};

class Logger {
  private outputChannel: vscode.OutputChannel | undefined;
  private level: LogLevel = LogLevel.INFO;
  private inSection = false;

  public initialize(context: vscode.ExtensionContext): void {
    if (this.outputChannel) {
      return;
    }

    this.outputChannel = vscode.window.createOutputChannel("Mirror Manager");
    context.subscriptions.push(this.outputChannel);
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }

  public section(title: string, options?: { show?: boolean }): void {
    this.blank();
    this.appendRaw(SEPARATOR);
    this.appendRaw(`  ▶ ${title}  ${this.formatTime()}`);
    this.appendRaw(SEPARATOR);
    this.inSection = true;

    if (options?.show !== false) {
      this.show();
    }
  }

  public sectionEnd(status?: string): void {
    if (!this.inSection) {
      return;
    }

    if (status) {
      this.info(status);
    }

    this.appendRaw(SEPARATOR);
    this.blank();
    this.inSection = false;
  }

  public blank(): void {
    this.appendRaw("");
  }

  public block(content: string): void {
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.trim() === "") {
        this.appendRaw(this.inSection ? "  │" : "");
        continue;
      }

      this.appendRaw(this.inSection ? `  │   ${line}` : `     ${line}`);
    }
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

  private formatTime(): string {
    return new Date().toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  private formatLine(level: LogLevel, message: string): string {
    const icon = LEVEL_ICONS[level];
    const levelLabel = LOG_LEVEL_MAP[level].padEnd(5, " ");

    if (this.inSection) {
      return `  │ ${icon} ${message}`;
    }

    return `${this.formatTime()}  ${levelLabel} ${icon} ${message}`;
  }

  private appendRaw(line: string): void {
    if (!this.outputChannel) {
      if (line) {
        console.log(line);
      } else {
        console.log();
      }
      return;
    }

    this.outputChannel.appendLine(line);
  }

  private appendArgs(args: any[]): void {
    for (const arg of args) {
      const lines = this.formatArg(arg);
      for (const line of lines) {
        this.appendRaw(this.inSection ? `  │     ${line}` : `           ${line}`);
      }
    }
  }

  private formatArg(arg: any): string[] {
    if (arg instanceof Error) {
      return [arg.message, ...(arg.stack ? arg.stack.split("\n").slice(1) : [])];
    }

    if (typeof arg === "string") {
      return arg.split("\n");
    }

    if (arg === undefined || arg === null) {
      return [String(arg)];
    }

    try {
      return JSON.stringify(arg, null, 2).split("\n");
    } catch {
      return [String(arg)];
    }
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    this.appendRaw(this.formatLine(level, message));

    if (args.length > 0) {
      this.appendArgs(args);
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
    this.outputChannel?.show();
  }

  public clear(): void {
    this.outputChannel?.clear();
  }
}

export const logger = new Logger();
