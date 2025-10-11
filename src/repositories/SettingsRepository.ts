import { IStorageRepository, StorageKeys } from './IStorageRepository';
import { storageRepository } from './AsyncStorageRepository';
import { ErrorLogger } from '../services/ErrorLogger';
import { configService } from '../config/AppConfig';

// Types for settings domain
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoReconnect: boolean;
  autoLaunchInterface: 'none' | 'remote' | 'stage' | 'control' | 'output' | 'api';
  autoLaunchFullscreen: boolean;
  connectionTimeout: number; // in seconds
  navigationLayout: 'bottomBar' | 'sidebar' | 'floating';
  keepAwake: boolean;
}

export interface ConnectionHistory {
  id: string; // Now just the IP address
  host: string; // IP address
  nickname?: string; // User-friendly nickname/display name
  lastUsed: string; // ISO date string
  successfulConnections: number;
  showPorts?: { // Interface port configs stored per IP
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number; // Include API port as well
  };
}

/**
 * Repository for managing application settings and user preferences
 * Abstracts the underlying storage implementation
 */
export class SettingsRepository {
  private readonly logContext = 'SettingsRepository';
  private storage: IStorageRepository;

  constructor(storage: IStorageRepository = storageRepository) {
    this.storage = storage;
  }

  // App Settings
  async getAppSettings(): Promise<AppSettings> {
    try {
      const settings = await this.storage.getObject<AppSettings>(StorageKeys.APP_SETTINGS);
      if (!settings) {
        // Return default settings if none exist
        const defaultSettings: AppSettings = {
          theme: 'dark',
          notifications: true,
          autoReconnect: true,
          autoLaunchInterface: 'none',
          autoLaunchFullscreen: false,
          connectionTimeout: 10,
          navigationLayout: 'bottomBar',
          keepAwake: false,
        };
        await this.setAppSettings(defaultSettings);
        return defaultSettings;
      }
      return settings;
    } catch (error) {
      ErrorLogger.error('Failed to get app settings', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async setAppSettings(settings: AppSettings): Promise<void> {
    try {
      await this.storage.setObject(StorageKeys.APP_SETTINGS, settings);
      ErrorLogger.debug('App settings updated', this.logContext, { settings });
    } catch (error) {
      ErrorLogger.error('Failed to set app settings', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async updateAppSettings(partialSettings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const currentSettings = await this.getAppSettings();
      const updatedSettings = { ...currentSettings, ...partialSettings };
      await this.setAppSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      ErrorLogger.error('Failed to update app settings', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Connection History
  async getConnectionHistory(): Promise<ConnectionHistory[]> {
    try {
      const history = await this.storage.getObject<ConnectionHistory[]>(StorageKeys.CONNECTION_HISTORY);
      return history || [];
    } catch (error) {
      ErrorLogger.error('Failed to get connection history', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async setConnectionHistory(history: ConnectionHistory[]): Promise<void> {
    try {
      await this.storage.setObject(StorageKeys.CONNECTION_HISTORY, history);
      ErrorLogger.debug(`Updated connection history with ${history.length} entries`, this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to set connection history', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async addToConnectionHistory(
    host: string,
    port: number = configService.getNetworkConfig().defaultPort,
    nickname?: string,
    showPorts?: { remote: number; stage: number; control: number; output: number; api: number }
  ): Promise<void> {
    try {
      const history = await this.getConnectionHistory();
      const existingIndex = history.findIndex(item => item.host === host);
      
      // Get default ports if not provided, but preserve existing ports if they exist
      const defaultPorts = configService.getDefaultShowPorts();
      let portsToStore;
      
      if (showPorts) {
        // Use provided ports
        portsToStore = showPorts;
      } else if (existingIndex >= 0 && history[existingIndex].showPorts) {
        // Preserve existing ports for this connection
        portsToStore = history[existingIndex].showPorts;
      } else {
        // Use defaults for new connections
        portsToStore = {
          remote: defaultPorts.remote,
          stage: defaultPorts.stage,
          control: defaultPorts.control,
          output: defaultPorts.output,
          api: defaultPorts.api,
        };
      }
      
      if (existingIndex >= 0) {
        // Update existing entry
        history[existingIndex] = {
          ...history[existingIndex],
          lastUsed: new Date().toISOString(),
          successfulConnections: history[existingIndex].successfulConnections + 1,
          nickname: nickname || history[existingIndex].nickname || host,
          showPorts: portsToStore,
        };
      } else {
        // Add new entry
        const newEntry: ConnectionHistory = {
          id: host,
          host,
          nickname: nickname || host, // Default nickname to hostname/IP
          lastUsed: new Date().toISOString(),
          successfulConnections: 1,
          showPorts: portsToStore,
        };
        history.push(newEntry);
      }

      // Keep only the most recent connections based on config
      const maxConnections = configService.getStorageConfig().maxConnectionHistory;
      const sortedHistory = history
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
        .slice(0, maxConnections);

      await this.setConnectionHistory(sortedHistory);
      ErrorLogger.info('Added to connection history', this.logContext, { 
        host, 
        port, 
        totalConnections: sortedHistory.length,
        maxConnections 
      });
    } catch (error) {
      ErrorLogger.error('Failed to add to connection history', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async updateConnectionNickname(hostId: string, nickname: string): Promise<void> {
    try {
      const history = await this.getConnectionHistory();
      const existingIndex = history.findIndex(item => item.id === hostId || item.host === hostId);
      
      if (existingIndex >= 0) {
        history[existingIndex] = {
          ...history[existingIndex],
          nickname: nickname.trim() || history[existingIndex].host, // Fallback to host if empty
        };
        
        await this.setConnectionHistory(history);
        ErrorLogger.info('Updated connection nickname', this.logContext, { 
          hostId, 
          nickname: nickname.trim() || history[existingIndex].host 
        });
      } else {
        throw new Error(`Connection with ID ${hostId} not found in history`);
      }
    } catch (error) {
      ErrorLogger.error('Failed to update connection nickname', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async updateConnectionPorts(
    host: string,
    showPorts: { remote: number; stage: number; control: number; output: number; api: number }
  ): Promise<void> {
    try {
      const history = await this.getConnectionHistory();
      const existingIndex = history.findIndex(item => item.host === host);
      
      if (existingIndex >= 0) {
        // Update existing entry without incrementing connection count
        history[existingIndex] = {
          ...history[existingIndex],
          lastUsed: new Date().toISOString(),
          showPorts,
        };
        
        await this.setConnectionHistory(history);
        ErrorLogger.info('Updated connection ports', this.logContext, { 
          host, 
          showPorts 
        });
      } else {
        // If connection doesn't exist in history, this shouldn't happen during port updates
        // But we can handle it gracefully
        ErrorLogger.warn('Attempted to update ports for non-existent connection', this.logContext, 
          new Error(`Host not found in history: ${host}`)
        );
      }
    } catch (error) {
      ErrorLogger.error('Failed to update connection ports', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async removeFromConnectionHistory(id: string): Promise<void> {
    try {
      const history = await this.getConnectionHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      await this.setConnectionHistory(filteredHistory);
      ErrorLogger.info('Removed from connection history', this.logContext, { id });
    } catch (error) {
      ErrorLogger.error('Failed to remove from connection history', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async clearConnectionHistory(): Promise<void> {
    try {
      await this.setConnectionHistory([]);
      ErrorLogger.info('Cleared connection history', this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to clear connection history', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Last connection for auto-reconnect
  async getLastConnection(): Promise<ConnectionHistory | null> {
    try {
      const history = await this.getConnectionHistory();
      if (history.length === 0) {
        return null;
      }
      // Return the most recently used connection
      return history.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())[0];
    } catch (error) {
      ErrorLogger.error('Failed to get last connection', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  // Cleanup and maintenance
  async clearAllData(): Promise<void> {
    try {
      await this.storage.removeItem(StorageKeys.APP_SETTINGS);
      await this.storage.removeItem(StorageKeys.CONNECTION_HISTORY);
      await this.storage.removeItem(StorageKeys.USER_PREFERENCES);
      ErrorLogger.info('Cleared all settings data', this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to clear all data', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// Export singleton instance
export const settingsRepository = new SettingsRepository();
