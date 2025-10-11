// Connection State Context - Manages connection state and auto-reconnect logic

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { FreeShowService } from '../services/FreeShowService';
import { IFreeShowService } from '../services/interfaces/IFreeShowService';
import { ErrorLogger } from '../services/ErrorLogger';
import { settingsRepository } from '../repositories';
import { configService } from '../config/AppConfig';
import { InterfacePingService } from '../services/InterfacePingService';

export interface ConnectionState {
  isConnected: boolean;
  connectionHost: string | null;
  connectionName: string | null;
  connectionPort: number | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError: string | null;
  connectionStartTime: Date | null;
  lastActivity: Date | null;
  currentShowPorts: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  } | null;
  capabilities: string[] | null;
  autoConnectAttempted: boolean;
  autoLaunchTriggered: boolean; // Track if auto-launch has been triggered this session
}

export interface ConnectionActions {
  connect: (host: string, port?: number, name?: string) => Promise<boolean>;
  connectWithValidation: (host: string, desiredPorts: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  }, name?: string) => Promise<{ success: boolean; validatedPorts?: any; error?: string }>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<boolean>;
  checkConnection: () => boolean;
  clearError: () => void;
  updateShowPorts: (ports: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  }) => Promise<void>;
  updateCapabilities: (capabilities: string[]) => void;
  updateConnectionName: (name: string) => void;
  cancelConnection: () => void;
  setAutoConnectAttempted: (attempted: boolean) => void;
  triggerAutoLaunch?: (connectionHost: string, connectionPort: number, navigation?: any, showPorts?: any) => Promise<void>;
}

export interface ConnectionContextType {
  state: ConnectionState;
  actions: ConnectionActions;
  service: IFreeShowService;
  navigation: any;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

interface ConnectionProviderProps {
  children: ReactNode;
  service?: IFreeShowService;
  navigation?: any;
  onConnectionHistoryUpdate?: () => Promise<void>;
  quickActionRef?: React.MutableRefObject<any>;
}

// Global auto-reconnect flag - prevents multiple simultaneous attempts
let globalAutoReconnectAttempted = false;
const resetAutoReconnectFlag = () => {
  globalAutoReconnectAttempted = false;
};

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ 
  children, 
  service: injectedService,
  navigation,
  onConnectionHistoryUpdate,
  quickActionRef
}) => {
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    connectionHost: null,
    connectionName: null,
    connectionPort: null,
    connectionStatus: 'disconnected',
    lastError: null,
    connectionStartTime: null,
    lastActivity: null,
    currentShowPorts: null,
    capabilities: null,
    autoConnectAttempted: false,
    autoLaunchTriggered: false,
  });

  const navigationRef = useRef<any>(null);
  const service = injectedService || new FreeShowService();
  const logContext = 'ConnectionProvider';
  const cancelConnectionRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update navigation ref when navigation prop changes
  useEffect(() => {
    navigationRef.current = navigation;
    ErrorLogger.debug('[ConnectionProvider] Navigation ref updated', 'ConnectionStateContext', { hasNavigation: !!navigation });
  }, [navigation]);

  // Update state when service connection changes
  useEffect(() => {
    const handleConnect = (data: any) => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        connectionHost: data.host,
        connectionPort: data.port,
        connectionStatus: 'connected',
        connectionStartTime: new Date(),
        lastActivity: new Date(),
        lastError: null,
      }));
      ErrorLogger.info('Connection established', logContext, data);
    };

    const handleDisconnect = (data: any) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'disconnected',
        lastActivity: new Date(),
        autoLaunchTriggered: false, // Reset for next auto-connect session
        autoConnectAttempted: true, // Mark auto-connect as attempted after disconnect
      }));
      ErrorLogger.info('Connection lost', logContext, data);
    };

    const handleError = (data: any) => {
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        lastError: data.error?.message || 'Connection error',
        lastActivity: new Date(),
      }));
      ErrorLogger.error('Connection error', logContext, new Error(data.error?.message || 'Unknown error'));
    };

    // Listen to service events
    service.on('connect', handleConnect);
    service.on('disconnect', handleDisconnect);
    service.on('error', handleError);

    // Cleanup listeners on unmount
    return () => {
      service.off('connect', handleConnect);
      service.off('disconnect', handleDisconnect);
      service.off('error', handleError);
    };
  }, [service, logContext]);

  // Update activity on any message
  useEffect(() => {
    const updateActivity = () => {
      setState(prev => ({
        ...prev,
        lastActivity: new Date(),
      }));
    };

    // Listen to any service event to update activity
    const events = ['shows', 'slides', 'outputs', 'ping'];
    events.forEach(event => {
      service.on(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        service.off(event, updateActivity);
      });
    };
  }, [service]);

  // Auto-reconnect logic - runs once per app session
  useEffect(() => {
    let isMounted = true;
    
    const attemptAutoReconnect = async () => {
      // Early exit conditions
      if (globalAutoReconnectAttempted || !isMounted) return;
      globalAutoReconnectAttempted = true;
      
      try {
        const appSettings = await settingsRepository.getAppSettings();
        if (!appSettings.autoReconnect) {
          if (isMounted) setState(prev => ({ ...prev, autoConnectAttempted: true }));
          return;
        }
        
        const lastConnection = await settingsRepository.getLastConnection();
        if (!lastConnection?.host || !lastConnection.showPorts) {
          if (isMounted) setState(prev => ({ ...prev, autoConnectAttempted: true }));
          return;
        }
        
        ErrorLogger.info('[AutoReconnect] Starting auto-reconnect', 'ConnectionStateContext', {
          host: lastConnection.host,
          savedPorts: lastConnection.showPorts
        });
        
        await performAutoReconnect(lastConnection, isMounted);
        
      } catch (err) {
        ErrorLogger.error('[AutoReconnect] Auto-reconnect failed', 'ConnectionStateContext', 
          err instanceof Error ? err : new Error(String(err)));
        if (isMounted) {
          setState(prev => ({ 
            ...prev, 
            autoConnectAttempted: true,
            connectionStatus: 'error',
            lastError: 'Auto-reconnect failed due to network error'
          }));
        }
      }
    };
    
    const performAutoReconnect = async (lastConnection: any, isMounted: boolean) => {
      const pingService = new InterfacePingService();
      
      const hasSavedPorts = Object.values(lastConnection.showPorts).some((port: any) => typeof port === 'number' && port > 0);
      let validation: any;
      let apiPort: number = configService.getNetworkConfig().defaultPort;
      
      // Try saved ports first, then fallback to default port discovery
      if (hasSavedPorts) {
        validation = await pingService.validateInterfacePorts(lastConnection.host, lastConnection.showPorts);
        if (!isMounted) return;
        
        const reachableInterfaces = Object.values(validation).filter((port: any) => typeof port === 'number' && port > 0);
        if (reachableInterfaces.length > 0) {
          apiPort = validation.api > 0 ? validation.api : configService.getNetworkConfig().defaultPort;
        } else {
          validation = null; // Force fallback to default port discovery
        }
      }
      
      // Fallback: try default port discovery
      if (!hasSavedPorts || !validation) {
        const hostPing = await pingService.pingHost(lastConnection.host);
        if (!hostPing.isReachable) {
          if (isMounted) {
            setState(prev => ({ 
              ...prev, 
              autoConnectAttempted: true,
              connectionStatus: 'disconnected',
              lastError: 'Host is not reachable'
            }));
          }
          return;
        }
        
        apiPort = configService.getNetworkConfig().defaultPort;
        validation = { remote: 0, stage: 0, control: 0, output: 0, api: apiPort };
      }
      
      // Attempt connection with timeout
      const success = await connectWithTimeout(lastConnection.host, apiPort, lastConnection.nickname, isMounted);
      
      if (success && isMounted) {
        await handleSuccessfulAutoReconnect(lastConnection, apiPort, validation, isMounted);
      } else if (isMounted) {
        setState(prev => ({ 
          ...prev,
          connectionStatus: 'error',
          lastError: 'Failed to connect to FreeShow API'
        }));
      }
      
      if (isMounted) setState(prev => ({ ...prev, autoConnectAttempted: true }));
    };
    
    const connectWithTimeout = async (host: string, port: number, nickname: string, isMounted: boolean): Promise<boolean> => {
      const timeoutMs = configService.getNetworkConfig().autoConnectTimeout;
      let timeoutHandle: NodeJS.Timeout | null = null;
      let didTimeout = false;
      
      timeoutHandle = setTimeout(() => {
        didTimeout = true;
        service.disconnect();
        if (isMounted) setState(prev => ({ ...prev, connectionStatus: 'error', lastError: 'Auto-connect timeout' }));
      }, timeoutMs);
      
      try {
        await service.connect(host, port, nickname);
        if (timeoutHandle) clearTimeout(timeoutHandle);
        return !didTimeout;
      } catch {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        return false;
      }
    };
    
    const handleSuccessfulAutoReconnect = async (lastConnection: any, apiPort: number, validation: any, isMounted: boolean) => {
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        connectionHost: lastConnection.host, 
        connectionName: lastConnection.nickname || lastConnection.host, 
        connectionStatus: 'connected',
        connectionPort: apiPort,
        currentShowPorts: validation,
      }));
      
      ErrorLogger.info('[AutoReconnect] Successfully reconnected', 'ConnectionStateContext', {
        host: lastConnection.host,
        apiPort,
        validatedPorts: validation
      });
      
      // Update connection ports and ensure it's in history
      await settingsRepository.updateConnectionPorts(lastConnection.host, validation);
      try {
        await settingsRepository.addToConnectionHistory(lastConnection.host, apiPort, lastConnection.nickname, validation);
      } catch (error) {
        ErrorLogger.error('[AutoReconnect] Failed to update connection history', 'ConnectionStateContext', 
          error instanceof Error ? error : new Error(String(error)));
      }
      
      // Trigger auto-launch after connection is established
      setTimeout(() => {
        if (isMounted) {
          triggerAutoLaunch(lastConnection.host, apiPort, undefined, validation);
        }
      }, 500);
    };
    
    // Start auto-reconnect after a brief delay
    const timeoutId = setTimeout(attemptAutoReconnect, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Auto-launch functionality
  // Auto-launch functionality
  const triggerAutoLaunch = useCallback(async (connectionHost: string, connectionPort: number, nav?: any, showPorts?: any) => {
    try {
      // Simple logic: only auto-launch if not triggered yet this session
      if (state.autoLaunchTriggered) {
        return;
      }

      const navToUse = nav || navigationRef.current;
      if (!navToUse?.navigate) {
        return;
      }

      const appSettings = await settingsRepository.getAppSettings();
      
      // Auto-launch interface only if conditions are met
      if (appSettings.autoReconnect && appSettings.autoLaunchInterface !== 'none') {
        // Mark auto-launch as triggered for this session
        setState(prev => ({ ...prev, autoLaunchTriggered: true }));
        
        // Use provided showPorts or fall back to state
        const currentShowPorts = showPorts || state.currentShowPorts;
        
        // Check if the selected interface is enabled (port > 0)
        const selectedInterfacePort = currentShowPorts?.[appSettings.autoLaunchInterface as keyof typeof currentShowPorts];
        if (!selectedInterfacePort || selectedInterfacePort <= 0) {
          ErrorLogger.info(`[AutoLaunch] Skipping ${appSettings.autoLaunchInterface} interface - disabled (port: ${selectedInterfacePort})`, 'ConnectionStateContext');
          return;
        }
        
        const defaultPorts = configService.getDefaultShowPorts();
        const showOptions = [
          { id: 'remote', port: defaultPorts.remote },
          { id: 'stage', port: defaultPorts.stage },
          { id: 'control', port: defaultPorts.control },
          { id: 'output', port: defaultPorts.output },
          { id: 'api', port: defaultPorts.api },
        ];
        
        const selectedShow = showOptions.find(show => show.id === appSettings.autoLaunchInterface);
        if (selectedShow) {
          ErrorLogger.info(`[AutoLaunch] Launching ${appSettings.autoLaunchInterface} interface`, 'ConnectionStateContext');
          
          if (appSettings.autoLaunchInterface === 'api') {
            navToUse.navigate('APIScreen', {
              title: 'API Controls',
              showId: appSettings.autoLaunchInterface,
            });
          } else {
            const url = `http://${connectionHost}:${selectedInterfacePort}`;
            const title = appSettings.autoLaunchInterface.charAt(0).toUpperCase() + appSettings.autoLaunchInterface.slice(1) + 'Show';
            
            navToUse.navigate('WebView', {
              url,
              title,
              showId: appSettings.autoLaunchInterface,
              initialFullscreen: appSettings.autoLaunchFullscreen || false,
            });
          }
        }
      }
    } catch (error) {
      ErrorLogger.error('[AutoLaunch] Error in auto-launch', 'ConnectionStateContext', error instanceof Error ? error : new Error(String(error)));
    }
  }, [state.autoLaunchTriggered, state.currentShowPorts]);

  // App state listener for foreground reconnection
  useEffect(() => {
    let previousAppState = AppState.currentState;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // If app is coming to foreground, attempt reconnection
      if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
        try {
          const appSettings = await settingsRepository.getAppSettings();
          if (!appSettings.autoReconnect) {
            previousAppState = nextAppState;
            return;
          }

          const currentState = service.isConnected();
          const isAlreadyConnecting = state.connectionStatus === 'connecting';
          
          if (!currentState && !isAlreadyConnecting && state.connectionHost && state.connectionStatus === 'disconnected') {
            setState(prev => ({ 
              ...prev, 
              connectionStatus: 'connecting',
              lastError: null 
            }));

            try {
              await service.connect(
                state.connectionHost,
                state.connectionPort || configService.getNetworkConfig().defaultPort,
                state.connectionName || state.connectionHost
              );
              
              if (service.isConnected()) {
                setState(prev => ({
                  ...prev,
                  isConnected: true,
                  connectionStatus: 'connected',
                  connectionStartTime: new Date(),
                  lastActivity: new Date(),
                  lastError: null,
                }));

                setTimeout(() => {
                  // Don't auto-launch on app foreground reconnect - this is not an initial auto-connect
                  ErrorLogger.debug('[AppState] Foreground reconnection successful - skipping auto-launch', 'ConnectionStateContext');
                }, 500);
              } else {
                setState(prev => ({
                  ...prev,
                  connectionStatus: 'disconnected',
                }));
              }
            } catch (error) {
              setState(prev => ({
                ...prev,
                connectionStatus: 'error',
                lastError: error instanceof Error ? error.message : 'Foreground reconnection failed',
              }));
            }
          }
        } catch (error) {
          ErrorLogger.error('[AppState] Error during foreground reconnection', 'ConnectionStateContext', 
            error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      previousAppState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [service, state.connectionHost, state.connectionPort, state.connectionName, triggerAutoLaunch]);

  const connect = useCallback(async (host: string, port?: number, name?: string): Promise<boolean> => {
    setState(prev => ({
      ...prev,
      connectionStatus: 'connecting',
      lastError: null,
      autoConnectAttempted: false  // Reset for manual connection
    }));
    cancelConnectionRef.current = false;
    try {
      const connectPromise = service.connect(host, port, name);
      await Promise.race([
        connectPromise,
        new Promise((_, reject) => {
          const checkCancel = () => {
            if (cancelConnectionRef.current) {
              reject(new Error('Connection cancelled by user'));
            } else {
              setTimeout(checkCancel, 100);
            }
          };
          checkCancel();
        })
      ]);
      if (service.isConnected()) {
        setState(prev => ({ ...prev, isConnected: true, connectionHost: host, connectionName: name || host, connectionPort: port || null, connectionStatus: 'connected', lastError: null }));
        return true;
      } else {
        setState(prev => ({ ...prev, connectionStatus: 'error', lastError: 'Failed to connect to FreeShow' }));
        return false;
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Connection cancelled by user') {
        setState(prev => ({ ...prev, connectionStatus: 'disconnected', lastError: 'Connection cancelled' }));
      } else {
        setState(prev => ({ ...prev, connectionStatus: 'error', lastError: error instanceof Error ? error.message : 'Connection failed' }));
      }
      return false;
    }
  }, [service]);

  // New method: Connect with validation - validates interfaces before connecting
  const connectWithValidation = useCallback(async (host: string, desiredPorts: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  }, name?: string): Promise<{ success: boolean; validatedPorts?: any; error?: string }> => {
    
    setState(prev => ({ ...prev, connectionStatus: 'connecting', lastError: null }));

    try {
      ErrorLogger.info('[ConnectWithValidation] Starting validated connection', 'ConnectionStateContext', {
        host, desiredPorts, name
      });

      // Validate interface ports first
      const pingService = new InterfacePingService();
      const validation = await pingService.validateInterfacePorts(host, desiredPorts);
      
      // Check if any interfaces are reachable
      const reachableInterfaces = Object.values(validation).filter(port => port > 0);
      if (reachableInterfaces.length === 0) {
        const errorMsg = 'No interfaces are reachable. Please check your connection settings.';
        setState(prev => ({ ...prev, connectionStatus: 'error', lastError: errorMsg }));
        return { success: false, error: errorMsg };
      }

      // Connect using API port or default
      const apiPort = validation.api > 0 ? validation.api : configService.getNetworkConfig().defaultPort;
      const success = await connect(host, apiPort, name);
      
      if (success) {
        setState(prev => ({ ...prev, currentShowPorts: validation }));
        
        // Save successful connection to history
        try {
          await settingsRepository.addToConnectionHistory(host, apiPort, name, validation);
          ErrorLogger.info('[ConnectWithValidation] Connection saved to history', 'ConnectionStateContext', {
            host, apiPort, name, validatedPorts: validation
          });
        } catch (error) {
          ErrorLogger.error('[ConnectWithValidation] Failed to save connection to history', 'ConnectionStateContext', 
            error instanceof Error ? error : new Error(String(error)));
        }
        
        ErrorLogger.info('[ConnectWithValidation] Connection successful', 'ConnectionStateContext', {
          host, apiPort, validatedPorts: validation
        });
        return { success: true, validatedPorts: validation };
      } else {
        const errorMsg = 'Failed to connect to FreeShow API server';
        setState(prev => ({ ...prev, connectionStatus: 'error', lastError: errorMsg }));
        return { success: false, error: errorMsg };
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed due to network error';
      setState(prev => ({ ...prev, connectionStatus: 'error', lastError: errorMsg }));
      ErrorLogger.error('[ConnectWithValidation] Connection error', 'ConnectionStateContext', 
        error instanceof Error ? error : new Error(String(error)));
      return { success: false, error: errorMsg };
    }
  }, [connect]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await service.disconnect();
      
      // Service will emit 'disconnect' event which will update state
    } catch (error) {
      ErrorLogger.error('Failed to disconnect', logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }, [service, logContext]);

  const reconnect = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({
        ...prev,
        connectionStatus: 'connecting',
        lastError: null,
      }));

      await service.reconnect();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reconnection failed';
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        lastError: errorMessage,
      }));
      
      ErrorLogger.error('Failed to reconnect', logContext, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, [service, logContext]);

  const checkConnection = useCallback((): boolean => {
    return service.isConnected();
  }, [service]);

  const clearError = useCallback((): void => {
    setState(prev => ({
      ...prev,
      lastError: null,
    }));
  }, []);

  const updateShowPorts = useCallback(async (ports: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  }): Promise<void> => {
    // Validate that at least one interface is enabled
    const enabledInterfaces = Object.values(ports).filter(port => port > 0);
    if (enabledInterfaces.length === 0) {
      ErrorLogger.warn('[Validation] Attempted to disable all interfaces - at least one must remain enabled', logContext);
      throw new Error('At least one interface must be enabled');
    }

    setState(prev => ({
      ...prev,
      currentShowPorts: ports,
    }));

    // Auto-save connection history when ports change (only if connected)
    if (state.isConnected && state.connectionHost) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save after 200ms of inactivity (reduced for better UX)
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await settingsRepository.updateConnectionPorts(state.connectionHost!, ports);
          
          // Immediately refresh connection history in the UI
          if (onConnectionHistoryUpdate) {
            await onConnectionHistoryUpdate();
          }
        } catch (error) {
          ErrorLogger.warn('Failed to auto-save connection ports', logContext, 
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }, 200); // Reduced from 500ms to 200ms for more responsive feel
    }
  }, [state.isConnected, state.connectionHost, logContext, onConnectionHistoryUpdate]);

  const updateCapabilities = useCallback((capabilities: string[]): void => {
    setState(prev => ({
      ...prev,
      capabilities,
    }));
  }, []);

  const updateConnectionName = useCallback((name: string): void => {
    setState(prev => ({
      ...prev,
      connectionName: name,
    }));
    ErrorLogger.info('[ConnectionState] Connection name updated', 'ConnectionStateContext', { name });
  }, []);

  const cancelConnection = useCallback(() => {
    cancelConnectionRef.current = true;
    setState(prev => ({
      ...prev,
      connectionStatus: 'disconnected',
      lastError: 'Connection cancelled',
      autoConnectAttempted: true
    }));
    service.disconnect();
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    resetAutoReconnectFlag();
  }, [service]);

  const setAutoConnectAttempted = useCallback((attempted: boolean) => {
    setState(prev => ({
      ...prev,
      autoConnectAttempted: attempted,
    }));
  }, []);

  // Handle quick action auto-connect
  const quickActionProcessedRef = useRef(false);
  
  useEffect(() => {
    const handleQuickActionConnect = async () => {
      if (!quickActionRef?.current || quickActionProcessedRef.current) return;
      
      const params = quickActionRef.current;
      quickActionProcessedRef.current = true;
      
      ErrorLogger.info(`[QuickActions] Processing auto-connect to: ${params.host}`, logContext);
      
      try {
        // Find the connection in history to get ports
        const history = await settingsRepository.getConnectionHistory();
        const connectionData = history.find((item: any) => item.id === params.connectionId);
        
        if (connectionData) {
          // Validate and connect with full connection data
          const defaultPort = configService.getNetworkConfig().defaultPort;
          const validatedShowPorts = connectionData.showPorts || configService.getDefaultShowPorts();
          
          // Connect to the server
          const connected = await connect(params.host, defaultPort, params.nickname);
          
          if (connected) {
            // Update show ports after connection
            await updateShowPorts(validatedShowPorts);
            ErrorLogger.info('[QuickActions] Successfully auto-connected', logContext);
          }
        } else {
          ErrorLogger.warn('[QuickActions] Connection not found in history', logContext);
        }
      } catch (error) {
        ErrorLogger.error('[QuickActions] Failed to auto-connect', logContext, error instanceof Error ? error : new Error(String(error)));
      } finally {
        // Clear the quick action reference
        if (quickActionRef) {
          quickActionRef.current = null;
        }
      }
    };
    
    // Wait a bit for the app to fully initialize before auto-connecting
    const timeout = setTimeout(() => {
      handleQuickActionConnect();
    }, 800);
    
    return () => clearTimeout(timeout);
  }, [quickActionRef, connect, updateShowPorts, logContext]);

  const actions: ConnectionActions = {
    connect,
    connectWithValidation,
    disconnect,
    reconnect,
    checkConnection,
    clearError,
    updateShowPorts,
    updateCapabilities,
    updateConnectionName,
    cancelConnection,
    setAutoConnectAttempted,
    triggerAutoLaunch,
  };

  const contextValue: ConnectionContextType = {
    state,
    actions,
    service,
    navigation: navigationRef.current,
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = (): ConnectionContextType => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};

// Convenience hooks for specific parts of the context
export const useConnectionState = (): ConnectionState => {
  return useConnection().state;
};

export const useConnectionActions = (): ConnectionActions => {
  return useConnection().actions;
};

export const useFreeShowService = (): IFreeShowService => {
  return useConnection().service;
};
