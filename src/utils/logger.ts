export class Logger {
  private static isContextInvalidated(args: any[]): boolean {
    return args.some(arg => {
      if (!arg) return false;
      const str = typeof arg === 'string' ? arg : (arg?.message || String(arg));
      return str.includes('Extension context invalidated');
    });
  }

  static info(...args: any[]) {
    if (this.isContextInvalidated(args)) return;
    if (import.meta.env.DEV) console.info('[SubShelf]', ...args);
  }

  static warn(...args: any[]) {
    if (this.isContextInvalidated(args)) return;
    if (import.meta.env.DEV) console.warn('[SubShelf]', ...args);
  }

  static error(...args: any[]) {
    if (this.isContextInvalidated(args)) return;
    // Always log errors even in production for post-mortem debugging
    console.error('[SubShelf]', ...args);
  }
}
