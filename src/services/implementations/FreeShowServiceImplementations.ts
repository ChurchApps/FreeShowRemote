// Concrete implementations for FreeShow service

import { io, Socket } from 'socket.io-client';
import { 
  IFreeShowServiceConfig 
} from '../interfaces/IFreeShowService';
import { ErrorLogger } from '../ErrorLogger';
import { configService } from '../../config/AppConfig';

/**
 * Default socket factory implementation
 */
export class SocketFactory {
  createSocket(url: string, options?: any): Socket {
    return io(url, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false, // We handle reconnection manually
      timeout: configService.getNetworkConfig().connectionTimeout,
      ...options,
    });
  }
}

/**
 * Connection state manager implementation
 */
export class ConnectionStateManager {
  private connected: boolean = false;
  private connectionInfo: {
    host?: string;
    port?: number;
    connectedAt?: Date;
    lastActivity?: Date;
  } | null = null;

  setConnected(connected: boolean): void {
    this.connected = connected;
    if (connected) {
      if (!this.connectionInfo) {
        this.connectionInfo = {};
      }
      this.connectionInfo.connectedAt = new Date();
      this.connectionInfo.lastActivity = new Date();
    } else {
      this.connectionInfo = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionInfo(): {
    host?: string;
    port?: number;
    connectedAt?: Date;
    lastActivity?: Date;
  } | null {
    return this.connectionInfo;
  }

  updateActivity(): void {
    if (this.connectionInfo) {
      this.connectionInfo.lastActivity = new Date();
    }
  }

  setConnectionDetails(host: string, port: number): void {
    if (!this.connectionInfo) {
      this.connectionInfo = {};
    }
    this.connectionInfo.host = host;
    this.connectionInfo.port = port;
  }
}

/**
 * Event manager implementation
 */
export class EventManager {
  private listeners: { [key: string]: ((data: any) => void)[] } = {};
  private readonly logContext = 'EventManager';

  addListener(event: string, callback: (data: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    // Reduced logging to prevent spam
    // ErrorLogger.debug(`Added listener for event: ${event}`, this.logContext);
  }

  removeListener(event: string, callback: (data: any) => void): void {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
        // Reduced logging to prevent spam
        // ErrorLogger.debug(`Removed listener for event: ${event}`, this.logContext);
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.listeners[event];
      ErrorLogger.debug(`Removed all listeners for event: ${event}`, this.logContext);
    } else {
      this.listeners = {};
      ErrorLogger.debug('Removed all event listeners', this.logContext);
    }
  }

  emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          ErrorLogger.error(`Error in event listener for ${event}`, this.logContext, 
            error instanceof Error ? error : new Error(String(error))
          );
        }
      });
    }
  }

  getListenerCount(event: string): number {
    return this.listeners[event] ? this.listeners[event].length : 0;
  }
}

/**
 * Default service configuration
 */
export const defaultFreeShowServiceConfig: IFreeShowServiceConfig = {
  enableHeartbeat: true,
  enableAutoReconnect: true,
  enableConnectionPersistence: true,
  enableEventLogging: true,
  maxConcurrentRequests: 5,
  requestQueueSize: 100,
};

/**
 * Request queue manager for handling concurrent requests
 */
export class RequestQueueManager {
  private queue: Array<{
    id: string;
    action: string;
    data?: any;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private activeRequests = new Set<string>();
  private readonly maxConcurrentRequests: number;
  private readonly maxQueueSize: number;
  private readonly logContext = 'RequestQueueManager';

  constructor(maxConcurrentRequests: number = 5, maxQueueSize: number = 100) {
    this.maxConcurrentRequests = maxConcurrentRequests;
    this.maxQueueSize = maxQueueSize;
  }

  async addRequest(
    action: string, 
    data?: any, 
    executor?: (action: string, data?: any) => Promise<any>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error('Request queue is full'));
        return;
      }

      this.queue.push({
        id: requestId,
        action,
        data,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      ErrorLogger.debug(`Request queued: ${action}`, this.logContext, { requestId, queueLength: this.queue.length });
      this.processQueue(executor);
    });
  }

  private async processQueue(executor?: (action: string, data?: any) => Promise<any>): Promise<void> {
    if (!executor || this.activeRequests.size >= this.maxConcurrentRequests || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.activeRequests.add(request.id);
    ErrorLogger.debug(`Processing request: ${request.action}`, this.logContext, { requestId: request.id });

    try {
      const result = await executor(request.action, request.data);
      request.resolve(result);
      ErrorLogger.debug(`Request completed: ${request.action}`, this.logContext, { requestId: request.id });
    } catch (error) {
      request.reject(error instanceof Error ? error : new Error(String(error)));
      ErrorLogger.error(`Request failed: ${request.action}`, this.logContext, 
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      this.activeRequests.delete(request.id);
      // Process next request
      setTimeout(() => this.processQueue(executor), 0);
    }
  }

  getQueueStatus(): {
    queueLength: number;
    activeRequests: number;
    maxConcurrentRequests: number;
    maxQueueSize: number;
  } {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests.size,
      maxConcurrentRequests: this.maxConcurrentRequests,
      maxQueueSize: this.maxQueueSize,
    };
  }

  clearQueue(): void {
    // Reject all pending requests
    this.queue.forEach(request => {
      request.reject(new Error('Request queue cleared'));
    });
    this.queue = [];
    ErrorLogger.info('Request queue cleared', this.logContext);
  }
}
