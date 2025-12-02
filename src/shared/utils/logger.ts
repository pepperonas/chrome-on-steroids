/**
 * Logging Utility
 */
export class Logger {
  private static readonly PREFIX = '[Chrome On Steroids]';

  static info(...args: unknown[]): void {
    console.log(this.PREFIX, ...args);
  }

  static error(...args: unknown[]): void {
    console.error(this.PREFIX, ...args);
  }

  static warn(...args: unknown[]): void {
    console.warn(this.PREFIX, ...args);
  }

  static debug(...args: unknown[]): void {
    // Debug logging - can be filtered in browser console
    console.debug(this.PREFIX, ...args);
  }
}

