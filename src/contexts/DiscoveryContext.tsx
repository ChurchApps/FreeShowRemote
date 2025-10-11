// Discovery Context - Handles auto-discovery of FreeShow instances

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { autoDiscoveryService, DiscoveredFreeShowInstance } from '../services/AutoDiscoveryService';
import { ErrorLogger } from '../services/ErrorLogger';
import { connectionRepository, settingsRepository } from '../repositories';

export interface DiscoveryState {
  discoveredServices: DiscoveredFreeShowInstance[];
  isDiscovering: boolean;
  isDiscoveryAvailable: boolean;
  lastDiscoveryTime: Date | null;
  discoveryError: string | null;
}

export interface DiscoveryActions {
  startDiscovery: () => void;
  stopDiscovery: () => void;
  refreshDiscovery: () => void;
  clearDiscoveredServices: () => void;
  removeDiscoveredService: (id: string) => void;
}

export interface DiscoveryContextType {
  state: DiscoveryState;
  actions: DiscoveryActions;
}

const DiscoveryContext = createContext<DiscoveryContextType | undefined>(undefined);

interface DiscoveryProviderProps {
  children: ReactNode;
  autoStartDiscovery?: boolean; // Whether to start discovery automatically
}

export const DiscoveryProvider: React.FC<DiscoveryProviderProps> = ({ 
  children, 
  autoStartDiscovery = false 
}) => {
  const [state, setState] = useState<DiscoveryState>({
    discoveredServices: [],
    isDiscovering: false,
    isDiscoveryAvailable: autoDiscoveryService.isAvailable(),
    lastDiscoveryTime: null,
    discoveryError: null,
  });

  const logContext = 'DiscoveryProvider';

  // Set up discovery event listeners
  useEffect(() => {
    const handleServicesUpdated = (services: DiscoveredFreeShowInstance[]) => {
      setState(prev => ({
        ...prev,
        discoveredServices: services,
        lastDiscoveryTime: new Date(),
        discoveryError: null,
      }));

      // Cache discovery results
      services.forEach(service => {
        connectionRepository.addDiscoveryResult({
          host: service.host,
          port: service.port,
          name: service.name,
          type: 'freeshow',
          metadata: { 
            ip: service.ip,
            ports: service.ports,
            capabilities: service.capabilities,
            apiEnabled: service.apiEnabled,
          },
        }).catch(error => {
          ErrorLogger.warn('Failed to cache discovery result', logContext, error instanceof Error ? error : new Error(String(error)));
        });
      });

      ErrorLogger.debug(`Updated discovered services: ${services.length}`, logContext);
    };

    const handleDiscoveryError = (error: string) => {
      setState(prev => ({
        ...prev,
        discoveryError: error,
        isDiscovering: false,
      }));
      ErrorLogger.error('Discovery error', logContext, new Error(error));
    };

    // Register event listeners using the correct methods
    autoDiscoveryService.onServicesUpdated(handleServicesUpdated);
    autoDiscoveryService.onError(handleDiscoveryError);

    return () => {
      autoDiscoveryService.removeListener('onServicesUpdated', handleServicesUpdated);
      autoDiscoveryService.removeListener('onError', handleDiscoveryError);
    };
  }, [logContext]);

  // Load cached discovery results on mount and run auto-discovery if storage is blank and no connection history
  useEffect(() => {
    const loadCachedResults = async () => {
      try {
        const cachedResults = await connectionRepository.getDiscoveryResults();
        if (cachedResults.length > 0) {
          const discoveredServices: DiscoveredFreeShowInstance[] = cachedResults.map(result => ({
            host: result.host,
            port: result.port,
            name: result.name,
            ip: result.metadata?.ip || result.host, // Use IP from metadata or fallback to host
            ports: result.metadata?.ports,
            capabilities: result.metadata?.capabilities,
            apiEnabled: result.metadata?.apiEnabled,
          }));

          setState(prev => ({
            ...prev,
            discoveredServices,
            lastDiscoveryTime: new Date(cachedResults[0].discoveredAt),
          }));

          ErrorLogger.debug(`Loaded ${cachedResults.length} cached discovery results`, logContext);
        } else {
          // Discovery cache is blank, check connection history before running auto-discovery
          const connectionHistory = await settingsRepository.getConnectionHistory();
          
          if (connectionHistory.length === 0) {
            // Both discovery cache and connection history are empty, run auto-discovery scan if available
            if (autoDiscoveryService.isAvailable() && !autoDiscoveryService.isActive()) {
              ErrorLogger.info('No cached discovery results and no connection history found, starting auto-discovery scan', logContext);
              try {
                autoDiscoveryService.startDiscovery();
              } catch (error) {
                ErrorLogger.error('Failed to start discovery on blank storage', logContext, error instanceof Error ? error : new Error(String(error)));
              }
            }
          } else {
            ErrorLogger.debug(`Skipping auto-discovery: found ${connectionHistory.length} connection history entries`, logContext);
          }
        }
      } catch (error) {
        ErrorLogger.warn('Failed to load cached discovery results', logContext, error instanceof Error ? error : new Error(String(error)));
        // If error loading cache, check connection history before trying auto-discovery
        try {
          const connectionHistory = await settingsRepository.getConnectionHistory();
          if (connectionHistory.length === 0 && autoDiscoveryService.isAvailable() && !autoDiscoveryService.isActive()) {
            ErrorLogger.info('Error loading cached results but no connection history, starting auto-discovery scan', logContext);
            try {
              autoDiscoveryService.startDiscovery();
            } catch (error) {
              ErrorLogger.error('Failed to start discovery after cache error', logContext, error instanceof Error ? error : new Error(String(error)));
            }
          }
        } catch (historyError) {
          ErrorLogger.warn('Failed to check connection history after cache error', logContext, historyError instanceof Error ? historyError : new Error(String(historyError)));
        }
      }
    };

    loadCachedResults();
  }, [logContext]);

  // Auto-start discovery if enabled
  useEffect(() => {
    if (autoStartDiscovery && state.isDiscoveryAvailable && !state.isDiscovering) {
      startDiscovery();
    }
  }, [autoStartDiscovery, state.isDiscoveryAvailable, state.isDiscovering]);

  // App state listener to clear discovery results when app goes to background
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Clear discovery results when app goes to background or inactive
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        try {
          // Clear in-memory discovery results
          setState(prev => ({
            ...prev,
            discoveredServices: [],
            lastDiscoveryTime: null,
            discoveryError: null,
          }));

          // Clear cached discovery results
          await connectionRepository.clearDiscoveryCache();
          
          // Stop any ongoing discovery
          if (state.isDiscovering) {
            autoDiscoveryService.stopDiscovery();
          }

          ErrorLogger.debug('Cleared discovery results on app background', logContext);
        } catch (error) {
          ErrorLogger.warn('Failed to clear discovery results on app background', logContext, error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [logContext, state.isDiscovering]);

  const startDiscovery = useCallback(() => {
    if (!state.isDiscoveryAvailable) {
      ErrorLogger.warn('Discovery service not available', logContext);
      return;
    }

    if (state.isDiscovering) {
      ErrorLogger.debug('Discovery already running', logContext);
      return;
    }

    try {
      // Mark discovering immediately for snappier UI feedback
      setState(prev => ({ ...prev, isDiscovering: true }));
      autoDiscoveryService.startDiscovery();
    } catch (error) {
      ErrorLogger.error('Failed to start discovery', logContext, error instanceof Error ? error : new Error(String(error)));
      setState(prev => ({ ...prev, isDiscovering: false }));
    }
  }, [state.isDiscoveryAvailable, state.isDiscovering, logContext]);

  const stopDiscovery = useCallback(() => {
    if (!state.isDiscovering) {
      ErrorLogger.debug('Discovery not running', logContext);
      return;
    }

    try {
      // Mark not discovering immediately for snappier UI feedback
      setState(prev => ({ ...prev, isDiscovering: false }));
      autoDiscoveryService.stopDiscovery();
    } catch (error) {
      ErrorLogger.error('Failed to stop discovery', logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }, [state.isDiscovering, logContext]);

  const refreshDiscovery = useCallback(() => {
    // Always clear current results first
    setState(prev => ({
      ...prev,
      discoveredServices: [],
      discoveryError: null,
    }));

    try {
      // Use the service's restart method for more reliable refresh
      autoDiscoveryService.restartDiscovery();
    } catch (error) {
      ErrorLogger.error('Failed to restart discovery', logContext, error instanceof Error ? error : new Error(String(error)));
      // Fallback to manual restart
      if (state.isDiscovering) {
        stopDiscovery();
        setTimeout(() => {
          startDiscovery();
        }, 750);
      } else {
        setTimeout(() => {
          startDiscovery();
        }, 100);
      }
    }
  }, [state.isDiscovering, startDiscovery, stopDiscovery, logContext]);

  const clearDiscoveredServices = useCallback(() => {
    setState(prev => ({
      ...prev,
      discoveredServices: [],
      discoveryError: null,
    }));

    // Clear cache
    connectionRepository.clearDiscoveryCache().catch(error => {
      ErrorLogger.warn('Failed to clear discovery cache', logContext, error);
    });

    ErrorLogger.debug('Cleared discovered services', logContext);
  }, [logContext]);

  const removeDiscoveredService = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      discoveredServices: prev.discoveredServices.filter(service => 
        `${service.host}:${service.port}` !== id
      ),
    }));
    ErrorLogger.debug('Removed discovered service', logContext, { id });
  }, [logContext]);

  const actions: DiscoveryActions = {
    startDiscovery,
    stopDiscovery,
    refreshDiscovery,
    clearDiscoveredServices,
    removeDiscoveredService,
  };

  const contextValue: DiscoveryContextType = {
    state,
    actions,
  };

  return (
    <DiscoveryContext.Provider value={contextValue}>
      {children}
    </DiscoveryContext.Provider>
  );
};

export const useDiscovery = (): DiscoveryContextType => {
  const context = useContext(DiscoveryContext);
  if (context === undefined) {
    throw new Error('useDiscovery must be used within a DiscoveryProvider');
  }
  return context;
};

// Convenience hooks for specific parts of the context
export const useDiscoveryState = (): DiscoveryState => {
  return useDiscovery().state;
};

export const useDiscoveryActions = (): DiscoveryActions => {
  return useDiscovery().actions;
};
