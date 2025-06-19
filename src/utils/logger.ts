import { LogLevel, LoggingOptions } from '../types/sdk';

class Logger {
  private enabled: boolean = true;
  private level: LogLevel = 'silent';
  private timers: Map<string, number> = new Map();
  
  private logLevels: Record<LogLevel, number> = {
    'silent': 0,
    'error': 1,
    'warn': 2,
    'info': 3,
    'debug': 4,
  };

  configure(options: LoggingOptions = {}) {
    this.enabled = options.enabled !== false;
    
    // If enabled is explicitly true but no level is specified, default to 'error'
    if (options.enabled === true && !options.level) {
      this.level = 'error';
    } else {
      this.level = options.level || 'silent';
    }
  }

  getConfig(): LoggingOptions {
    return {
      enabled: this.enabled,
      level: this.level
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabled && this.logLevels[level] <= this.logLevels[this.level];
  }

  error(...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(...args);
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(...args);
    }
  }

  info(...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(...args);
    }
  }

  debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(...args);
    }
  }

  time(label: string) {
    if (this.shouldLog('debug')) {
      this.timers.set(label, Date.now());
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (this.shouldLog('debug')) {
      console.timeEnd(label);
      this.timers.delete(label);
    }
  }
}

export const logger = new Logger();