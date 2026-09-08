export class Logger {
  static info(...args: any[]) {
    if (import.meta.env.DEV) console.info('[SubShelf]', ...args);
  }
  static warn(...args: any[]) {
    if (import.meta.env.DEV) console.warn('[SubShelf]', ...args);
  }
  static error(...args: any[]) {
    // Always log errors even in production for post-mortem debugging
    console.error('[SubShelf]', ...args);
  }
}
