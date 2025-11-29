import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Linking, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { configService } from '../config/AppConfig';
import { useConnection, useSettings } from '../contexts';
import { useAppLaunch } from '../hooks/useAppLaunch';
import { useInterfaceNavigation } from '../hooks/useInterfaceNavigation';
import { useModalState } from '../hooks/useModalState';
import { settingsRepository } from '../repositories';
import { ErrorLogger } from '../services/ErrorLogger';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ShowOption } from '../types';
import { getDeviceType } from '../utils/navigationUtils';

import CompactPopup from '../components/CompactPopup';
import ConfirmationModal from '../components/ConfirmationModal';
import ConnectingScreen from '../components/ConnectingScreen';
import DisabledInterfaceModal from '../components/DisabledInterfaceModal';
import EditNicknameModal from '../components/EditNicknameModal';
import EnableInterfaceModal from '../components/EnableInterfaceModal';
import ErrorModal from '../components/ErrorModal';
import InterfaceCard from '../components/InterfaceCard';
import InterfaceHeader from '../components/InterfaceHeader';
import NotConnectedScreen from '../components/NotConnectedScreen';

interface InterfaceScreenProps {
  navigation: any;
}

/**
 * Interface Screen - Main interface for FreeShow remote control
 * Displays available interfaces and handles navigation between them
 */
const InterfaceScreen: React.FC<InterfaceScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { state, actions } = useConnection();
  const { isTablet, isTV } = getDeviceType();

  const {
    isConnected,
    connectionHost,
    connectionName,
    currentShowPorts,
    autoConnectAttempted,
    connectionStatus,
  } = state;
  const { disconnect, updateShowPorts, cancelConnection } = actions;

  // Edit connection name state
  const { history, actions: settingsActions } = useSettings();
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [editingConnection, setEditingConnection] = useState<any>(null);

  // Separate animation values for main content to avoid being consumed by placeholder
  const contentFade = React.useRef(new Animated.Value(0)).current;
  const contentSlide = React.useRef(new Animated.Value(50)).current;

  // Custom hooks for modal, navigation, and app launch management
  const modalState = useModalState();
  const navigationHandlers = useInterfaceNavigation(navigation, connectionHost, isConnected);
  const appLaunch = useAppLaunch();

  // Animate only once per cold start (session). Otherwise render instantly.
  const introAnimatingRef = React.useRef(false);
  useEffect(() => {
    if (!isConnected) {
      contentFade.setValue(1);
      contentSlide.setValue(0);
      introAnimatingRef.current = false;
      return;
    }

    const shouldAnimate = appLaunch.shouldInterfaceIntroAnimate();
    if (shouldAnimate && !introAnimatingRef.current) {
      introAnimatingRef.current = true;
      contentFade.setValue(0);
      contentSlide.setValue(50);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(contentFade, {
            toValue: 1,
            duration: appLaunch.getAnimationDuration(),
            useNativeDriver: true,
          }),
          Animated.timing(contentSlide, {
            toValue: 0,
            duration: appLaunch.getSlideDuration(),
            useNativeDriver: true,
          }),
        ]).start(() => {
          appLaunch.markInterfaceIntroComplete();
          introAnimatingRef.current = false;
        });
      });
    } else if (!shouldAnimate && !introAnimatingRef.current) {
      contentFade.setValue(1);
      contentSlide.setValue(0);
    }
  }, [isConnected, contentFade, contentSlide, appLaunch]);

  // Get interface options using config service
  const showOptions = React.useMemo(() => {
    const defaultPorts = configService.getDefaultShowPorts();
    const currentPorts = currentShowPorts || defaultPorts;
    const options = configService.createShowOptions(
      currentPorts as unknown as Record<string, number>
    );
    return configService.separateInterfaceOptions(options).allOptions;
  }, [currentShowPorts]);

  // Use navigation hook for interface selection
  const handleShowSelect = (show: ShowOption) => {
    // Check if interface is disabled
    if (!show.port || show.port === 0) {
      modalState.showDisabledInterfaceModal(show);
      return;
    }
    navigationHandlers.handleShowSelect(show);
  };

  // Do not block on AsyncStorage; animation is session-scoped

  // Handler functions using custom hooks
  const handleDisconnect = () => {
    modalState.showDisconnectConfirmModal();
  };

  const confirmDisconnect = () => {
    disconnect();
    modalState.hideDisconnectConfirmModal();
    navigationHandlers.navigateToConnect();
  };

  // Helper function to get interface URL
  const getInterfaceUrl = (show: ShowOption): string | null => {
    if (!connectionHost) {
      modalState.showErrorModal(t('common.error'), t('errors.noConnectionHost'));
      return null;
    }
    return `http://${connectionHost}:${show.port}`;
  };

  // Popup handlers using modal state hook
  const openCompactPopup = (show: ShowOption) => {
    modalState.showCompactPopup(show);
  };

  const copyToClipboard = async (show: ShowOption) => {
    const url = getInterfaceUrl(show);
    if (!url) return;

    try {
      await Clipboard.setStringAsync(url);
      modalState.hideCompactPopup();
    } catch {
      modalState.showErrorModal(t('common.error'), t('errors.failedToCopyUrl'));
    }
  };

  const openInBrowser = async (show: ShowOption) => {
    const url = getInterfaceUrl(show);
    if (!url) return;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        modalState.hideCompactPopup();
      } else {
        modalState.showErrorModal(t('common.error'), t('errors.cannotOpenUrl'));
      }
    } catch {
      modalState.showErrorModal(t('common.error'), t('errors.failedToOpenUrl'));
    }
  };

  // Helper function to get default port for an interface
  const getDefaultPortForInterface = (interfaceId: string): string => {
    const defaultPorts = configService.getDefaultShowPorts();
    const portMap: Record<string, number> = {
      api: defaultPorts.api,
      remote: defaultPorts.remote,
      stage: defaultPorts.stage,
      control: defaultPorts.control,
      output: defaultPorts.output,
    };
    return String(portMap[interfaceId] ?? defaultPorts.api);
  };

  // Handle clicking on a disabled interface
  const handleDisabledInterfaceClick = (show: ShowOption) => {
    modalState.showDisabledInterfaceModal(show);
  };

  // Handle enabling a disabled interface from CompactPopup (go directly to port input)
  const handleEnableInterfaceFromPopup = (show: ShowOption) => {
    const defaultPort = getDefaultPortForInterface(show.id);
    modalState.showEnableInterfaceModal(show, defaultPort);
  };

  // Handle editing connection name
  const handleEditConnectionName = useCallback(() => {
    if (!connectionHost) return;
    
    // Find the connection in history to get its ID
    const historyItem = history.find(h => h.host === connectionHost);
    if (!historyItem) return;

    setEditingConnection(historyItem);
    setShowEditNickname(true);
  }, [connectionHost, history]);

  const handleNicknameSaved = useCallback(async (nickname: string) => {
    // Refresh history and update connection name
    await settingsActions.refreshHistory();
    actions.updateConnectionName(nickname);
    setEditingConnection(null);
  }, [settingsActions, actions]);

  const handleEditError = useCallback((error: string) => {
    modalState.showErrorModal(t('common.error'), error);
  }, [modalState, t]);

  const handleCloseEditModal = useCallback(() => {
    setShowEditNickname(false);
    setEditingConnection(null);
  }, []);

  // Handle enabling a disabled interface from DisabledInterfaceModal (show port input modal)
  const handleEnableDisabledInterface = () => {
    const show = modalState.disabledInterfaceModal.show;
    if (!show) return;

    const defaultPort = getDefaultPortForInterface(show.id);
    
    // Hide disabled modal and show port input modal
    modalState.hideDisabledInterfaceModal();
    modalState.showEnableInterfaceModal(show, defaultPort);
  };

  // Handle saving the port from the enable interface modal
  const handleEnableInterfaceSave = async (port: string) => {
    const show = modalState.enableInterfaceModal.show;
    if (!show || !port || !currentShowPorts) return;

    const portNumber = parseInt(port, 10);
    if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      modalState.showErrorModal(
        t('modals.enableInterface.invalidPort'),
        t('modals.enableInterface.invalidPortMessage')
      );
      return;
    }

    try {
      const updatedPorts = { ...currentShowPorts };
      updatedPorts[show.id as keyof typeof updatedPorts] = portNumber;
      await updateShowPorts(updatedPorts);
      modalState.hideEnableInterfaceModal();
    } catch (error) {
      ErrorLogger.error(
        'Failed to enable interface',
        'InterfaceScreen',
        error instanceof Error ? error : new Error(String(error))
      );
      modalState.showErrorModal(t('common.error'), t('errors.failedToEnableInterface'));
    }
  };

  // Handle disabling an interface
  const handleDisableInterface = async (show: ShowOption) => {
    if (!currentShowPorts) return;

    const updatedPorts = { ...currentShowPorts };
    updatedPorts[show.id as keyof typeof updatedPorts] = 0;

    // Check if this would disable all interfaces
    const enabledInterfaces = Object.values(updatedPorts).filter(port => port > 0);
    if (enabledInterfaces.length === 0) {
      modalState.showErrorModal(
        t('modals.disableInterface.cannotDisable'),
        t('modals.disableInterface.cannotDisableMessage')
      );
      return;
    }

    try {
      await updateShowPorts(updatedPorts);
      modalState.hideCompactPopup();
    } catch (error) {
      ErrorLogger.error(
        'Failed to disable interface',
        'InterfaceScreen',
        error instanceof Error ? error : new Error(String(error))
      );
      modalState.showErrorModal(t('common.error'), t('errors.failedToDisableInterface'));
    }
  };

  // Initial auto-reconnect in progress: show clean loading instead of Not Connected
  if (
    !isConnected &&
    !autoConnectAttempted &&
    (connectionStatus === 'connecting' ||
      connectionStatus === 'disconnected' ||
      connectionStatus === 'error')
  ) {
    return <ConnectingScreen onCancel={cancelConnection} connectionStatus={connectionStatus} />;
  }

  // Not connected state after auto-reconnect attempt is done
  if (!isConnected) {
    return <NotConnectedScreen onNavigateToConnect={navigationHandlers.navigateToConnect} />;
  }

  return (
    <LinearGradient
      colors={FreeShowTheme.gradients.appBackground}
      style={[styles.container, isTV && { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.ScrollView
        style={[
          isTV ? styles.content : styles.contentWithFloatingNav,
          {
            opacity: contentFade,
            transform: [{ translateY: contentSlide }],
          },
        ]}
      >
        {/* Interface Header */}
        <InterfaceHeader
          connectionName={connectionName}
          connectionHost={connectionHost}
          onDisconnect={handleDisconnect}
          onEditConnectionName={handleEditConnectionName}
        />

        {/* Interface Cards */}
        <View style={styles.interfacesSection}>
          <Text
            style={[styles.sectionTitleLarge, isTablet && styles.sectionTitleLargeTablet]}
            accessibilityRole="header"
          >
            {t('interfaceScreen.availableInterfaces')}
          </Text>

          <Animated.View
            style={[
              styles.interfacesContainer,
              { opacity: contentFade, transform: [{ translateY: contentSlide }] },
            ]}
          >
            {/* First Row - 2 cards */}
            <View style={[styles.interfacesRow, (isTablet || isTV) && { marginBottom: 12 }]}>
              {showOptions.slice(0, 2).map((show, index) => (
                <Animated.View
                  key={show.id}
                  style={[
                    styles.interfaceCardWrapper,
                    styles.halfWidth,
                    (isTablet || isTV) && styles.halfWidthTablet,
                    {
                      transform: [
                        {
                          translateY: contentSlide.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, 50 + index * 5],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <InterfaceCard
                    show={show}
                    onPress={() => handleShowSelect(show)}
                    onLongPress={() => openCompactPopup(show)}
                    size={isTablet ? 'large' : 'default'}
                  />
                </Animated.View>
              ))}
            </View>

            {/* Second Row - 2 cards */}
            <View
              style={[
                styles.interfacesRow,
                (isTablet || isTV) && { marginBottom: 12 },
                showOptions.length <= 4 && { marginBottom: 0 },
              ]}
            >
              {showOptions.slice(2, 4).map((show, index) => (
                <Animated.View
                  key={show.id}
                  style={[
                    styles.interfaceCardWrapper,
                    styles.halfWidth,
                    (isTablet || isTV) && styles.halfWidthTablet,
                    {
                      transform: [
                        {
                          translateY: contentSlide.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, 50 + (index + 2) * 5],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <InterfaceCard
                    show={show}
                    onPress={() => handleShowSelect(show)}
                    onLongPress={() => openCompactPopup(show)}
                    size={isTablet || isTV ? 'large' : 'default'}
                  />
                </Animated.View>
              ))}
            </View>

            {/* Third Row - 1 full width card */}
            {showOptions.length > 4 && (
              <View
                style={[
                  styles.interfacesRow,
                  isTablet && { marginBottom: 0 },
                  isTV && { marginBottom: 50 },
                ]}
              >
                <Animated.View
                  key={showOptions[4].id}
                  style={[
                    styles.interfaceCardWrapper,
                    styles.fullWidth,
                    { marginBottom: 0 },
                    {
                      transform: [
                        {
                          translateY: contentSlide.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, 50 + 4 * 5],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <InterfaceCard
                    show={showOptions[4]}
                    onPress={() => handleShowSelect(showOptions[4])}
                    onLongPress={() => openCompactPopup(showOptions[4])}
                    size={isTablet ? 'large' : 'default'}
                  />
                </Animated.View>
              </View>
            )}
          </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* Modals */}
      <CompactPopup
        visible={modalState.compactPopup.visible}
        show={modalState.compactPopup.show}
        connectionHost={connectionHost}
        onClose={modalState.hideCompactPopup}
        onCopyToClipboard={copyToClipboard}
        onOpenInBrowser={openInBrowser}
        onOpenShow={handleShowSelect}
        onEnableInterface={handleEnableInterfaceFromPopup}
        onDisableInterface={handleDisableInterface}
      />

      <ConfirmationModal
        visible={modalState.showDisconnectConfirm}
        title="Disconnect"
        message="Are you sure you want to disconnect from FreeShow?"
        confirmText="Disconnect"
        cancelText="Cancel"
        confirmStyle="destructive"
        icon="log-out-outline"
        onConfirm={confirmDisconnect}
        onCancel={modalState.hideDisconnectConfirmModal}
      />

      {/* Disabled Interface Modal */}
      <DisabledInterfaceModal
        visible={modalState.disabledInterfaceModal.visible}
        show={modalState.disabledInterfaceModal.show}
        onEnable={handleEnableDisabledInterface}
        onCancel={modalState.hideDisabledInterfaceModal}
      />

      {/* Enable Interface Modal (Port Input) */}
      <EnableInterfaceModal
        visible={modalState.enableInterfaceModal.visible}
        show={modalState.enableInterfaceModal.show}
        onClose={modalState.hideEnableInterfaceModal}
        onSave={handleEnableInterfaceSave}
        onCancel={modalState.hideEnableInterfaceModal}
      />

      <ErrorModal
        visible={navigationHandlers.errorModal.visible}
        title={navigationHandlers.errorModal.title}
        message={navigationHandlers.errorModal.message}
        onClose={navigationHandlers.hideError}
      />

      {/* Edit Nickname Modal */}
      <EditNicknameModal
        visible={showEditNickname}
        connection={editingConnection}
        onClose={handleCloseEditModal}
        onSaved={handleNicknameSaved}
        onError={handleEditError}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.md,
    paddingBottom: 40, // Space for bottom bar navigation
  },
  contentWithFloatingNav: {
    flex: 1,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.md,
    paddingBottom: 120,
  },

  // Interfaces Section
  interfacesSection: {
    flex: 1,
    paddingHorizontal: 0,
    justifyContent: 'space-between',
  },
  // (removed tablet offset)
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionTitleLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionTitleLargeTablet: {
    fontSize: 20,
  },
  interfacesContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },

  interfacesRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  // Interface Cards
  interfaceCardWrapper: {
    marginBottom: 8,
  },
  halfWidth: {
    width: '48%',
  },
  halfWidthTablet: {
    width: '49%',
  },
  fullWidth: {
    width: '100%',
  },
  interfaceCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  interfaceCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  disabledCard: {
    opacity: 0.6,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default InterfaceScreen;
