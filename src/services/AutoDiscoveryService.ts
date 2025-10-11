import Zeroconf, { ZeroconfService, ZeroconfError } from 'react-native-zeroconf';
import { ErrorLogger } from './ErrorLogger';
import { configService } from '../config/AppConfig';

// Service type mappings
const SERVICE_TYPE_MAPPINGS = {
  API: { capability: 'api', portKey: 'api', isApi: true },
  REMOTE: { capability: 'remoteshow', portKey: 'remote', isApi: false },
  STAGE: { capability: 'stageshow', portKey: 'stage', isApi: false },
  CONTROLLER: { capability: 'controlshow', portKey: 'control', isApi: false },
  OUTPUT_STREAM: { capability: 'outputshow', portKey: 'output', isApi: false },
  OUTPUT: { capability: 'outputshow', portKey: 'output', isApi: false },
} as const;

export interface DiscoveredFreeShowInstance {
  name: string;
  host: string;
  port: number;
  ip: string;
  ports: {
    api?: number;
    remote?: number;
    stage?: number;
    control?: number;
    output?: number;
  };
  capabilities: string[];
  apiEnabled: boolean;
}

export type DiscoveryEventCallback = (instances: DiscoveredFreeShowInstance[]) => void;
export type ErrorEventCallback = (error: string) => void;

// Internal interface for pending service aggregation
interface PendingService {
  name: string;
  host: string;
  port: number;
  ip: string;
  capability: string;
  portKey: string;
  isApi: boolean;
}

/**
 * Parse service name to determine capability and port mapping
 */
function parseServiceCapability(serviceName: string): { 
  capability: string; 
  portKey: string; 
  isApi: boolean;
} {
  const name = serviceName?.trim() || '';
  const parts = name.split('-');
  
  // Handle new format: HOSTNAME-CONNECTION-RANDOMHEX
  if (parts.length >= 3) {
    const connectionType = parts[parts.length - 2].toUpperCase() as keyof typeof SERVICE_TYPE_MAPPINGS;
    const mapping = SERVICE_TYPE_MAPPINGS[connectionType];
    if (mapping) return mapping;
  }
  
  // Handle old format for backward compatibility
  const upperName = name.toUpperCase() as keyof typeof SERVICE_TYPE_MAPPINGS;
  const mapping = SERVICE_TYPE_MAPPINGS[upperName];
  if (mapping) return mapping;
  
  // Fallback for unknown services
  return { 
    capability: `unknown:${upperName}`, 
    portKey: upperName.toLowerCase() || 'unknown', 
    isApi: false 
  };
}

/**
 * Extract hostname from service name and format for display
 */
function getDisplayName(serviceName: string, hostName: string, ip: string): string {
  const parts = serviceName.split('-');
  
  // Extract hostname from new format service names
  if (parts.length >= 3) {
    const hostnameParts = parts.slice(0, parts.length - 2);
    return hostnameParts.join('-').replace(/-/g, ' ');
  }
  
  // Use hostname if available
  if (hostName) {
    const hostname = hostName.replace(/\.local\.?$/, '');
    if (hostname && hostname !== ip) {
      return hostname.replace(/-/g, ' ');
    }
  }
  
  return ip;
}

class AutoDiscoveryService {
  private zeroconf: Zeroconf | null = null;
  private discoveredServices: Map<string, DiscoveredFreeShowInstance> = new Map();
  private pendingServices: Map<string, PendingService[]> = new Map();
  private isScanning = false;
  private scanTimeout: NodeJS.Timeout | null = null;
  private updateThrottleTimeout: NodeJS.Timeout | null = null;
  private pendingUpdate = false;
  
  private listeners: {
    onServicesUpdated: DiscoveryEventCallback[];
    onError: ErrorEventCallback[];
  } = {
    onServicesUpdated: [],
    onError: [],
  };

  constructor() {
    try {
      this.zeroconf = new Zeroconf();
      this.setupEventListeners();
    } catch (error) {
      this.handleInitializationError(error);
    }
  }

  private handleInitializationError(error: unknown): void {
    ErrorLogger.error('❌ AutoDiscovery: Failed to initialize Zeroconf', 'AutoDiscoveryService', 
      error instanceof Error ? error : new Error(String(error)));
    
    const globalAny = global as any;
    const isExpoGo = __DEV__ && globalAny.__expo?.packagerConnection;
    
    if (isExpoGo) {
      ErrorLogger.info('💡 AutoDiscovery: Running in Expo Go - native modules not available', 'AutoDiscoveryService');
      ErrorLogger.info('🔨 AutoDiscovery: Please create a development build to use autodiscovery', 'AutoDiscoveryService');
    } else {
      ErrorLogger.info('💡 AutoDiscovery: This may be due to missing native dependencies or permissions', 'AutoDiscoveryService');
    }
    
    this.zeroconf = null;
  }

  /**
   * Aggregate multiple services for the same IP into a single DiscoveredFreeShowInstance
   */
  private aggregateServicesForIP(ip: string): void {
    const services = this.pendingServices.get(ip) || [];
    if (services.length === 0) return;
    
    const config = configService.getNetworkConfig();
    const ports: Record<string, number> = {};
    const capabilities: string[] = [];
    let displayName = ip;
    let host = '';
    
    // Process each service for this IP
    services.forEach((service: PendingService) => {
      if (service.portKey && service.port) {
        ports[service.portKey] = service.port;
      }
      
      if (service.capability && !capabilities.includes(service.capability)) {
        capabilities.push(service.capability);
      }
      
      if (service.host) {
        host = service.host;
      }
      
      // Get display name using helper function
      displayName = getDisplayName(service.name, service.host, ip);
    });
    
    // Create the aggregated instance
    const aggregatedInstance: DiscoveredFreeShowInstance = {
      name: displayName,
      host: host || '',
      port: ports.api || config.defaultPort,
      ip: ip,
      ports: {
        api: ports.api,
        remote: ports.remote,
        stage: ports.stage,
        control: ports.control,
        output: ports.output,
      },
      capabilities: capabilities,
      apiEnabled: capabilities.length > 0,
    };
    
    this.discoveredServices.set(ip, aggregatedInstance);
  }

  private setupEventListeners(): void {
    if (!this.zeroconf) {
      ErrorLogger.warn('⚠️ AutoDiscovery: Zeroconf not initialized, skipping event listeners setup', 'AutoDiscoveryService');
      return;
    }

    this.zeroconf.on('start', () => {
      ErrorLogger.info('🔍 AutoDiscovery: Started scanning for FreeShow instances', 'AutoDiscoveryService');
    });

    this.zeroconf.on('stop', () => {
      ErrorLogger.info('🛑 AutoDiscovery: Stopped scanning', 'AutoDiscoveryService');
      this.isScanning = false;
      this.clearScanTimeout();
    });

    this.zeroconf.on('error', (error: ZeroconfError) => {
      ErrorLogger.error('❌ AutoDiscovery Error', 'AutoDiscoveryService', new Error(error.message || 'Unknown error'));
      this.notifyError(`Discovery error: ${error.message || 'Unknown error'}`);
    });

    // Service resolved (we get the full details)
    this.zeroconf.on('resolved', (service: ZeroconfService) => {
      ErrorLogger.info('✅ AutoDiscovery: FreeShow service resolved', 'AutoDiscoveryService', { 
        name: service.name, 
        host: service.host, 
        port: service.port 
      });
      
      // Get the primary IP address
      const primaryIP = service.addresses?.[0] || service.host;
      
      // Parse service capability from name
      const { capability, portKey, isApi } = parseServiceCapability(service.name);
      
      // Get or create pending services for this IP
      const ipServices = this.pendingServices.get(primaryIP) || [];
      
      // Add this service to the pending list
      ipServices.push({
        name: service.name || primaryIP,
        host: service.host || '',
        port: service.port,
        ip: primaryIP,
        capability,
        portKey,
        isApi,
      });
      
      this.pendingServices.set(primaryIP, ipServices);
      
      // Aggregate all services for this IP into a single instance
      this.aggregateServicesForIP(primaryIP);
      
      this.notifyServicesUpdatedThrottled();
    });

    // Service removed
    this.zeroconf.on('remove', (service: ZeroconfService) => {
      ErrorLogger.info('🗑️ AutoDiscovery: FreeShow service removed', 'AutoDiscoveryService', { serviceName: service.name });
      const primaryIP = service.addresses?.[0] || service.host;
      
      // Remove the specific service from pending services
      const ipServices = this.pendingServices.get(primaryIP) || [];
      const filteredServices = ipServices.filter(s => 
        !(s.port === service.port && s.name === service.name)
      );
      
      if (filteredServices.length === 0) {
        // No more services for this IP, remove completely
        this.pendingServices.delete(primaryIP);
        this.discoveredServices.delete(primaryIP);
      } else {
        // Re-aggregate remaining services
        this.pendingServices.set(primaryIP, filteredServices);
        this.aggregateServicesForIP(primaryIP);
      }
      
      this.notifyServicesUpdatedThrottled();
    });
  }

  startDiscovery(): void {
    if (!this.zeroconf) {
      const error = 'Autodiscovery requires a development build. Please use manual connection.';
      ErrorLogger.error('❌ AutoDiscovery', 'AutoDiscoveryService', new Error(error));
      this.notifyError(error);
      return;
    }

    if (this.isScanning) {
      ErrorLogger.info('🔄 AutoDiscovery: Restarting scan on new request', 'AutoDiscoveryService');
      this.restartDiscovery();
      return;
    }

    const config = configService.getNetworkConfig();
    
    try {
      ErrorLogger.info(`🔍 AutoDiscovery: Starting scan for FreeShow services (${config.discoveryTimeout / 1000}s timeout)...`, 'AutoDiscoveryService');
      
      // Force stop any previous scan to ensure clean state
      try {
        this.zeroconf.stop();
      } catch {
        ErrorLogger.debug('Previous scan stop attempt (expected if not running)', 'AutoDiscoveryService');
      }
      
      // Clear all state for fresh scan
      this.discoveredServices.clear();
      this.pendingServices.clear();
      this.isScanning = true;
      
      this.setScanTimeout();
      
      // Small delay to ensure zeroconf is properly stopped before starting
      setTimeout(() => {
        try {
          this.zeroconf?.scan('freeshow', 'udp');
        } catch (scanError) {
          ErrorLogger.error('❌ AutoDiscovery: Failed to start scan after delay', 'AutoDiscoveryService', 
            scanError instanceof Error ? scanError : new Error(String(scanError)));
          this.isScanning = false;
          this.notifyError(`Failed to start discovery: ${scanError}. Try using manual connection instead.`);
        }
      }, 100);
      
    } catch (error) {
      ErrorLogger.error('❌ AutoDiscovery: Failed to start scanning', 'AutoDiscoveryService', 
        error instanceof Error ? error : new Error(String(error)));
      this.isScanning = false;
      this.notifyError(`Failed to start discovery: ${error}. Try using manual connection instead.`);
    }
  }

  stopDiscovery(): void {
    if (!this.zeroconf) {
      ErrorLogger.warn('⚠️ AutoDiscovery: Zeroconf not initialized', 'AutoDiscoveryService');
      return;
    }

    if (!this.isScanning) {
      ErrorLogger.debug('🛑 AutoDiscovery: Not currently scanning', 'AutoDiscoveryService');
      return;
    }

    try {
      ErrorLogger.info('🛑 AutoDiscovery: Stopping scan...', 'AutoDiscoveryService');
      this.clearScanTimeout();
      this.clearUpdateThrottle();
      this.isScanning = false;
      this.zeroconf.stop();
    } catch (error) {
      ErrorLogger.error('❌ AutoDiscovery: Failed to stop scanning', 'AutoDiscoveryService', error instanceof Error ? error : new Error(String(error)));
      this.notifyError(`Failed to stop discovery: ${error}`);
    }
  }

  getDiscoveredServices(): DiscoveredFreeShowInstance[] {
    return Array.from(this.discoveredServices.values());
  }

  isActive(): boolean {
    return this.isScanning;
  }

  isAvailable(): boolean {
    return this.zeroconf !== null;
  }

  onServicesUpdated(callback: DiscoveryEventCallback): void {
    this.listeners.onServicesUpdated.push(callback);
  }

  onError(callback: ErrorEventCallback): void {
    this.listeners.onError.push(callback);
  }

  removeListener(event: 'onServicesUpdated' | 'onError', callback: DiscoveryEventCallback | ErrorEventCallback): void {
    if (event === 'onServicesUpdated') {
      const index = this.listeners.onServicesUpdated.indexOf(callback as DiscoveryEventCallback);
      if (index > -1) {
        this.listeners.onServicesUpdated.splice(index, 1);
      }
    } else if (event === 'onError') {
      const index = this.listeners.onError.indexOf(callback as ErrorEventCallback);
      if (index > -1) {
        this.listeners.onError.splice(index, 1);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.onServicesUpdated = [];
    this.listeners.onError = [];
  }

  restartDiscovery(): void {
    ErrorLogger.info('🔄 AutoDiscovery: Force restarting discovery...', 'AutoDiscoveryService');
    
    this.stopDiscovery();
    
    setTimeout(() => {
      this.startDiscovery();
    }, 200);
  }

  destroy(): void {
    this.stopDiscovery();
    this.removeAllListeners();
    this.discoveredServices.clear();
    this.pendingServices.clear();
    this.clearScanTimeout();
    this.clearUpdateThrottle();
    
    // Clean up Zeroconf instance
    if (this.zeroconf) {
      try {
        this.zeroconf.removeAllListeners();
        this.zeroconf = null;
      } catch (error) {
        ErrorLogger.warn('Error cleaning up Zeroconf instance', 'AutoDiscoveryService', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private setScanTimeout(): void {
    this.clearScanTimeout();
    const config = configService.getNetworkConfig();
    
    this.scanTimeout = setTimeout(() => {
      const discoveredCount = this.discoveredServices.size;
      const timeoutSeconds = config.discoveryTimeout / 1000;
      
      if (discoveredCount === 0) {
        ErrorLogger.info(`⏰ AutoDiscovery: Scan timeout reached (${timeoutSeconds}s) with no devices found, stopping discovery`, 'AutoDiscoveryService');
        this.notifyError(`No FreeShow devices found after ${timeoutSeconds} seconds. Try manual connection or ensure FreeShow is running on your network.`);
      } else {
        ErrorLogger.info(`⏰ AutoDiscovery: Scan timeout reached (${timeoutSeconds}s), found ${discoveredCount} device(s), stopping discovery`, 'AutoDiscoveryService');
      }
      this.stopDiscovery();
    }, config.discoveryTimeout);
  }

  private clearScanTimeout(): void {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  private clearUpdateThrottle(): void {
    if (this.updateThrottleTimeout) {
      clearTimeout(this.updateThrottleTimeout);
      this.updateThrottleTimeout = null;
    }
    this.pendingUpdate = false;
  }

  /**
   * Throttled version of notifyServicesUpdated to prevent excessive updates
   */
  private notifyServicesUpdatedThrottled(): void {
    // If we already have a pending update, just mark that we need to update
    if (this.updateThrottleTimeout) {
      this.pendingUpdate = true;
      return;
    }

    // Immediately notify for the first event
    this.notifyServicesUpdated();
    
    // Set up throttling for subsequent events
    this.updateThrottleTimeout = setTimeout(() => {
      this.updateThrottleTimeout = null;
      
      // If there was a pending update during throttle period, process it now
      if (this.pendingUpdate) {
        this.pendingUpdate = false;
        this.notifyServicesUpdated();
      }
    }, 500); // Use hardcoded value for simplicity
  }

  private notifyServicesUpdated(): void {
    const services = this.getDiscoveredServices();
    this.listeners.onServicesUpdated.forEach(callback => {
      try {
        callback(services);
      } catch (error) {
        ErrorLogger.error('❌ Error in services updated callback', 'AutoDiscoveryService', error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private notifyError(error: string): void {
    ErrorLogger.warn(`⚠️ AutoDiscovery: ${error}`, 'AutoDiscoveryService');
    
    this.listeners.onError.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        ErrorLogger.error('❌ Error in error callback', 'AutoDiscoveryService', err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
}

// Export singleton instance
export const autoDiscoveryService = new AutoDiscoveryService();