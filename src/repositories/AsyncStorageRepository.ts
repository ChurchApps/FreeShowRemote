import AsyncStorage from '@react-native-async-storage/async-storage';
import { IStorageRepository } from './IStorageRepository';
import { ErrorLogger } from '../services/ErrorLogger';

/**
 * AsyncStorage implementation of the storage repository
 * Provides abstraction layer over AsyncStorage with error handling and type safety
 */
export class AsyncStorageRepository implements IStorageRepository {
  private readonly logContext = 'AsyncStorageRepository';

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) {
        return null;
      }
      
      // Try to parse as JSON, if it fails return as string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      ErrorLogger.error(`Failed to get item with key: ${key}`, this.logContext, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
      ErrorLogger.debug(`Stored item with key: ${key}`, this.logContext);
    } catch (error) {
      ErrorLogger.error(`Failed to set item with key: ${key}`, this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      ErrorLogger.debug(`Removed item with key: ${key}`, this.logContext);
    } catch (error) {
      ErrorLogger.error(`Failed to remove item with key: ${key}`, this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      ErrorLogger.info('Cleared all storage items', this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to clear storage', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      ErrorLogger.debug(`Retrieved ${keys.length} storage keys`, this.logContext);
      return [...keys]; // Convert readonly array to mutable array
    } catch (error) {
      ErrorLogger.error('Failed to get all keys', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  // Typed convenience methods
  async getString(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      ErrorLogger.error(`Failed to get string with key: ${key}`, this.logContext, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      ErrorLogger.error(`Failed to get object with key: ${key}`, this.logContext, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  async setString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
      ErrorLogger.debug(`Stored string with key: ${key}`, this.logContext);
    } catch (error) {
      ErrorLogger.error(`Failed to set string with key: ${key}`, this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
      ErrorLogger.debug(`Stored object with key: ${key}`, this.logContext);
    } catch (error) {
      ErrorLogger.error(`Failed to set object with key: ${key}`, this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// Export singleton instance for easy access throughout the app
export const storageRepository = new AsyncStorageRepository();
