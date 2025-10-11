// Interface for storage repository to abstract data persistence
export interface IStorageRepository {
  // Generic storage operations
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  
  // Typed operations for specific data types
  getString(key: string): Promise<string | null>;
  getObject<T>(key: string): Promise<T | null>;
  setString(key: string, value: string): Promise<void>;
  setObject<T>(key: string, value: T): Promise<void>;
}

// Storage keys constants to avoid magic strings
export const StorageKeys = {
  // Settings domain
  CONNECTION_HISTORY: 'connection_history',
  APP_SETTINGS: 'app_settings',
  USER_PREFERENCES: 'user_preferences',
  LAST_CONNECTION: 'last_connection',
  SECURITY_CONFIG: 'security_config',
  
  // Connection domain
  SAVED_CONNECTIONS: 'saved_connections',
  CONNECTION_SESSIONS: 'connection_sessions',
  DISCOVERY_CACHE: 'discovery_cache',
  
  // Future domains can be added here
  // Show domain: SHOW_DATA, SLIDE_CACHE, etc.
  // Media domain: MEDIA_CACHE, THUMBNAILS, etc.
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];
