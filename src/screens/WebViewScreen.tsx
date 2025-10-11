import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import ShowSwitcher from '../components/ShowSwitcher';
import { useConnection } from '../contexts';
import { configService } from '../config/AppConfig';
import { ErrorLogger } from '../services/ErrorLogger';
import { ShowOption } from '../types';
import ErrorModal from '../components/ErrorModal';

interface WebViewScreenProps {
  navigation: any;
  route: any;
}

const WebViewScreen: React.FC<WebViewScreenProps> = ({ navigation, route }) => {
  const { url, title, showId, initialFullscreen = false } = route.params || {};
  const { state } = useConnection();
  const { connectionHost, currentShowPorts } = state;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(initialFullscreen);
  const [currentOrientation, setCurrentOrientation] = useState<ScreenOrientation.Orientation>(ScreenOrientation.Orientation.PORTRAIT_UP);
  const webViewRef = useRef<WebView>(null);
  const [errorModal, setErrorModal] = useState<{visible: boolean, title: string, message: string}>({
    visible: false,
    title: '',
    message: ''
  });

  // Device detection
  const [deviceDimensions, setDeviceDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return {
      isTablet: Math.min(width, height) > 600,
      screenWidth: width,
      screenHeight: height,
    };
  });

  // Double-tap to exit fullscreen
  const [lastTap, setLastTap] = useState<number | null>(null);
  const [showCornerFeedback, setShowCornerFeedback] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const DOUBLE_TAP_DELAY = configService.getNetworkConfig().doubleTapDelay;

  useEffect(() => {
    // Get current orientation on mount
    ScreenOrientation.getOrientationAsync().then(setCurrentOrientation);

    // Listen for orientation changes
    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      setCurrentOrientation(event.orientationInfo.orientation);
    });

    // Listen for dimension changes (device rotation or screen size changes)
    const dimensionSubscription = Dimensions.addEventListener('change', () => {
      const { width, height } = Dimensions.get('window');
      setDeviceDimensions({
        isTablet: Math.min(width, height) > 600,
        screenWidth: width,
        screenHeight: height,
      });
    });

    return () => {
      subscription?.remove();
      dimensionSubscription?.remove();
    };
  }, []);

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

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleToggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleError = () => {
    setError('Failed to load the interface. Please check your connection and try again.');
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleRotateScreen = async () => {
    try {
      const isLandscape = currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
                          currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      
      if (isLandscape) {
        // Switch to portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } else {
        // Switch to landscape
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
      }
    } catch (error) {
      ErrorLogger.error('Failed to rotate screen', 'WebViewScreen', error instanceof Error ? error : new Error(String(error)));
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'Failed to rotate screen'
      });
    }
  };

  // Handle double-tap on corner to exit fullscreen
  const handleCornerDoubleTap = () => {
    if (!isFullScreen) return;

    const now = Date.now();
    
    // Show visual feedback on any tap
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

  const handleOpenInBrowser = async () => {
    if (!url) {
      setErrorModal({ visible: true, title: 'Error', message: 'No URL available to open' });
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('URL not supported');
      }
      await Linking.openURL(url);
    } catch (err) {
      ErrorLogger.error('Failed to open URL in browser', 'WebViewScreen', err instanceof Error ? err : new Error(String(err)));
      setErrorModal({ visible: true, title: 'Error', message: 'Failed to open in browser' });
    }
  };

  const handleCopyUrl = async () => {
    if (!url) {
      setErrorModal({ visible: true, title: 'Error', message: 'No URL available to copy' });
      return;
    }

    try {
      await Clipboard.setStringAsync(url);
      setErrorModal({ visible: true, title: 'Copied', message: 'URL copied to clipboard' });
    } catch (err) {
      ErrorLogger.error('Failed to copy URL', 'WebViewScreen', err instanceof Error ? err : new Error(String(err)));
      setErrorModal({ visible: true, title: 'Error', message: 'Failed to copy URL to clipboard' });
    }
  };

  const handleShowSelect = (show: ShowOption) => {
    if (show.id === 'api') {
      // Navigate to the native APIScreen
      navigation.navigate('APIScreen', {
        title: show.title,
        showId: show.id,
        animationEnabled: false,
      });
      return;
    }

    if (!connectionHost) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'No connection host available'
      });
      return;
    }

    const newUrl = `http://${connectionHost}:${show.port}`;
    
    // Navigate to the new show interface
    navigation.setParams({
      url: newUrl,
      title: show.title,
      showId: show.id,
    });

    // Reload the WebView with the new URL
    if (webViewRef.current) {
      setLoading(true);
      setError(null);
    }
  };

  const handleQuickSwitch = (showId: string) => {
    if (!connectionHost || !currentShowPorts) return;

    const portMap = {
      'remote': currentShowPorts.remote,
      'stage': currentShowPorts.stage,
      'control': currentShowPorts.control,
      'output': currentShowPorts.output,
    };

    const port = portMap[showId as keyof typeof portMap];
    if (!port) return;

    const showTitles = configService.getInterfaceConfigs().reduce((acc, config) => {
      acc[config.id] = config.title;
      return acc;
    }, {} as Record<string, string>);

    const title = showTitles[showId as keyof typeof showTitles];
    const newUrl = `http://${connectionHost}:${port}`;

    // Navigate to the new show interface
    navigation.setParams({
      url: newUrl,
      title: title,
      showId: showId,
    });

    // Reload the WebView with the new URL
    if (webViewRef.current) {
      setLoading(true);
      setError(null);
    }
  };

  const getRotationIcon = () => {
    const isLandscape = currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
                        currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
    return isLandscape ? 'phone-portrait' : 'phone-landscape';
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={FreeShowTheme.colors.text + '66'} />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(null);
            setLoading(true);
          }}>
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!isFullScreen && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          
          {connectionHost && showId ? (
            deviceDimensions.isTablet ? (
              /* Tablet: ShowSwitcher modal + Quick Interface Switch Buttons - Centered */
              <>
                <ShowSwitcher
                  currentTitle={title}
                  currentShowId={showId}
                  connectionHost={connectionHost}
                  showPorts={currentShowPorts || undefined}
                  onShowSelect={handleShowSelect}
                />
                <View style={styles.centerContainer}>
                  <View style={styles.quickButtonsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.quickButton, 
                        showId === 'remote' && styles.quickButtonActive,
                        !currentShowPorts?.remote && styles.quickButtonDisabled
                      ]}
                      onPress={() => currentShowPorts?.remote && handleQuickSwitch('remote')}
                      disabled={!currentShowPorts?.remote}
                    >
                      <Ionicons 
                        name="play-circle" 
                        size={20} 
                        color={
                          showId === 'remote' ? 'white' : 
                          !currentShowPorts?.remote ? FreeShowTheme.colors.text + '40' : 
                          FreeShowTheme.colors.text
                        } 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.quickButton, 
                        showId === 'stage' && styles.quickButtonActive,
                        !currentShowPorts?.stage && styles.quickButtonDisabled
                      ]}
                      onPress={() => currentShowPorts?.stage && handleQuickSwitch('stage')}
                      disabled={!currentShowPorts?.stage}
                    >
                      <Ionicons 
                        name="desktop" 
                        size={20} 
                        color={
                          showId === 'stage' ? 'white' : 
                          !currentShowPorts?.stage ? FreeShowTheme.colors.text + '40' : 
                          FreeShowTheme.colors.text
                        } 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.quickButton, 
                        showId === 'control' && styles.quickButtonActive,
                        !currentShowPorts?.control && styles.quickButtonDisabled
                      ]}
                      onPress={() => currentShowPorts?.control && handleQuickSwitch('control')}
                      disabled={!currentShowPorts?.control}
                    >
                      <Ionicons 
                        name="settings" 
                        size={20} 
                        color={
                          showId === 'control' ? 'white' : 
                          !currentShowPorts?.control ? FreeShowTheme.colors.text + '40' : 
                          FreeShowTheme.colors.text
                        } 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.quickButton, 
                        showId === 'output' && styles.quickButtonActive,
                        !currentShowPorts?.output && styles.quickButtonDisabled
                      ]}
                      onPress={() => currentShowPorts?.output && handleQuickSwitch('output')}
                      disabled={!currentShowPorts?.output}
                    >
                      <Ionicons 
                        name="tv" 
                        size={20} 
                        color={
                          showId === 'output' ? 'white' : 
                          !currentShowPorts?.output ? FreeShowTheme.colors.text + '40' : 
                          FreeShowTheme.colors.text
                        } 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {/* Right spacer for tablet layout */}
                <View style={styles.headerSpacer} />
              </>
            ) : (
              /* Mobile: ShowSwitcher modal */
              <ShowSwitcher
                currentTitle={title}
                currentShowId={showId}
                connectionHost={connectionHost}
                showPorts={currentShowPorts || undefined}
                onShowSelect={handleShowSelect}
              />
            )
          ) : (
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={20} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.openBrowserButton}
            onPress={handleOpenInBrowser}
            onLongPress={handleCopyUrl}
            delayLongPress={300}
          >
            <Ionicons name="open-outline" size={20} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>

          {showId === 'output' && (
            <TouchableOpacity style={styles.rotationButton} onPress={handleRotateScreen}>
              <Ionicons name={getRotationIcon()} size={20} color={FreeShowTheme.colors.text} />
            </TouchableOpacity>
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

      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={FreeShowTheme.colors.secondary} />
            <Text style={styles.loadingText}>Loading {title}...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webView}
          onLoad={handleLoad}
          onError={handleError}
          startInLoadingState={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="compatibility"
          allowsFullscreenVideo={true}
          key={url} // Force re-render when URL changes
        />
      </View>

      {/* Error Modal */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({visible: false, title: '', message: ''})}
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
            <View style={[styles.cornerTapArea, showCornerFeedback && styles.cornerTapAreaActive]} />
          </TouchableWithoutFeedback>
          
          {/* Top-right corner */}
          <TouchableWithoutFeedback onPress={handleCornerDoubleTap}>
            <View style={[styles.cornerTapArea, styles.cornerTapAreaTopRight, showCornerFeedback && styles.cornerTapAreaActive]} />
          </TouchableWithoutFeedback>
          
          {/* Bottom-left corner */}
          <TouchableWithoutFeedback onPress={handleCornerDoubleTap}>
            <View style={[styles.cornerTapArea, styles.cornerTapAreaBottomLeft, showCornerFeedback && styles.cornerTapAreaActive]} />
          </TouchableWithoutFeedback>
          
          {/* Bottom-right corner */}
          <TouchableWithoutFeedback onPress={handleCornerDoubleTap}>
            <View style={[styles.cornerTapArea, styles.cornerTapAreaBottomRight, showCornerFeedback && styles.cornerTapAreaActive]} />
          </TouchableWithoutFeedback>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  titleContainer: {
    flex: 1,
    marginHorizontal: FreeShowTheme.spacing.md,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  refreshButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  openBrowserButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  rotationButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  fullScreenButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  headerSpacer: {
    flex: 1,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + '80',
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: FreeShowTheme.spacing.xs,
    textAlign: 'center',
  },
  quickButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.xs,
  },
  quickButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FreeShowTheme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primary + '40',
  },
  quickButtonActive: {
    backgroundColor: FreeShowTheme.colors.secondary,
    borderColor: FreeShowTheme.colors.secondary,
  },
  quickButtonDisabled: {
    backgroundColor: FreeShowTheme.colors.primary + '10',
    borderColor: FreeShowTheme.colors.primary + '20',
    opacity: 0.5,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  
  webView: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FreeShowTheme.colors.primary,
    zIndex: 1,
  },
  loadingText: {
    marginTop: FreeShowTheme.spacing.md,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  errorTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.sm,
    fontFamily: FreeShowTheme.fonts.system,
  },
  errorText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + '99',
    textAlign: 'center',
    marginBottom: FreeShowTheme.spacing.xl,
    fontFamily: FreeShowTheme.fonts.system,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
  },
  buttonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
  },
  cornerTapArea: {
    position: 'absolute',
    width: 60,
    height: 60,
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
    zIndex: 9999,
  },
  cornerTapAreaTopRight: {
    top: 0,
    right: 0,
    left: 'auto',
  },
  cornerTapAreaBottomLeft: {
    bottom: 0,
    top: 'auto',
    left: 0,
  },
  cornerTapAreaBottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
  },
  cornerTapAreaActive: {
    backgroundColor: FreeShowTheme.colors.secondary + '30',
    borderRadius: 8,
  },
  fullscreenHint: {
  position: 'absolute',
  top: 40,
    left: 20,
    right: 20,
    zIndex: 10000,
    alignItems: 'center',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  hintText: {
    color: FreeShowTheme.colors.text,
    fontSize: FreeShowTheme.fontSize.sm,
    fontFamily: FreeShowTheme.fonts.system,
    marginLeft: FreeShowTheme.spacing.sm,
  },
});

export default WebViewScreen;
