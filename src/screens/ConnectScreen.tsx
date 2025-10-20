import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated, KeyboardAvoidingView,
  Platform,
  ScrollView, StyleSheet, View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ConfirmationModal from '../components/ConfirmationModal'
import ConnectedScreen from '../components/ConnectedScreen'
import ErrorModal from '../components/ErrorModal'
import QRScannerModal from '../components/QRScannerModal'
import ShareQRModal from '../components/ShareQRModal'
import { configService } from '../config/AppConfig'
import {
  useConnection,
  useDiscovery,
  useDiscoveryActions,
  useSettings,
} from '../contexts'
import { useAppLaunch } from '../hooks/useAppLaunch'
import { ConnectionHistory, settingsRepository } from '../repositories'
import { DiscoveredFreeShowInstance } from '../services/AutoDiscoveryService'
import { ErrorLogger } from '../services/ErrorLogger'
import { ValidationService } from '../services/InputValidationService'
import { interfacePingService } from '../services/InterfacePingService'
import { FreeShowTheme } from '../theme/FreeShowTheme'
import { getDeviceType } from "../utils/navigationUtils"
import ConnectionForm from './ConnectScreen/ConnectionForm'
import EditNicknameModal from './ConnectScreen/EditNicknameModal'
import Header from './ConnectScreen/Header'
import HelpSection from './ConnectScreen/HelpSection'
import QuickConnectSection from './ConnectScreen/QuickConnectSection'

interface ConnectScreenProps {
  navigation: any;
}

const ConnectScreen: React.FC<ConnectScreenProps> = ({ navigation }) => {
  const appLaunch = useAppLaunch();
  const defaultPorts = configService.getDefaultShowPorts();

  const [host, setHost] = useState(configService.getNetworkConfig().defaultHost);
  const [remotePort, setRemotePort] = useState(String(defaultPorts.remote));
  const [stagePort, setStagePort] = useState(String(defaultPorts.stage));
  const [controlPort, setControlPort] = useState(String(defaultPorts.control));
  const [outputPort, setOutputPort] = useState(String(defaultPorts.output));
  const [apiPort, setApiPort] = useState(String(defaultPorts.api));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showShareQR, setShowShareQR] = useState(false);
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionHistory | null>(null);
  const [editNicknameText, setEditNicknameText] = useState('');
  const [showQrModalVisible, setShowQrModalVisible] = useState(false);
  const [connectionPulse] = useState(new Animated.Value(1));
  const [animatedScanProgress] = useState(new Animated.Value(0));
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [errorModal, setErrorModal] = useState<{visible: boolean, title: string, message: string}>({
    visible: false,
    title: '',
    message: ''
  });
  const [isPingingInterfaces, setIsPingingInterfaces] = useState(false);
  
  // Helper function to show error modal
  const showError = useCallback((title: string, message: string) => {
    setErrorModal({ visible: true, title, message });
  }, []);

  // Helper function to hide error modal
  const hideError = useCallback(() => {
    setErrorModal({ visible: false, title: '', message: '' });
  }, []);
  
  // Ref to track if we've already processed the history item
  const processedHistoryItemRef = useRef(false);
  
  // Use focused contexts
  const connection = useConnection();
  const { state, actions } = connection;
  const {
    isConnected,
    connectionStatus,
    connectionHost,
    connectionName,
    currentShowPorts,
  } = state;
  

  const {
    connect,
    connectWithValidation,
    disconnect,
    updateShowPorts,
    updateCapabilities,
    cancelConnection
  } = actions;
  
  const { history, actions: historyActions, settings } = useSettings();
  
  const discovery = useDiscovery();
  const discoveryActions = useDiscoveryActions();
  const { state: discoveryState } = discovery;
  const { discoveredServices, isDiscovering, isDiscoveryAvailable } = discoveryState;
  const { startDiscovery, stopDiscovery, clearDiscoveredServices } = discoveryActions;

  // Progress state for scan
  // Use shorter timeout for UI progress to match snappier discovery
  const discoveryTimeout = configService.getNetworkConfig().discoveryTimeout;
  const [scanComplete, setScanComplete] = useState(false);
  const [isScanActive, setIsScanActive] = useState(false);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear discovered services and progress when screen mounts
  useEffect(() => {
    clearDiscoveredServices();
    setScanComplete(false);
  }, []);

  // Update host when connection changes
  useEffect(() => {
    if (isConnected && connectionHost) {
      setHost(connectionHost);
    }
  }, [isConnected, connectionHost]);



  // Handle scan progress
  useEffect(() => {
    if (isScanActive) {
      setScanComplete(false);
      const start = Date.now();
      scanTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / discoveryTimeout, 1);
        Animated.timing(animatedScanProgress, {
          toValue: progress,
          duration: appLaunch.isLoading() ? 0 : (appLaunch.shouldAnimate() ? 50 : 0),
          useNativeDriver: false,
        }).start();
        if (progress >= 1) {
          clearInterval(scanTimerRef.current!);
          setScanComplete(true);
          setIsScanActive(false);
          stopDiscovery();
        }
      }, 50);
      return () => {
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      };
    } else {
      animatedScanProgress.setValue(0);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    }
  }, [isScanActive, discoveryTimeout, stopDiscovery, animatedScanProgress]);

  // When discovery stops for any reason, also end scan feedback
  useEffect(() => {
    if (!isDiscovering && isScanActive) {
      setIsScanActive(false);
    }
  }, [isDiscovering]);

  // Sync port fields with currentShowPorts (interface states from ShowSelector)
  useEffect(() => {
    if (!currentShowPorts) return;
    
    setRemotePort(currentShowPorts.remote > 0 ? String(currentShowPorts.remote) : '');
    setStagePort(currentShowPorts.stage > 0 ? String(currentShowPorts.stage) : '');
    setControlPort(currentShowPorts.control > 0 ? String(currentShowPorts.control) : '');
    setOutputPort(currentShowPorts.output > 0 ? String(currentShowPorts.output) : '');
    setApiPort(currentShowPorts.api > 0 ? String(currentShowPorts.api) : '');
  }, [currentShowPorts]);

  const handleConnect = async () => {
    try {
      // 1. Validate host
      const hostValidation = ValidationService.validateHost(host.trim());
      if (!hostValidation.isValid) {
        showError('Invalid Host', hostValidation.error || 'Please enter a valid host address');
        return;
      }

      // 2. Get user's desired port configuration
      const desiredPorts = {
        remote: parseInt(remotePort) || 0,
        stage: parseInt(stagePort) || 0,
        control: parseInt(controlPort) || 0,
        output: parseInt(outputPort) || 0,
        api: parseInt(apiPort) || 0,
      };

      // 3. Check if user wants at least one interface
      const hasDesiredInterfaces = Object.values(desiredPorts).some(port => port > 0);
      if (!hasDesiredInterfaces) {
        showError('No Interfaces Enabled', 'Please enable at least one interface to connect to FreeShow.');
        return;
      }

      const sanitizedHost = hostValidation.sanitizedValue as string;
      const nameToUse = history.find(h => h.host === sanitizedHost)?.nickname;

      // 4. Use new validation-first connection method
      setIsPingingInterfaces(true);
      
      ErrorLogger.info('Starting validated connection', 'ConnectScreen', 
        new Error(`Host: ${sanitizedHost}, Desired Ports: ${JSON.stringify(desiredPorts)}`)
      );

      const result = await connectWithValidation(sanitizedHost, desiredPorts, nameToUse);
      setIsPingingInterfaces(false);
      
      if (result.success && result.validatedPorts) {
        // Connection successful - save to history and navigate
        await settingsRepository.addToConnectionHistory(sanitizedHost, result.validatedPorts.api || configService.getNetworkConfig().defaultPort, nameToUse, result.validatedPorts);
        
        // Show user feedback about any disabled interfaces
        const disabledInterfaces = Object.entries(desiredPorts)
          .filter(([name, port]) => port > 0 && result.validatedPorts[name as keyof typeof result.validatedPorts] === 0)
          .map(([name]) => name);
          
        if (disabledInterfaces.length > 0) {
          ErrorLogger.info(`Connected successfully. Disabled unresponsive interfaces: ${disabledInterfaces.join(', ')}`, 'ConnectScreen');
        }
        
        navigation.navigate('Interface');
      } else {
        // Connection failed - show user-friendly error
        showError('Connection Failed', result.error || 'Unable to connect to FreeShow. Please check your settings and try again.');
      }

    } catch (error) {
      setIsPingingInterfaces(false);
      ErrorLogger.error('Manual connection failed', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
      setErrorModal({
        visible: true,
        title: 'Connection Error',
        message: 'Failed to connect to FreeShow. Please check your connection and try again.'
      });
    }
  };

  const handleHistoryConnect = useCallback(async (historyItem: any) => {
    try {
      // Validate host from history
      const hostValidation = ValidationService.validateHost(historyItem.host);
      if (!hostValidation.isValid) {
        setErrorModal({
          visible: true,
          title: 'Invalid Host',
          message: `History item has invalid host: ${hostValidation.error}`
        });
        return;
      }

      // Update UI with history item data
      const sanitizedHost = hostValidation.sanitizedValue as string;
      setHost(sanitizedHost);
      
      // Validate and update interface ports from stored history
      let validatedShowPorts;
      
      if (historyItem.showPorts) {
        const showPortsValidation = ValidationService.validateShowPorts(historyItem.showPorts);
        if (!showPortsValidation.isValid) {
          ErrorLogger.warn('History item has invalid show ports, using defaults', 'ConnectScreen', 
            new Error(`Invalid ports: ${JSON.stringify(historyItem.showPorts)}`)
          );
          validatedShowPorts = configService.getDefaultShowPorts();
        } else {
          validatedShowPorts = showPortsValidation.sanitizedValue;
        }
        
        // Update UI with validated ports
        setRemotePort(validatedShowPorts.remote ? String(validatedShowPorts.remote) : '');
        setStagePort(validatedShowPorts.stage ? String(validatedShowPorts.stage) : '');
        setControlPort(validatedShowPorts.control ? String(validatedShowPorts.control) : '');
        setOutputPort(validatedShowPorts.output ? String(validatedShowPorts.output) : '');
        setApiPort(validatedShowPorts.api ? String(validatedShowPorts.api) : '');
      } else {
        // Use default ports if none stored
        validatedShowPorts = configService.getDefaultShowPorts();
        setRemotePort(String(validatedShowPorts.remote));
        setStagePort(String(validatedShowPorts.stage));
        setControlPort(String(validatedShowPorts.control));
        setOutputPort(String(validatedShowPorts.output));
        setApiPort(String(validatedShowPorts.api));
      }
      
      // Ping host to check if it's reachable
      setIsPingingInterfaces(true);
      try {
        const pingResult = await interfacePingService.pingHost(sanitizedHost);
        
        if (!pingResult.isReachable) {
          setErrorModal({
            visible: true,
            title: 'Host Not Reachable',
            message: `Cannot reach ${sanitizedHost}. Please check that the host is online and accessible from your network.`
          });
          return;
        }
      } finally {
        setIsPingingInterfaces(false);
      }

      ErrorLogger.info('Attempting connection from history with validated inputs', 'ConnectScreen', 
        new Error(`Host: ${sanitizedHost}, Ports: ${JSON.stringify(validatedShowPorts)}`)
      );

      const defaultPort = configService.getNetworkConfig().defaultPort;
      const connected = await connect(sanitizedHost, defaultPort, historyItem.nickname);
      
      if (connected) {
        // Update show ports after successful connection
        try {
          await updateShowPorts(validatedShowPorts);
        } catch (error) {
          ErrorLogger.error('Failed to update show ports after history connection', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
        }
        // Navigate to Interface screen (works for both sidebar and bottom tab layouts)
        if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('Interface');
        } else {
          ErrorLogger.warn('Connected successfully, but no navigation function available', 'ConnectScreen');
        }
      }
    } catch (error) {
      ErrorLogger.error('History connection failed', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
    }
  }, [history, connect, updateShowPorts, navigation]);

  const handleDisconnect = () => {
    disconnect();
  };

  const handleDiscoveredConnect = async (service: any) => {
    // Check if any services are available for this instance
    if (!service.capabilities || service.capabilities.length === 0) {
      setErrorModal({
        visible: true,
        title: 'No Services Available',
        message: `The FreeShow instance "${service.name}" does not have any services enabled. Please enable at least one output in FreeShow settings.`,
      });
      return;
    }

    await proceedWithConnection(service);
  };

  const proceedWithConnection = async (service: any) => {
    const host = service.ip || service.host;
    setHost(host);
    stopDiscovery();
    
    try {
      // 1. Start with discovered interfaces (treat missing as disabled)
      const discoveredPorts = {
        remote: service.ports?.remote || 0,
        stage: service.ports?.stage || 0,
        control: service.ports?.control || 0,
        output: service.ports?.output || 0,
        api: 0, // API not broadcasted, we'll test it separately
      };

      // 2. Connect immediately for speed, then validate API in background
      const defaultApiPort = configService.getNetworkConfig().defaultPort;
      const nameToUse = history.find(h => h.host === host)?.nickname || service.name;
      
      // Start API validation in parallel (don't block connection)
      const apiValidationPromise = interfacePingService.pingPort(host, defaultApiPort);
      
      // 3. Connect immediately
      const connected = await connect(host, defaultApiPort, nameToUse);
      
      if (connected) {
        // 4. Wait for API validation and update ports accordingly
        const apiResult = await apiValidationPromise;
        if (apiResult.isReachable) {
          discoveredPorts.api = defaultApiPort;
          ErrorLogger.info(`API interface available on port ${defaultApiPort}`, 'ConnectScreen');
        } else {
          ErrorLogger.info(`API interface not available on port ${defaultApiPort}`, 'ConnectScreen');
        }
        
        try {
          await updateShowPorts(discoveredPorts);
        } catch (error) {
          ErrorLogger.error('Failed to update discovered show ports', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
        }
        updateCapabilities(service.capabilities || ['api']);
        await settingsRepository.addToConnectionHistory(host, defaultApiPort, nameToUse, discoveredPorts);
        navigation.navigate('Interface');
      }

    } catch (error) {
      ErrorLogger.error('Auto discovery connection failed', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
      setErrorModal({
        visible: true,
        title: 'Connection Error',
        message: `Failed to connect to "${service.name}". Please ensure FreeShow is running.`
      });
    }
  };

  const handleRemoveFromHistory = async (itemId: string) => {
    await historyActions.removeFromHistory(itemId);
  };

  const handleEditNickname = (item: ConnectionHistory) => {
    setEditingConnection(item);
    setEditNicknameText(item.nickname || item.host);
    setShowEditNickname(true);
  };

  const handleSaveNickname = async () => {
    if (!editingConnection) return;
    
    try {
      // Check if this connection exists in history
      const existsInHistory = history.some(item => item.id === editingConnection.id);
      
      if (!existsInHistory) {
        // Add the connection to history first if it doesn't exist
        await settingsRepository.addToConnectionHistory(
          editingConnection.host,
          editingConnection.showPorts?.api || configService.getNetworkConfig().defaultPort,
          editNicknameText, // Use the new nickname
          editingConnection.showPorts
        );
      } else {
        // Update existing connection nickname
        await settingsRepository.updateConnectionNickname(editingConnection.id, editNicknameText);
      }
      
      await historyActions.refreshHistory(); // Use the destructured action
      
      // Update the connection name in the connection state if this is the current connection
      if (isConnected && editingConnection.host === connectionHost) {
        actions.updateConnectionName(editNicknameText);
      }
      
      setShowEditNickname(false);
      setEditingConnection(null);
      setEditNicknameText('');
    } catch (error) {
      ErrorLogger.error('Failed to update nickname', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'Failed to update connection name'
      });
    }
  };

  const handleCancelEdit = () => {
    setShowEditNickname(false);
    setEditingConnection(null);
    setEditNicknameText('');
  };

  const handleClearAllHistory = () => {
    setShowClearAllConfirm(true);
  };

  const confirmClearAllHistory = async () => {
    await historyActions.clearHistory();
    setShowClearAllConfirm(false);
  };

  const cancelClearAllHistory = () => {
    setShowClearAllConfirm(false);
  };

  // Handle navigation parameter for history item connection
  useEffect(() => {
    // Only add listener if navigation has addListener method (not available in sidebar layout)
    if (typeof navigation?.addListener === 'function') {
      const unsubscribe = navigation.addListener('focus', () => {
        const historyItem = navigation.getParam?.('historyItem');
        if (historyItem && !processedHistoryItemRef.current) {
          // Mark as processed to prevent multiple triggers
          processedHistoryItemRef.current = true;
          // Remove the parameter so it doesn't trigger again
          navigation.setParams?.({ historyItem: undefined });
          // Connect using the history item
          handleHistoryConnect(historyItem);
        }
      });

      return () => {
        unsubscribe();
        // Reset the ref when the effect is cleaned up
        processedHistoryItemRef.current = false;
      };
    }
    
    // For sidebar layout, check for historyItem on initial render
    const historyItem = navigation?.getParam?.('historyItem');
    if (historyItem && !processedHistoryItemRef.current) {
      // Mark as processed to prevent multiple triggers
      processedHistoryItemRef.current = true;
      // Remove the parameter so it doesn't trigger again
      navigation.setParams?.({ historyItem: undefined });
      // Connect using the history item
      handleHistoryConnect(historyItem);
    }
    
    // Return a cleanup function
    return () => {
      // Reset the ref when the effect is cleaned up
      processedHistoryItemRef.current = false;
    };
  }, [navigation, handleHistoryConnect]);

  // Helper function to handle structured QR payload
  const handleStructuredQRPayload = useCallback(async (payload: any) => {
    // Validate host
    const hostValidation = ValidationService.validateHost(String(payload.host));
    if (!hostValidation.isValid) {
      showError('Invalid Host', `QR code contains invalid host: ${hostValidation.error}`);
      return;
    }

    // Validate ports
    const portsValidation = ValidationService.validateShowPorts(payload.ports);
    if (!portsValidation.isValid) {
      showError('Invalid Ports', portsValidation.error || 'QR payload contained invalid ports');
      return;
    }

    const validatedHost = hostValidation.sanitizedValue as string;
    const sanitizedShowPorts = portsValidation.sanitizedValue as { remote: number; stage: number; control: number; output: number; api: number };
    const apiPortToUse = sanitizedShowPorts.api > 0 ? sanitizedShowPorts.api : configService.getNetworkConfig().defaultPort;
    const historyMatch = history.find(h => h.host === validatedHost);
    const nameToUse = payload.nickname || historyMatch?.nickname;

    // Update UI with scanned host
    setHost(validatedHost);
    setRemotePort(sanitizedShowPorts.remote ? String(sanitizedShowPorts.remote) : '');
    setStagePort(sanitizedShowPorts.stage ? String(sanitizedShowPorts.stage) : '');
    setControlPort(sanitizedShowPorts.control ? String(sanitizedShowPorts.control) : '');
    setOutputPort(sanitizedShowPorts.output ? String(sanitizedShowPorts.output) : '');
    setApiPort(sanitizedShowPorts.api ? String(sanitizedShowPorts.api) : '');

    try {
      const connected = await connect(validatedHost, apiPortToUse, nameToUse);
      if (connected) {
        try {
          await updateShowPorts(sanitizedShowPorts);
        } catch (error) {
          ErrorLogger.error('Failed to update show ports after QR scan connection', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
        }
        await settingsRepository.addToConnectionHistory(validatedHost, apiPortToUse, nameToUse, sanitizedShowPorts);
        navigation.navigate('Interface');
      }
    } catch (connectionError) {
      ErrorLogger.error('Auto-connection from structured QR failed', 'ConnectScreen',
        connectionError instanceof Error ? connectionError : new Error(String(connectionError))
      );
      showError('Connection Failed', 'Could not connect using the scanned connection. Please ensure FreeShow is running and try again.');
    }
  }, [history, connect, updateShowPorts, navigation, showError]);

  // Helper function to handle legacy QR format
  const handleLegacyQRFormat = useCallback(async (sanitizedContent: string) => {
    // Extract host from URL if it's a full URL, otherwise use as-is
    let extractedHost = sanitizedContent;
    try {
      const url = new URL(sanitizedContent);
      extractedHost = url.hostname;
    } catch {
      // Not a URL, use the content as-is (should be an IP or hostname)
    }

    // Final validation of the extracted host
    const hostValidation = ValidationService.validateHost(extractedHost);
    if (!hostValidation.isValid) {
      showError('Invalid Host', `QR code contains invalid host: ${hostValidation.error}`);
      return;
    }

    const validatedHost = hostValidation.sanitizedValue as string;

    // Update UI with scanned host
    setHost(validatedHost);

    // Auto-connect after QR scan
    try {
      // Validate current port configuration for auto-connect
      const portsToValidate = {
        remote: remotePort,
        stage: stagePort,
        control: controlPort,
        output: outputPort,
        api: apiPort,
      };

      const validatedPorts: any = {};
      for (const [portName, portValue] of Object.entries(portsToValidate)) {
        const portValidation = ValidationService.validatePort(portValue);
        if (!portValidation.isValid) {
          showError('Connection Error', `Invalid ${portName} port configuration. Please check your port settings and try again.`);
          return;
        }
        validatedPorts[portName] = portValidation.sanitizedValue;
      }

      // Additional validation for show ports as a group
      const showPortsValidation = ValidationService.validateShowPorts(validatedPorts);
      if (!showPortsValidation.isValid) {
        showError('Port Configuration Error', showPortsValidation.error || 'Invalid port configuration. Please check your settings.');
        return;
      }

      const sanitizedShowPorts = showPortsValidation.sanitizedValue;
      const defaultPort = configService.getNetworkConfig().defaultPort;

      // Find existing nickname before connecting
      const historyMatch = history.find(h => h.host === validatedHost);
      const nameToUse = historyMatch?.nickname;

      const connected = await connect(validatedHost, defaultPort, nameToUse);

      if (connected) {
        // Update show ports after successful connection
        try {
          await updateShowPorts(sanitizedShowPorts);
        } catch (error) {
          ErrorLogger.error('Failed to update show ports after QR auto-connection', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
        }
        navigation.navigate('Interface');
      }
    } catch (connectionError) {
      ErrorLogger.error('Auto-connection from QR scan failed', 'ConnectScreen',
        connectionError instanceof Error ? connectionError : new Error(String(connectionError))
      );
      showError('Connection Failed', 'Could not connect to the scanned FreeShow instance. Please check that FreeShow is running and try again.');
    }
  }, [remotePort, stagePort, controlPort, outputPort, apiPort, history, connect, updateShowPorts, navigation, showError]);

  // Update: Scan button clears results and rescans, or cancels if already scanning
  const handleScanPress = () => {
    if (isScanActive) {
      // Cancel scanning
      stopDiscovery();
      setIsScanActive(false);
      setScanComplete(false);
      animatedScanProgress.setValue(0);
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    } else {
      // Start scanning
      clearDiscoveredServices();
      setScanComplete(false);
      setIsScanActive(true);
      // Reset animated progress
      animatedScanProgress.setValue(0);
      startDiscovery();
    }
  };

  const handleQRScan = async (scannedContent: string) => {
    try {
      // Validate QR content
      const qrValidation = ValidationService.validateQRContent(scannedContent);
      if (!qrValidation.isValid) {
        showError('Invalid QR Code', qrValidation.error || 'The QR code contains invalid content');
        setShowQRScanner(false);
        return;
      }

      const value = qrValidation.sanitizedValue as any;

      // Case 1: Structured payload with nickname and ports
      if (value && typeof value === 'object' && value.type === 'freeshow-remote-connection') {
        await handleStructuredQRPayload(value);
        setShowQRScanner(false);
        return;
      }

      // Case 2: Legacy URL/host format
      await handleLegacyQRFormat(value as string);
      setShowQRScanner(false);

    } catch (error) {
      ErrorLogger.error('QR scan processing failed', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
      showError('QR Scan Error', 'Failed to process QR code content');
      setShowQRScanner(false);
    }
  };

  const isConnecting = connectionStatus === 'connecting';

  // Render connected screen when connected
  const connectedContent = isConnected ? (
    <>
      <ConnectedScreen
        connectionName={connectionName}
        connectionHost={connectionHost}
        currentShowPorts={currentShowPorts}
        onDisconnect={handleDisconnect}
        onShowQRCode={() => setShowQrModalVisible(true)}
        onEditNickname={() => {
          // Find the current connection in history and trigger edit
          let currentConnection = history.find(item => 
            item.host === connectionHost && item.showPorts?.api === currentShowPorts?.api
          );
          
          // If no matching connection found, create a temporary one for editing
          if (!currentConnection) {
            currentConnection = {
              id: connectionHost || 'unknown',
              host: connectionHost || 'unknown',
              nickname: connectionName || undefined,
              lastUsed: new Date().toISOString(),
              successfulConnections: 1,
              showPorts: currentShowPorts || undefined,
            };
          }
          
          handleEditNickname(currentConnection);
        }}
      />
      
      <EditNicknameModal
        visible={showEditNickname}
        editingConnection={editingConnection}
        editNicknameText={editNicknameText}
        setEditNicknameText={setEditNicknameText}
        onSave={handleSaveNickname}
        onCancel={handleCancelEdit}
      />
    </>
  ) : null;

  const isTV = getDeviceType().isTV;
  const SafeAreaWrapper = isTV ? SafeAreaView : View;

  // Render disconnected screen when not connected
  const disconnectedContent = !isConnected ? (
    <LinearGradient
      colors={FreeShowTheme.gradients.appBackground}
      style={styles.container}
    >
      <SafeAreaWrapper style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={isTV ? styles.scrollContent : styles.scrollContentWithFloatingNav}
          showsVerticalScrollIndicator={false}
        >
            <Header
              isConnected={isConnected}
              connectionName={connectionName}
              connectionHost={connectionHost}
              connectionPulse={connectionPulse}
              shouldAnimate={appLaunch.isLoading() ? false : appLaunch.shouldAnimate()}
              connectionStatus={connectionStatus}
              currentShowPorts={currentShowPorts}
            />

          {/* Quick Connect Section - Only show when not connected */}
          {!isConnected && (history.length > 0 || discoveredServices.length > 0 || isDiscoveryAvailable) && (
            <QuickConnectSection
              history={history}
              discoveredServices={discoveredServices as DiscoveredFreeShowInstance[]}
              isDiscoveryAvailable={isDiscoveryAvailable}
              isScanActive={isScanActive}
              scanComplete={scanComplete}
              animatedScanProgress={animatedScanProgress}
              onScanPress={handleScanPress}
              onDiscoveredConnect={handleDiscoveredConnect}
              onHistoryConnect={handleHistoryConnect}
              onRemoveFromHistory={handleRemoveFromHistory}
              onEditNickname={handleEditNickname}
              onClearAllHistory={handleClearAllHistory}
            />
          )}

          <ConnectionForm
            host={host}
            setHost={setHost}
            remotePort={remotePort}
            setRemotePort={setRemotePort}
            stagePort={stagePort}
            setStagePort={setStagePort}
            controlPort={controlPort}
            setControlPort={setControlPort}
            outputPort={outputPort}
            setOutputPort={setOutputPort}
            apiPort={apiPort}
            setApiPort={setApiPort}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            isConnected={isConnected}
            isConnecting={isConnecting || isPingingInterfaces}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onCancelConnection={cancelConnection}
            onShowQRScanner={() => setShowQRScanner(true)}
            onShowShareQR={() => setShowShareQR(true)}
            navigation={navigation}
          />

            <HelpSection isConnected={isConnected} />
        </ScrollView>

        <EditNicknameModal
          visible={showEditNickname}
          editingConnection={editingConnection}
          editNicknameText={editNicknameText}
          setEditNicknameText={setEditNicknameText}
          onSave={handleSaveNickname}
          onCancel={handleCancelEdit}
        />

        <QRScannerModal
          visible={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
        />

        {/* Clear All History Confirmation Modal */}
        <ConfirmationModal
          visible={showClearAllConfirm}
          title="Clear All History"
          message="Are you sure you want to remove all connection history? This action cannot be undone."
          confirmText="Clear All"
          cancelText="Cancel"
          confirmStyle="destructive"
          icon="warning-outline"
          onConfirm={confirmClearAllHistory}
          onCancel={cancelClearAllHistory}
        />

        {/* Error Modal */}
        <ErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          message={errorModal.message}
          onClose={hideError}
        />
        </KeyboardAvoidingView>
      </SafeAreaWrapper>
    </LinearGradient>
  ) : null;

  // Render the appropriate content based on connection state
  return (
    <>
      {connectedContent}
      {disconnectedContent}
      
      {/* Shared modals available in both connected and disconnected states */}
      <ShareQRModal
        visible={showShareQR || showQrModalVisible}
        onClose={() => {
          setShowShareQR(false);
          setShowQrModalVisible(false);
        }}
        host={connectionHost || host}
        port={String(configService.getNetworkConfig().defaultPort)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.xxxl,
  },
  scrollContentWithFloatingNav: {
    padding: FreeShowTheme.spacing.lg,
    paddingBottom: 120,
  },
});

export default ConnectScreen;


