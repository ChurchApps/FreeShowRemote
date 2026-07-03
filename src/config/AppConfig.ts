import { Platform } from 'react-native';
import { ShowOption } from '../types';
import { ErrorLogger } from '../services/ErrorLogger';

/** Centralized configuration for timeouts, ports, and other constants */
export interface NetworkConfig {
  defaultPort: number;
  connectionTimeout: number;
  autoConnectTimeout: number;
  discoveryTimeout: number;
  reconnectDelay: number;
  maxRetries: number;
  keepAliveInterval: number;
  defaultHost: string;
  hostPlaceholder: string;
  interfacePingTimeout: number;
  doubleTapDelay: number;
  fullscreenHintDuration: number;
  cornerFeedbackDuration: number;
  sidebarCloseDelay: number;
}

export interface ShowPortsConfig {
  remote: number;
  stage: number;
  control: number;
  output: number;
  api: number;
}

export interface ValidationConfig {
  maxHostLength: number;
  maxPortLength: number;
  portRange: {
    min: number;
    max: number;
  };
  ipRegexPattern: string;
  hostRegexPattern: string;
}

export interface StorageConfig {
  maxConnectionHistory: number;
}

export interface AppConfig {
  network: NetworkConfig;
  defaultShowPorts: ShowPortsConfig;
  interfaceConfigs: InterfaceConfig[];
  validation: ValidationConfig;
  storage: StorageConfig;
  isDevelopment: boolean;
  platform: 'ios' | 'android' | 'web';
}

/** Interface configuration for UI components */
export interface InterfaceConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

/** Can be overridden by environment variables or secure storage */
const DEFAULT_CONFIG: AppConfig = {
  network: {
    defaultPort: 5505,
    connectionTimeout: 10000, // 10 seconds
    autoConnectTimeout: 15000, // 15 seconds
    discoveryTimeout: 5000, // 5 seconds
    reconnectDelay: 3000, // 3 seconds
    maxRetries: 3,
    keepAliveInterval: 30000, // 30 seconds
    defaultHost: '192.168.1.100',
    hostPlaceholder: '192.168.1.100',
    interfacePingTimeout: 2000, // 2 seconds
    doubleTapDelay: 300, // milliseconds
    fullscreenHintDuration: 3000, // 3 seconds
    cornerFeedbackDuration: 200, // milliseconds
    sidebarCloseDelay: 150, // milliseconds
  },
  defaultShowPorts: {
    remote: 5510,
    stage: 5511,
    control: 5512,
    output: 5513,
    api: 5505,
  },
  interfaceConfigs: [
    {
      id: 'remote',
      title: 'RemoteShow',
      description: 'Control slides and presentations',
      icon: 'play-circle',
      color: '#8B5CF6',
    },
    {
      id: 'stage',
      title: 'StageShow',
      description: 'Display for people on stage',
      icon: 'desktop',
      color: '#06D6A0',
    },
    {
      id: 'control',
      title: 'ControlShow',
      description: 'Control interface for operators',
      icon: 'settings',
      color: '#118AB2',
    },
    {
      id: 'output',
      title: 'OutputShow',
      description: 'Output display for screens',
      icon: 'tv',
      color: '#FFD166',
    },
    {
      id: 'api',
      title: 'API Controls',
      description: 'Native API controls',
      icon: 'code-slash',
      color: '#F72585',
    },
  ],
  validation: {
    maxHostLength: 253, // RFC compliant max domain length
    maxPortLength: 5,
    portRange: {
      min: 1,
      max: 65535,
    },
    // IPv4 and IPv6 validation patterns
    ipRegexPattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$',
    // Hostname validation (RFC 1123 compliant)
    hostRegexPattern: '^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$',
  },
  storage: {
    maxConnectionHistory: 50, // Maximum number of connections to store in history
  },
  isDevelopment: __DEV__,
  platform: Platform.OS as 'ios' | 'android' | 'web',
};

/** Configuration service for managing app settings */
class ConfigService {
  private config: AppConfig = DEFAULT_CONFIG;

  getConfig(): AppConfig {
    return { ...this.config };
  }

  getNetworkConfig(): NetworkConfig {
    return { ...this.config.network };
  }

  getDefaultShowPorts(): ShowPortsConfig {
    return { ...this.config.defaultShowPorts };
  }

  getValidationConfig(): ValidationConfig {
    return { ...this.config.validation };
  }

  getStorageConfig(): StorageConfig {
    return { ...this.config.storage };
  }

  getInterfaceConfigs(): InterfaceConfig[] {
    return [...this.config.interfaceConfigs];
  }

  getInterfaceConfig(id: string): InterfaceConfig | undefined {
    return this.config.interfaceConfigs.find(config => config.id === id);
  }

  createShowOptions(ports: Record<string, number> = {}): ShowOption[] {
    const isTV = this.config.platform === 'ios' || this.config.platform === 'android' ? (Platform as any).isTV : false;
    const interfaces = this.config.interfaceConfigs.filter(cfg => !(isTV && cfg.id === 'api'));
    return interfaces.map(config => ({
      ...config,
      port: ports[config.id] ?? this.config.defaultShowPorts[config.id as keyof ShowPortsConfig] ?? 0,
    }));
  }

  separateInterfaceOptions(options: ShowOption[]) {
    const enabledOptions: ShowOption[] = [];
    const disabledOptions: ShowOption[] = [];

    options.forEach(option => {
      if (option.port && option.port > 0) {
        enabledOptions.push(option);
      } else {
        disabledOptions.push({ ...option, port: 0 });
      }
    });

    return {
      enabledOptions,
      disabledOptions,
      allOptions: [...enabledOptions, ...disabledOptions],
    };
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      network: { ...this.config.network, ...updates.network },
      defaultShowPorts: { ...this.config.defaultShowPorts, ...updates.defaultShowPorts },
      interfaceConfigs: updates.interfaceConfigs ?? this.config.interfaceConfigs,
      validation: { ...this.config.validation, ...updates.validation },
      storage: { ...this.config.storage, ...updates.storage },
    };
  }

  async loadConfiguration(): Promise<void> {
    try {
      if (this.config.isDevelopment) {
        this.config.network.connectionTimeout = 15000;
      }
    } catch (error) {
      ErrorLogger.warn('Failed to load configuration, using defaults', 'ConfigService', error instanceof Error ? error : new Error(String(error)));
    }
  }

  isValidPort(port: number): boolean {
    const { portRange } = this.config.validation;
    return Number.isInteger(port) && port >= portRange.min && port <= portRange.max;
  }

  isValidIP(ip: string): boolean {
    const { ipRegexPattern } = this.config.validation;
    return new RegExp(ipRegexPattern).test(ip);
  }

  isValidHostname(hostname: string): boolean {
    const { hostRegexPattern, maxHostLength } = this.config.validation;
    return hostname.length <= maxHostLength && new RegExp(hostRegexPattern).test(hostname);
  }
}

export const configService = new ConfigService();
export { DEFAULT_CONFIG };
