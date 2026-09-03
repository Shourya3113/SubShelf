export class Logger {
  static info(...args: any[]) {
    if (import.meta.env.DEV) console.info('[SubDeck]', ...args);
  }
  static warn(...args: any[]) {
    if (import.meta.env.DEV) console.warn('[SubDeck]', ...args);
  }
  static error(...args: any[]) {
    if (import.meta.env.DEV) console.error('[SubDeck]', ...args);
  }
}
