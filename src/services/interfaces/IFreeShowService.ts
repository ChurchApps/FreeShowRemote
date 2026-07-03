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
  connect(host: string, port?: number, nickname?: string): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;

  isConnected(): boolean;
  getConnectionInfo(): any;

  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;

  nextSlide(): Promise<void>;
  previousSlide(): Promise<void>;
  gotoSlide(index: number): Promise<void>;
  toggleBlackout(): Promise<void>;

  getShows(): Promise<any[]>;
  getSlides(showId: string): Promise<any[]>;
  loadShow(showId: string): Promise<void>;

  getOutputs(): Promise<any[]>;
  setOutput(outputId: string, enabled: boolean): Promise<void>;

  sendRequest(action: string, data?: any): Promise<any>;
}
