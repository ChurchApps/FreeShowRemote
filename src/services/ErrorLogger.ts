// Error logging and reporting service
const packageJson = require('../../package.json');

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context?: string;
  error?: Error;
  metadata?: Record<string, any>;
}

export class ErrorLogger {
  private static logs: LogEntry[] = [];
  private static maxLogs = 1000;
  private static listeners: ((entry: LogEntry) => void)[] = [];
  private static isProduction = !__DEV__;

  static log(level: LogEntry['level'], message: string, context?: string, error?: Error, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      error,
      metadata,
    };

    this.logs.unshift(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (listenerError) {
        console.error('Error in log listener:', listenerError);
      }
    });

    // Console output based on environment and log level
    this.outputToConsole(level, message, context, metadata, error);
  }

  private static outputToConsole(
    level: LogEntry['level'], 
    message: string, 
    context?: string, 
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    // In production, only log errors and above
    if (this.isProduction && level !== 'error' && level !== 'fatal') {
      return;
    }

    const prefix = `[${level.toUpperCase()}]${context ? ` [${context}]` : ''}`;
    
    switch (level) {
      case 'debug':
        if (!this.isProduction) {
          console.debug(prefix, message, metadata);
        }
        break;
      case 'info':
        if (!this.isProduction) {
          console.info(prefix, message, metadata);
        }
        break;
      case 'warn':
        console.warn(prefix, message, metadata, error);
        break;
      case 'error':
      case 'fatal':
        console.error(prefix, message, metadata, error);
        break;
    }
  }

  static debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('debug', message, context, undefined, metadata);
  }

  static info(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('info', message, context, undefined, metadata);
  }

  static warn(message: string, context?: string, error?: Error, metadata?: Record<string, any>) {
    this.log('warn', message, context, error, metadata);
  }

  static error(message: string, context?: string, error?: Error, metadata?: Record<string, any>) {
    this.log('error', message, context, error, metadata);
  }

  static fatal(message: string, context?: string, error?: Error, metadata?: Record<string, any>) {
    this.log('fatal', message, context, error, metadata);
  }

  static getLogs(level?: LogEntry['level'], context?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (context) {
      filteredLogs = filteredLogs.filter(log => log.context === context);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }

    return filteredLogs;
  }

  static clearLogs() {
    this.logs = [];
  }

  static addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  static getStats(): {
    total: number;
    byLevel: Record<LogEntry['level'], number>;
    byContext: Record<string, number>;
    recent: LogEntry[];
  } {
    const byLevel: Record<LogEntry['level'], number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    const byContext: Record<string, number> = {};

    this.logs.forEach(log => {
      byLevel[log.level]++;
      
      if (log.context) {
        byContext[log.context] = (byContext[log.context] || 0) + 1;
      }
    });

    return {
      total: this.logs.length,
      byLevel,
      byContext,
      recent: this.logs.slice(0, 10),
    };
  }

  static exportLogs(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      appVersion: packageJson.version,
      platform: 'React Native',
      stats: this.getStats(),
      logs: this.logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
        error: log.error ? {
          name: log.error.name,
          message: log.error.message,
          stack: log.error.stack,
        } : undefined,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Helper to handle promise rejections
  static wrapAsync<T>(
    promise: Promise<T>,
    context: string,
    errorMessage?: string
  ): Promise<T> {
    return promise.catch(error => {
      this.error(
        errorMessage || 'Async operation failed',
        context,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    });
  }

  // Helper to wrap functions with error logging
  static wrapFunction<T extends (...args: any[]) => any>(
    fn: T,
    context: string,
    functionName?: string
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return this.wrapAsync(result, context, `${functionName || 'Function'} failed`);
        }
        return result;
      } catch (error) {
        this.error(
          `${functionName || 'Function'} failed`,
          context,
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    }) as T;
  }
}