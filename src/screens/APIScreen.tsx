import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { io, Socket } from 'socket.io-client'
import ErrorModal from '../components/ErrorModal'
import ShowSwitcher from '../components/ShowSwitcher'
import { configService } from '../config/AppConfig'
import { useConnection } from '../contexts'
import { ErrorLogger } from '../services/ErrorLogger'
import { FreeShowTheme } from '../theme/FreeShowTheme'
import { ShowOption } from '../types'
import { getDeviceType } from "../utils/navigationUtils"
import { useApiFavorites } from '../hooks/useApiFavorites'
import { apiCategories, findCommandById } from '../services/api/apiSchema'
import CommandCard from '../components/api/CommandCard'
import APICommandModal from '../components/api/APICommandModal'
import CustomCommandModal from '../components/api/CustomCommandModal'
import { buildSendArgsFromFavorite } from '../services/api/favoriteUtils'
import ConfirmRunModal from '../components/api/ConfirmRunModal'

interface APIScreenProps {
  route: {
    params?: {
      title?: string;
      showId?: string;
    };
  };
  navigation: any;
  embedded?: boolean;
}

const APIScreen: React.FC<APIScreenProps> = ({ route, navigation, embedded = false }) => {
  const { state } = useConnection();
  const { connectionHost, isConnected, currentShowPorts } = state;
  const { title = 'FreeShow Remote' } = route.params || {};
  const deviceType = getDeviceType();
  const isTV = deviceType.isTV;
  const isTablet = deviceType.isTablet;
  const SafeAreaWrapper = isTV ? SafeAreaView : View;

  // State management
  const [socketConnected, setSocketConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [showCustom, setShowCustom] = useState(false);
  const [activeCommandId, setActiveCommandId] = useState<string | null>(null);
  const [confirmCommandId, setConfirmCommandId] = useState<string | null>(null);
  
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
    navigation.replace('WebView', {
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

      // No-op: we don't need to process inbound data here for UI

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

  // No response parsing required in this screen

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

  const handleClearAll = () => sendApiCommand('clear_all');

  // New UX helpers
  const { favorites, toggleActionId, removeFavorite } = useApiFavorites();
  const openCommand = (id: string) => {
    const found = findCommandById(id)
    const hasParams = !!found?.command.params && Object.keys(found!.command.params!).length > 0
    if (hasParams) {
      setActiveCommandId(id)
    } else {
      setConfirmCommandId(id)
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
      <SafeAreaWrapper style={styles.safeArea} {...(isTV && { edges: ['top', 'left', 'right'] })}>
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
      {!embedded && !isFullScreen && (
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

          {/* Right controls: Fullscreen only (search handled by WebView when embedded) */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.fullScreenButton} onPress={handleToggleFullScreen}>
              <Ionicons 
                name={isFullScreen ? "contract" : "expand"} 
                size={20} 
                color={FreeShowTheme.colors.text} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search moved to header modal */}
          {/* Favorites */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorites</Text>
            {favorites.length === 0 ? (
              <Text style={styles.errorSubtext}>No favorites yet. Tap the star on any command to add it.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
                {favorites.map((fav, idx) => {
                  const handlePress = () => {
                    const args = buildSendArgsFromFavorite(fav)
                    if (args) sendApiCommand(args.action, args.data || {}, false)
                  }
                  const isAction = fav.type === 'action'
                  const label = isAction ? (findCommandById(fav.actionId)?.command.label || fav.actionId) : 'Custom'
                  return (
                    <View key={`${fav.id}-${idx}`} style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: FreeShowTheme.colors.primaryDarker,
                          borderWidth: 1,
                          borderColor: FreeShowTheme.colors.primaryLighter,
                          borderRadius: FreeShowTheme.borderRadius.lg,
                          paddingVertical: FreeShowTheme.spacing.xl,
                          alignItems: 'center',
                          gap: 8,
                        }}
                        onPress={handlePress}
                        onLongPress={() => removeFavorite(fav.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={(isAction ? 'flash-outline' : 'code-slash') as any} size={22} color={FreeShowTheme.colors.text} />
                        <Text style={{ color: FreeShowTheme.colors.text, fontWeight: '600' }}>{label}</Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            )}
          </View>

          {/* Categories grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
              {apiCategories.map(cat => (
                <View key={cat.id} style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: FreeShowTheme.colors.primaryDarker,
                      borderWidth: 1,
                      borderColor: FreeShowTheme.colors.primaryLighter,
                      borderRadius: FreeShowTheme.borderRadius.lg,
                      paddingVertical: FreeShowTheme.spacing.xl,
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onPress={() => navigation.navigate('APICategory', { categoryId: cat.id })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={(cat.icon || 'cube-outline') as any} size={22} color={FreeShowTheme.colors.text} />
                    <Text style={{ color: FreeShowTheme.colors.text, fontWeight: '600' }}>{cat.label}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {/* Custom Command card as the last category */}
              <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: FreeShowTheme.colors.primaryDarker,
                    borderWidth: 1,
                    borderColor: FreeShowTheme.colors.primaryLighter,
                    borderRadius: FreeShowTheme.borderRadius.lg,
                    paddingVertical: FreeShowTheme.spacing.xl,
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onPress={() => setShowCustom(true)}
                  activeOpacity={0.8}
                  disabled={!socketConnected}
                >
                  <Ionicons name={'code-slash'} size={22} color={FreeShowTheme.colors.text} />
                  <Text style={{ color: FreeShowTheme.colors.text, fontWeight: '600' }}>Custom Command</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

      </View>

      {/* Loading Overlay */}
      {isConnecting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={FreeShowTheme.colors.secondary} />
        </View>
      )}

      {/* New Modals */}
      {activeCommandId && findCommandById(activeCommandId)?.command && (
        <APICommandModal
          visible={!!activeCommandId}
          onClose={() => setActiveCommandId(null)}
          command={findCommandById(activeCommandId)!.command}
          onSaved={() => {
            setActiveCommandId(null)
          }}
        />
      )}
      <CustomCommandModal visible={showCustom} onClose={() => setShowCustom(false)} onSaved={() => setShowCustom(false)} />

      {/* Confirmation modal for parameterless commands */}
      <ConfirmRunModal
        visible={!!confirmCommandId}
        title={findCommandById(confirmCommandId || '')?.command.label || 'Run Command'}
        message={'Are you sure you want to run this command?'}
        onCancel={() => setConfirmCommandId(null)}
        onConfirm={async () => {
          if (confirmCommandId) {
            await sendApiCommand(confirmCommandId)
            setConfirmCommandId(null)
          }
        }}
      />

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
      {!embedded && isFullScreen && showFullscreenHint && (
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
      {!embedded && isFullScreen && (
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