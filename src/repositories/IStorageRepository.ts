export interface IStorageRepository {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;

  getString(key: string): Promise<string | null>;
  getObject<T>(key: string): Promise<T | null>;
  setString(key: string, value: string): Promise<void>;
  setObject<T>(key: string, value: T): Promise<void>;
}

export const StorageKeys = {
  CONNECTION_HISTORY: 'connection_history',
  APP_SETTINGS: 'app_settings',
  USER_PREFERENCES: 'user_preferences',
  LAST_CONNECTION: 'last_connection',
  SECURITY_CONFIG: 'security_config',
  API_FAVORITES: 'api_favorites',
  SAVED_CONNECTIONS: 'saved_connections',
  CONNECTION_SESSIONS: 'connection_sessions',
  DISCOVERY_CACHE: 'discovery_cache',
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];
