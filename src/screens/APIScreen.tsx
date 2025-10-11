import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ErrorLogger } from '../services/ErrorLogger';
import { useConnection, useSettings } from '../contexts';
import { getNavigationLayoutInfo } from '../utils/navigationUtils';
import ShowSwitcher from '../components/ShowSwitcher';
import { ShowOption } from '../types';
import ErrorModal from '../components/ErrorModal';
import { configService } from '../config/AppConfig';

interface APIScreenProps {
  route: {
    params?: {
      title?: string;
      showId?: string;
    };
  };
  navigation: any;
}

const APIScreen: React.FC<APIScreenProps> = ({ route, navigation }) => {
  const { state } = useConnection();
  const { settings } = useSettings();
  const { connectionHost, isConnected, currentShowPorts } = state;
  const { title = 'FreeShow Remote' } = route.params || {};
  const { shouldSkipSafeArea } = getNavigationLayoutInfo(settings?.navigationLayout);
  const SafeAreaWrapper = shouldSkipSafeArea ? View : SafeAreaView;

  // State management
  const [socketConnected, setSocketConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Advanced mode state
  const [customCommand, setCustomCommand] = useState('');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [shows, setShows] = useState<any[]>([]);
  
  // Fullscreen state
  const [lastTap, setLastTap] = useState<number | null>(null);
  const [showCornerFeedback, setShowCornerFeedback] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const DOUBLE_TAP_DELAY = configService.getNetworkConfig().doubleTapDelay;
  
  const socketRef = useRef<Socket | null>(null);
  const connectionErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownErrorRef = useRef<boolean>(false);
  const [errorModal, setErrorModal] = useState<{visible: boolean, title: string, message: string, onRetry?: () => void}>({
    visible: false,
    title: '',
    message: '',
    onRetry: undefined
  });

  useEffect(() => {
    if (isConnected && connectionHost) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isConnected, connectionHost]);

  // Show fullscreen hint when entering fullscreen
  useEffect(() => {
    if (isFullScreen) {
      setShowFullscreenHint(true);
      const timer = setTimeout(() => {
        setShowFullscreenHint(false);
      }, configService.getNetworkConfig().fullscreenHintDuration);
      
      return () => clearTimeout(timer);
    }
  }, [isFullScreen]);

  const handleShowSelect = (show: ShowOption) => {
    navigation.navigate('WebView', {
      title: show.title,
      url: `http://${connectionHost}:${show.port}`,
      showId: show.id,
    });
  };

  // Check if API is available
  const isApiAvailable = currentShowPorts?.api && currentShowPorts.api > 0;

  const handleToggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  // Handle double-tap on corner to exit fullscreen
  const handleCornerDoubleTap = () => {
    if (!isFullScreen) return;

    const now = Date.now();
    
    setShowCornerFeedback(true);
    setTimeout(() => setShowCornerFeedback(false), configService.getNetworkConfig().cornerFeedbackDuration);

    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      // Double tap detected - exit fullscreen
      setIsFullScreen(false);
      setLastTap(null);
    } else {
      setLastTap(now);
    }
  };

  const connectWebSocket = async () => {
    if (!connectionHost) return;

    // If API is not available, don't try to connect
    if (!isApiAvailable) {
      ErrorLogger.info('API not available - interface-only mode', 'APIScreen');
      setSocketConnected(false);
      return;
    }

    try {
      hasShownErrorRef.current = false;
      ErrorLogger.info('Connecting to FreeShow WebSocket API', 'APIScreen');
      
      if (connectionErrorTimeoutRef.current) {
        clearTimeout(connectionErrorTimeoutRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socketUrl = `http://${connectionHost}:${currentShowPorts.api}`;
      socketRef.current = io(socketUrl, { 
        transports: ["websocket"],
        timeout: configService.getNetworkConfig().connectionTimeout,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current.on('connect', () => {
        ErrorLogger.info('FreeShow Remote connected successfully', 'APIScreen');
        setSocketConnected(true);
        
        if (connectionErrorTimeoutRef.current) {
          clearTimeout(connectionErrorTimeoutRef.current);
        }
        hasShownErrorRef.current = false;
      });

      socketRef.current.on('disconnect', (reason) => {
        ErrorLogger.info('FreeShow Remote disconnected', 'APIScreen', { reason });
        setSocketConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        ErrorLogger.error('WebSocket connection error', 'APIScreen', error);
        
        if (!hasShownErrorRef.current) {
          connectionErrorTimeoutRef.current = setTimeout(() => {
            if (!socketConnected && !hasShownErrorRef.current) {
              hasShownErrorRef.current = true;
              setErrorModal({
                visible: true,
                title: 'Connection Failed',
                message: `Cannot connect to FreeShow:\n\n${error.message}\n\nPlease check:\n• FreeShow is running\n• WebSocket/REST API is enabled\n• Port ${configService.getNetworkConfig().defaultPort} is accessible`,
                onRetry: () => {
                  hasShownErrorRef.current = false;
                  setErrorModal({visible: false, title: '', message: ''});
                  connectWebSocket();
                }
              });
            }
          }, 3000);
        }
      });

      socketRef.current.on('data', (response) => {
        handleApiResponse(response);
      });

    } catch (error) {
      ErrorLogger.error('Failed to setup WebSocket connection', 'APIScreen', error instanceof Error ? error : new Error(String(error)));
      if (!hasShownErrorRef.current) {
        hasShownErrorRef.current = true;
        setErrorModal({
          visible: true,
          title: 'Setup Failed',
          message: `Failed to setup connection: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
  };

  const disconnectWebSocket = () => {
    if (connectionErrorTimeoutRef.current) {
      clearTimeout(connectionErrorTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocketConnected(false);
    hasShownErrorRef.current = false;
  };

  const handleApiResponse = (response: any) => {
    try {
      let data;
      if (typeof response === 'string') {
        try {
          data = JSON.parse(response);
        } catch {
          data = response;
        }
      } else {
        data = response;
      }

      ErrorLogger.debug('API Response received', 'APIScreen', { data });
      setApiResponse(JSON.stringify(data, null, 2));

      // Handle shows data for advanced mode
      if (data && typeof data === 'object' && isShowsData(data)) {
        const showsList: any[] = [];
        for (const [showId, showData] of Object.entries(data)) {
          if (showData && typeof showData === 'object') {
            showsList.push({
              id: showId,
              name: (showData as any).name || showId,
            });
          }
        }
        setShows(showsList);
      }
    } catch (error) {
              ErrorLogger.error('Error parsing API response', 'APIScreen', error instanceof Error ? error : new Error(String(error)));
      setApiResponse(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const isShowsData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    const firstKey = Object.keys(data)[0];
    if (!firstKey) return false;
    const firstItem = data[firstKey];
    return firstItem && (
      Object.prototype.hasOwnProperty.call(firstItem, 'name') || 
      Object.prototype.hasOwnProperty.call(firstItem, 'slides') ||
      Object.prototype.hasOwnProperty.call(firstItem, 'category')
    );
  };

  const sendApiCommand = async (action: string, data: any = {}, showAlert: boolean = true): Promise<void> => {
    if (!connectionHost || !socketRef.current || !socketRef.current.connected) {
      if (showAlert) {
        setErrorModal({
          visible: true,
          title: 'Error',
          message: 'Not connected to FreeShow'
        });
      }
      return;
    }

    try {
      setIsConnecting(true);
      const command = { action, ...data };
      ErrorLogger.debug('Sending API command', 'APIScreen', { command });
      socketRef.current.emit('data', JSON.stringify(command));
    } catch (error) {
      ErrorLogger.error('API command failed', 'APIScreen', error instanceof Error ? error : new Error(String(error)));
      if (showAlert) {
        setErrorModal({
          visible: true,
          title: 'Command Failed',
          message: `Failed to execute "${action}"`
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Core remote functions
  const handleNextSlide = () => sendApiCommand('next_slide');
  const handlePreviousSlide = () => sendApiCommand('previous_slide');
  const handleNextProject = () => sendApiCommand('next_project_item');
  const handlePreviousProject = () => sendApiCommand('previous_project_item');
  const handleClearAll = () => sendApiCommand('clear_all');

  // Advanced functions
  const handleCustomCommand = () => {
    if (!customCommand.trim()) return;
    
    try {
      const parsed = JSON.parse(customCommand);
      if (parsed.action) {
        sendApiCommand(parsed.action, parsed.data || {}, false);
      } else {
        sendApiCommand(customCommand.trim(), {}, false);
      }
    } catch {
      sendApiCommand(customCommand.trim(), {}, false);
    }
  };

  if (!isConnected) {
    return (
      <SafeAreaWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="wifi-outline" size={64} color={FreeShowTheme.colors.textSecondary} />
          <Text style={styles.errorText}>Not connected to FreeShow</Text>
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={() => navigation.navigate('Connect')}
          >
            <Text style={styles.connectButtonText}>Go to Connect</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaWrapper>
    );
  }

  // Show API not available UI if connected but API is disabled
  if (!isApiAvailable) {
    return (
      <SafeAreaWrapper style={styles.safeArea} {...(!shouldSkipSafeArea && { edges: ['top', 'left', 'right'] })}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          
          {connectionHost ? (
            <ShowSwitcher
              currentTitle={title}
              currentShowId="api"
              connectionHost={connectionHost}
              showPorts={currentShowPorts || undefined}
              onShowSelect={handleShowSelect}
            />
          ) : (
            <Text style={styles.title}>{title}</Text>
          )}
          
          <View style={styles.placeholder} />
        </View>

        <View style={styles.centerContainer}>
          <Ionicons name="settings-outline" size={64} color={FreeShowTheme.colors.textSecondary} />
          <Text style={styles.errorText}>API Interface Not Available</Text>
          <Text style={styles.errorSubtext}>
            The API interface is disabled in your current connection. 
            To use API features, enable the API port in FreeShow and reconnect.
          </Text>
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={() => navigation.navigate('Connect')}
          >
            <Text style={styles.connectButtonText}>Reconnect with API</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!isFullScreen && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          
          {connectionHost ? (
            <ShowSwitcher
              currentTitle={title}
              currentShowId="api"
              connectionHost={connectionHost}
              showPorts={currentShowPorts || undefined}
              onShowSelect={handleShowSelect}
            />
          ) : (
            <Text style={styles.title}>{title}</Text>
          )}

          <TouchableOpacity style={styles.fullScreenButton} onPress={handleToggleFullScreen}>
            <Ionicons 
              name={isFullScreen ? "contract" : "expand"} 
              size={20} 
              color={FreeShowTheme.colors.text} 
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Slide Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Slide Control</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.previousButton]}
              onPress={handlePreviousSlide}
              disabled={isConnecting || !socketConnected}
            >
              <Ionicons name="chevron-back" size={32} color="white" />
              <Text style={styles.controlButtonText}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.nextButton]}
              onPress={handleNextSlide}
              disabled={isConnecting || !socketConnected}
            >
              <Ionicons name="chevron-forward" size={32} color="white" />
              <Text style={styles.controlButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Project Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Control</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.projectButton]}
              onPress={handlePreviousProject}
              disabled={isConnecting || !socketConnected}
            >
              <Ionicons name="folder-open" size={24} color="white" />
              <Text style={styles.controlButtonText}>Previous Project</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.projectButton]}
              onPress={handleNextProject}
              disabled={isConnecting || !socketConnected}
            >
              <Ionicons name="folder" size={24} color="white" />
              <Text style={styles.controlButtonText}>Next Project</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Advanced Button */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <TouchableOpacity
            style={[styles.advancedButton, !socketConnected && styles.advancedButtonDisabled]}
            onPress={() => setShowAdvanced(true)}
            disabled={!socketConnected}
          >
            <View style={styles.advancedButtonContent}>
              <Ionicons name="settings-outline" size={28} color="white" />
              <View style={styles.advancedButtonTextContainer}>
                <Text style={styles.advancedButtonTitle}>Advanced Controls</Text>
                <Text style={styles.advancedButtonSubtitle}>Access advanced API functions</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Clear All - Always at bottom */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={[styles.clearAllButton, !socketConnected && styles.clearAllButtonDisabled]}
          onPress={handleClearAll}
          disabled={isConnecting || !socketConnected}
        >
          <Ionicons name="close-circle" size={24} color="white" />
          <Text style={styles.clearAllButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      </View>

      {/* Loading Overlay */}
      {isConnecting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={FreeShowTheme.colors.secondary} />
        </View>
      )}

      {/* Advanced Modal */}
      <Modal
        visible={showAdvanced}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdvanced(false)}
      >
        <SafeAreaView style={styles.advancedContainer}>
          <View style={styles.advancedHeader}>
            <Text style={styles.advancedTitle}>Advanced API Controls</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAdvanced(false)}
            >
              <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.advancedContent}>
            {/* Connection Status */}
            <View style={styles.advancedSection}>
              <Text style={styles.advancedSectionTitle}>Connection Status</Text>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>WebSocket:</Text>
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: socketConnected ? '#28a745' : '#dc3545' }]} />
                  <Text style={styles.statusText}>{socketConnected ? 'Connected' : 'Disconnected'}</Text>
                </View>
              </View>
            </View>

            {/* Quick Data Loading */}
            <View style={styles.advancedSection}>
              <Text style={styles.advancedSectionTitle}>Data Loading</Text>
              <View style={styles.advancedButtonRow}>
                <TouchableOpacity 
                  style={styles.advancedModalButton}
                  onPress={() => sendApiCommand('get_shows', {}, false)}
                  disabled={isConnecting || !socketConnected}
                >
                  <Text style={styles.advancedButtonText}>Load Shows</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.advancedModalButton}
                  onPress={() => sendApiCommand('get_projects', {}, false)}
                  disabled={isConnecting || !socketConnected}
                >
                  <Text style={styles.advancedButtonText}>Load Projects</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom Command */}
            <View style={styles.advancedSection}>
              <Text style={styles.advancedSectionTitle}>Custom API Command</Text>
              <View style={styles.customCommandContainer}>
                <TextInput
                  style={styles.customCommandInput}
                  value={customCommand}
                  onChangeText={setCustomCommand}
                  placeholder='e.g., get_shows or {"action":"get_slide","showId":"show1"}'
                  placeholderTextColor={FreeShowTheme.colors.textSecondary}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, !customCommand.trim() && styles.sendButtonDisabled]}
                  onPress={handleCustomCommand}
                  disabled={isConnecting || !customCommand.trim() || !socketConnected}
                >
                  <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* API Response */}
            <View style={styles.advancedSection}>
              <Text style={styles.advancedSectionTitle}>API Response</Text>
              <ScrollView style={styles.responseContainer} nestedScrollEnabled>
                <Text style={styles.responseText}>{apiResponse || 'No response yet'}</Text>
              </ScrollView>
            </View>

            {/* Shows List (if loaded) */}
            {shows.length > 0 && (
              <View style={styles.advancedSection}>
                <Text style={styles.advancedSectionTitle}>Shows ({shows.length})</Text>
                {shows.slice(0, 10).map((show) => (
                  <TouchableOpacity
                    key={show.id}
                    style={styles.showItem}
                    onPress={() => sendApiCommand('name_select_show', { value: show.name }, false)}
                    disabled={isConnecting}
                  >
                    <Text style={styles.showItemText}>{show.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={FreeShowTheme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
                {shows.length > 10 && (
                  <Text style={styles.moreItemsText}>... and {shows.length - 10} more shows</Text>
                )}
              </View>
            )}

            {/* Clear All in Advanced Mode too */}
            <View style={styles.advancedSection}>
              <TouchableOpacity 
                style={[styles.clearAllButton, !socketConnected && styles.clearAllButtonDisabled]}
                onPress={handleClearAll}
                disabled={isConnecting || !socketConnected}
              >
                <Ionicons name="close-circle" size={24} color="white" />
                <Text style={styles.clearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Error Modal */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        buttonText={errorModal.onRetry ? 'Retry' : 'OK'}
        onClose={() => {
          if (errorModal.onRetry) {
            errorModal.onRetry();
          } else {
            setErrorModal({visible: false, title: '', message: ''});
          }
        }}
      />

      {/* Fullscreen hint (tap to dismiss) */}
      {isFullScreen && showFullscreenHint && (
        <TouchableOpacity
          style={styles.fullscreenHint}
          activeOpacity={0.85}
          onPress={() => setShowFullscreenHint(false)}
        >
          <View style={styles.hintContainer}>
            <Ionicons name="information-circle" size={20} color={FreeShowTheme.colors.text} />
            <Text style={styles.hintText}>Double-tap any corner to exit fullscreen</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Double-tap corners to exit fullscreen */}
      {isFullScreen && (
        <>
          {/* Top-left corner */}
          <TouchableWithoutFeedback onPress={handleCornerDoubleTap}>
            <View style={[styles.corner, styles.topLeft, showCornerFeedback && styles.cornerFeedback]} />
          </TouchableWithoutFeedback>

          {/* Top-right corner */}
          <TouchableWithoutFeedback onPress={handleCornerDoubleTap}>
            <View style={[styles.corner, styles.topRight, showCornerFeedback && styles.cornerFeedback]} />
          </TouchableWithoutFeedback>

          {/* Bottom-left corner */}
          <TouchableWithoutFeedback onPress={handleCornerDoubleTap}>
            <View style={[styles.corner, styles.bottomLeft, showCornerFeedback && styles.cornerFeedback]} />
          </TouchableWithoutFeedback>

          {/* Bottom-right corner */}
          <TouchableWithoutFeedback onPress={handleCornerDoubleTap}>
            <View style={[styles.corner, styles.bottomRight, showCornerFeedback && styles.cornerFeedback]} />
          </TouchableWithoutFeedback>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingTop: 10,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  closeButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: FreeShowTheme.spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  errorText: {
    fontSize: FreeShowTheme.fontSize.lg,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: FreeShowTheme.spacing.lg,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: FreeShowTheme.spacing.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingHorizontal: FreeShowTheme.spacing.xl,
    paddingVertical: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginTop: FreeShowTheme.spacing.xl,
  },
  connectButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  section: {
    marginBottom: FreeShowTheme.spacing.xl * 1.5,
  },
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  // Control Buttons
  controlRow: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.lg,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.xl,
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  controlButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  previousButton: {
    backgroundColor: '#FF851B',
  },
  nextButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  projectButton: {
    backgroundColor: '#007bff',
  },
  // Advanced Button
  advancedButton: {
    backgroundColor: '#333',
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  advancedButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  advancedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advancedButtonTextContainer: {
    flex: 1,
    marginLeft: FreeShowTheme.spacing.lg,
    marginRight: FreeShowTheme.spacing.md,
  },
  advancedButtonTitle: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    marginBottom: FreeShowTheme.spacing.xs,
  },
  advancedButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FreeShowTheme.fontSize.sm,
  },
  // Bottom Section
  bottomSection: {
    padding: FreeShowTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: FreeShowTheme.colors.primaryLighter,
  },
  clearAllButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  clearAllButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  clearAllButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Advanced Modal Styles
  advancedContainer: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  advancedTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  advancedContent: {
    flex: 1,
    padding: FreeShowTheme.spacing.lg,
  },
  advancedSection: {
    marginBottom: FreeShowTheme.spacing.xl,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  advancedSectionTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontWeight: '600',
  },
  advancedButtonRow: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.md,
  },
  advancedModalButton: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    alignItems: 'center',
  },
  advancedButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
  },
  customCommandContainer: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.md,
    alignItems: 'flex-start',
  },
  customCommandInput: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    color: FreeShowTheme.colors.text,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    maxHeight: 100,
    fontSize: FreeShowTheme.fontSize.sm,
  },
  sendButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  responseContainer: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    maxHeight: 200,
  },
  responseText: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.text,
    fontFamily: 'monospace',
  },
  showItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    marginBottom: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  showItemText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text,
    fontWeight: '500',
  },
  moreItemsText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    padding: FreeShowTheme.spacing.md,
    fontStyle: 'italic',
  },
  
  // Fullscreen styles
  fullScreenButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  fullscreenHint: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  hintText: {
    color: FreeShowTheme.colors.text,
    fontSize: 14,
    flex: 1,
  },
  corner: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  topLeft: {
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
  cornerFeedback: {
    backgroundColor: FreeShowTheme.colors.secondary + '30',
    borderRadius: 8,
  },
});

export default APIScreen; 