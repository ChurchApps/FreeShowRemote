import { IStorageRepository, StorageKeys } from './IStorageRepository';
import { storageRepository } from './AsyncStorageRepository';
import { ErrorLogger } from '../services/ErrorLogger';

// Types for discovery domain

export interface DiscoveryResult {
  host: string;
  port: number;
  name: string;
  type: string;
  discoveredAt: string; // ISO date string
  metadata?: Record<string, any>;
}

/**
 * Lightweight repository for managing discovery cache
 * Handles persistence of discovery-related data only
 */
export class ConnectionRepository {
  private readonly logContext = 'ConnectionRepository';
  private storage: IStorageRepository;

  constructor(storage: IStorageRepository = storageRepository) {
    this.storage = storage;
  }

  // Discovery Results (temporary cache)
  async getDiscoveryResults(): Promise<DiscoveryResult[]> {
    try {
      const results = await this.storage.getObject<DiscoveryResult[]>(StorageKeys.DISCOVERY_CACHE);
      return results || [];
    } catch (error) {
      ErrorLogger.error('Failed to get discovery results', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async setDiscoveryResults(results: DiscoveryResult[]): Promise<void> {
    try {
      await this.storage.setObject(StorageKeys.DISCOVERY_CACHE, results);
      ErrorLogger.debug(`Cached ${results.length} discovery results`, this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to set discovery results', this.logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async addDiscoveryResult(result: Omit<DiscoveryResult, 'discoveredAt'>): Promise<void> {
    try {
      const results = await this.getDiscoveryResults();
      const discoveryResult: DiscoveryResult = {
        ...result,
        discoveredAt: new Date().toISOString(),
      };
      
      // Remove existing result for same host:port
      const filteredResults = results.filter(r => !(r.host === result.host && r.port === result.port));
      filteredResults.push(discoveryResult);
      
      // Keep only results from last 24 hours
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
      const recentResults = filteredResults.filter(r => new Date(r.discoveredAt).getTime() > cutoffTime);
      
      await this.setDiscoveryResults(recentResults);
    } catch (error) {
      ErrorLogger.error('Failed to add discovery result', this.logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async clearDiscoveryCache(): Promise<void> {
    try {
      await this.storage.removeItem(StorageKeys.DISCOVERY_CACHE);
      ErrorLogger.info('Cleared discovery cache', this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to clear discovery cache', this.logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }


}

// Export singleton instance
export const connectionRepository = new ConnectionRepository();
