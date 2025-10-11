// Settings Context - Handles app settings and connection history

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  settingsRepository,
  AppSettings,
  ConnectionHistory,
} from '../repositories/SettingsRepository';
import { ErrorLogger } from '../services/ErrorLogger';
import { quickActionsService } from '../services/QuickActionsService';

export interface SettingsState {
  appSettings: AppSettings;
  connectionHistory: ConnectionHistory[];
  isLoading: boolean;
  error: string | null;
}

export interface SettingsActions {
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  refreshConnectionHistory: () => Promise<void>;
  removeFromHistory: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  getLastConnection: () => Promise<ConnectionHistory | null>;
  clearError: () => void;
}

export interface SettingsContextType {
  settings: AppSettings | null;
  history: ConnectionHistory[];
  isLoading: boolean;
  error: string | null;
  actions: {
    updateSettings: (partialSettings: Partial<AppSettings>) => Promise<void>;
    reloadSettings: () => Promise<void>;
    refreshHistory: () => Promise<void>;
    removeFromHistory: (id: string) => Promise<void>;
    clearHistory: () => Promise<void>;
    clearError: () => void;
  };
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

interface SettingsProviderProps {
  children: ReactNode;
  autoLoad?: boolean; // Whether to load settings automatically on mount
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ 
  children, 
  autoLoad: _autoLoad = true 
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [history, setHistory] = useState<ConnectionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [appSettings, connectionHistory] = await Promise.all([
        settingsRepository.getAppSettings(),
        settingsRepository.getConnectionHistory(),
      ]);
      setSettings(appSettings);
      setHistory(connectionHistory);
      setError(null);
      
      // Update quick actions with recent connections
      await quickActionsService.updateRecentConnections(connectionHistory);
      
      ErrorLogger.debug('Settings and history loaded', 'SettingsProvider', {
        settingsLoaded: !!appSettings,
        historyCount: connectionHistory.length,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err.message);
      ErrorLogger.error(
        'Failed to load settings or history',
        'SettingsProvider',
        err
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const updateSettings = useCallback(
    async (partialSettings: Partial<AppSettings>) => {
      try {
        const updatedSettings = await settingsRepository.updateAppSettings(
          partialSettings
        );
        setSettings(updatedSettings);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err.message);
        ErrorLogger.error('Failed to update settings', 'SettingsProvider', err);
      }
    },
    []
  );

  const reloadSettings = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  const refreshHistory = useCallback(async () => {
    try {
      const connectionHistory = await settingsRepository.getConnectionHistory();
      setHistory(connectionHistory);
      
      // Update quick actions with recent connections
      await quickActionsService.updateRecentConnections(connectionHistory);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err.message);
      ErrorLogger.error('Failed to refresh history', 'SettingsProvider', err);
    }
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    try {
      await settingsRepository.removeFromConnectionHistory(id);
      await refreshHistory();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err.message);
      ErrorLogger.error('Failed to remove from history', 'SettingsProvider', err);
    }
  }, [refreshHistory]);

  const clearHistory = useCallback(async () => {
    try {
      await settingsRepository.clearConnectionHistory();
      await refreshHistory();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err.message);
      ErrorLogger.error('Failed to clear history', 'SettingsProvider', err);
    }
  }, [refreshHistory]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);


  const contextValue: SettingsContextType = {
    settings,
    history,
    isLoading,
    error,
    actions: {
      updateSettings,
      reloadSettings,
      refreshHistory,
      removeFromHistory,
      clearHistory,
      clearError,
    },
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
