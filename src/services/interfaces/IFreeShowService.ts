// Interfaces for FreeShow service

/**
 * Configuration interface for FreeShow service
 */
export interface IFreeShowServiceConfig {
  enableHeartbeat: boolean;
  enableAutoReconnect: boolean;
  enableConnectionPersistence: boolean;
  enableEventLogging: boolean;
  maxConcurrentRequests: number;
  requestQueueSize: number;
}

/**
 * Interface for FreeShow service itself
 */
export interface IFreeShowService {
  // Connection management
  connect(host: string, port?: number, nickname?: string): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;

  // Connection state
  isConnected(): boolean;
  getConnectionInfo(): any;

  // Event management
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;

  // Remote control
  nextSlide(): Promise<void>;
  previousSlide(): Promise<void>;
  gotoSlide(index: number): Promise<void>;
  toggleBlackout(): Promise<void>;

  // Show management
  getShows(): Promise<any[]>;
  getSlides(showId: string): Promise<any[]>;
  loadShow(showId: string): Promise<void>;

  // Output management
  getOutputs(): Promise<any[]>;
  setOutput(outputId: string, enabled: boolean): Promise<void>;

  // Generic request handling
  sendRequest(action: string, data?: any): Promise<any>;
}
