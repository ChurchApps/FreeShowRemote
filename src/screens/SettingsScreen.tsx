import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useSettings } from '../contexts';
import { getNavigationLayoutInfo } from '../utils/navigationUtils';
import { configService } from '../config/AppConfig';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ShowOption } from '../types';

interface SettingsScreenProps {
  navigation: any;
}


const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { settings, history, actions } = useSettings();
  const [autoReconnect, setAutoReconnect] = useState(settings?.autoReconnect || false);
  const [autoLaunchInterface, setAutoLaunchInterface] = useState(settings?.autoLaunchInterface || 'none');
  const [autoLaunchFullscreen, setAutoLaunchFullscreen] = useState(settings?.autoLaunchFullscreen || false);
  const [navigationLayout, setNavigationLayout] = useState<'bottomBar' | 'sidebar' | 'floating'>(settings?.navigationLayout || 'bottomBar');
  const [keepAwake, setKeepAwake] = useState(settings?.keepAwake || false);
  const [showLaunchPicker, setShowLaunchPicker] = useState(false);

  const showOptions: ShowOption[] = [
    {
      id: 'none',
      title: 'None',
      description: 'Stay on Connect screen',
      icon: 'close-circle',
      color: FreeShowTheme.colors.textSecondary,
      port: 0,
    },
    ...configService.getInterfaceConfigs().map(config => ({
      id: config.id,
      title: config.title,
      description: config.description,
      icon: config.icon,
      color: config.color,
      port: 0, // Port not relevant for this usage
    })),
  ];

  useEffect(() => {
    if (settings) {
      setAutoReconnect(settings.autoReconnect || false);
      setAutoLaunchInterface(settings.autoLaunchInterface || 'none');
      setAutoLaunchFullscreen(settings.autoLaunchFullscreen || false);
      setNavigationLayout(settings.navigationLayout || 'bottomBar');
      setKeepAwake(settings.keepAwake || false);
    }
  }, [settings]);





  useEffect(() => {
    if (keepAwake) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
  }, [keepAwake]);
const handleKeepAwakeToggle = async (value: boolean) => {
    setKeepAwake(value);
    await actions.updateSettings({ keepAwake: value });
  };

  const handleAutoReconnectToggle = async (value: boolean) => {
    setAutoReconnect(value);
    
    // If turning off auto-reconnect, also disable auto-launch features
    if (!value) {
      setAutoLaunchInterface('none');
      setAutoLaunchFullscreen(false);
      await actions.updateSettings({ 
        autoReconnect: value,
        autoLaunchInterface: 'none',
        autoLaunchFullscreen: false
      });
    } else {
      await actions.updateSettings({ autoReconnect: value });
    }
  };

  const handleAutoLaunchSelect = async (showId: string) => {
    const typedShowId = showId as 'none' | 'remote' | 'stage' | 'control' | 'output' | 'api';
    setAutoLaunchInterface(typedShowId);
    
    // If setting to 'none' or 'api', disable fullscreen
    if (typedShowId === 'none' || typedShowId === 'api') {
      setAutoLaunchFullscreen(false);
      await actions.updateSettings({ 
        autoLaunchInterface: typedShowId,
        autoLaunchFullscreen: false
      });
    } else {
      await actions.updateSettings({ autoLaunchInterface: typedShowId });
    }
    
    setShowLaunchPicker(false);
  };

  const handleAutoLaunchFullscreenToggle = async (value: boolean) => {
    setAutoLaunchFullscreen(value);
    await actions.updateSettings({ autoLaunchFullscreen: value });
  };

  const handleNavigationLayoutSelect = async (layout: 'bottomBar' | 'sidebar' | 'floating') => {
    setNavigationLayout(layout);
    await actions.updateSettings({ navigationLayout: layout });
  };

  const getSelectedShow = () => {
    return showOptions.find(option => option.id === autoLaunchInterface) || showOptions[0];
  };

  const selectedShow = getSelectedShow();


  const { shouldSkipSafeArea } = getNavigationLayoutInfo(navigationLayout);
  const SafeAreaWrapper = shouldSkipSafeArea ? View : SafeAreaView;

  return (
    <>
      <LinearGradient
        colors={FreeShowTheme.gradients.appBackground}
        style={styles.container}
      >
      <SafeAreaWrapper style={[styles.safeAreaContainer, { backgroundColor: 'transparent' }]}>
        <View style={styles.animatedContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={navigationLayout === 'floating' ? styles.scrollContentWithFloatingNav : styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Header */}
            <View style={styles.header}>
              {/* Brand Header Card */}
              <View style={styles.brandCard}>
                <LinearGradient
                  colors={['rgba(240, 0, 140, 0.12)', 'rgba(240, 0, 140, 0.04)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.brandGradient}
                >
                  {/* Title Section - Left */}
                  <View style={styles.titleSection}>
                    <Text style={[styles.title, Dimensions.get('window').width >= 768 && styles.titleTablet]}>Settings</Text>
                    <Text style={[styles.subtitle, Dimensions.get('window').width >= 768 && styles.subtitleTablet]}>
                      Customize your experience
                    </Text>
                  </View>

                  {/* Logo - Right */}
                  <View style={styles.logoContainer}>
                    <Image 
                      source={require('../../assets/splash-icon.png')}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Settings Card */}
            <View style={styles.settingsCard}>
              {/* Keep Awake Toggle */}
              <TouchableOpacity
                style={styles.settingItem}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingTitleRow}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="moon" size={20} color={FreeShowTheme.colors.secondary} />
                    </View>
                    <Text style={styles.settingTitle}>Keep Awake</Text>
                  </View>
                  <Text style={styles.settingDescription}>
                    Prevent your device screen from sleeping while the app is open
                  </Text>
                </View>
                <Switch
                  value={keepAwake}
                  onValueChange={handleKeepAwakeToggle}
                  trackColor={{
                    false: FreeShowTheme.colors.primaryLighter,
                    true: FreeShowTheme.colors.secondary + '60'
                  }}
                  thumbColor={keepAwake ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.text}
                  ios_backgroundColor={FreeShowTheme.colors.primaryLighter}
                  style={styles.switch}
                />
              </TouchableOpacity>

              <View style={styles.settingDivider} />

              {/* Navigation Layout Selection */}
              <TouchableOpacity
                style={styles.settingItem}
                activeOpacity={0.7}
                onPress={() => {}} // No action needed for the container
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingTitleRow}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="menu" size={20} color={FreeShowTheme.colors.secondary} />
                    </View>
                    <Text style={styles.settingTitle}>Navigation Layout</Text>
                  </View>

                  <View style={styles.pillContainer}>
                    <TouchableOpacity
                      style={[
                        styles.pillThird,
                        styles.pillLeft,
                        navigationLayout === 'bottomBar' && styles.pillActive
                      ]}
                      onPress={() => handleNavigationLayoutSelect('bottomBar')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="list"
                        size={14}
                        color={navigationLayout === 'bottomBar' ? 'white' : FreeShowTheme.colors.secondary}
                      />
                      <Text style={[
                        styles.pillText,
                        navigationLayout === 'bottomBar' && styles.pillTextActive
                      ]}>
                        Bottom
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.pillThird,
                        styles.pillMiddle,
                        navigationLayout === 'floating' && styles.pillActive
                      ]}
                      onPress={() => handleNavigationLayoutSelect('floating')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="ellipse"
                        size={14}
                        color={navigationLayout === 'floating' ? 'white' : FreeShowTheme.colors.secondary}
                      />
                      <Text style={[
                        styles.pillText,
                        navigationLayout === 'floating' && styles.pillTextActive
                      ]}>
                        Float
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.pillThird,
                        styles.pillRight,
                        navigationLayout === 'sidebar' && styles.pillActive
                      ]}
                      onPress={() => handleNavigationLayoutSelect('sidebar')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="menu"
                        size={14}
                        color={navigationLayout === 'sidebar' ? 'white' : FreeShowTheme.colors.secondary}
                      />
                      <Text style={[
                        styles.pillText,
                        navigationLayout === 'sidebar' && styles.pillTextActive
                      ]}>
                        Side
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Auto Connection Section */}
            <View style={styles.sectionSeparator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>AUTO CONNECTION</Text>
              <View style={styles.separatorLine} />
            </View>

            <View style={styles.settingsCard}>
              {/* Auto-Reconnect Toggle */}
              <TouchableOpacity
                style={styles.settingItem}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingTitleRow}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="refresh" size={20} color={FreeShowTheme.colors.secondary} />
                    </View>
                    <Text style={styles.settingTitle}>Auto-Reconnect</Text>
                  </View>
                  <Text style={styles.settingDescription}>
                    Automatically reconnect to FreeShow when the connection is lost
                  </Text>
                </View>
                <Switch
                  value={autoReconnect}
                  onValueChange={handleAutoReconnectToggle}
                  trackColor={{
                    false: FreeShowTheme.colors.primaryLighter,
                    true: FreeShowTheme.colors.secondary + '60'
                  }}
                  thumbColor={autoReconnect ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.text}
                  ios_backgroundColor={FreeShowTheme.colors.primaryLighter}
                  style={styles.switch}
                />
              </TouchableOpacity>

          {/* Auto-Launch Interface - only show if auto-reconnect is enabled */}
          {autoReconnect && (
            <>
              <View style={styles.settingDivider} />

              <TouchableOpacity
                style={styles.settingItem}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingTitleRow}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="play-circle" size={20} color={FreeShowTheme.colors.secondary} />
                    </View>
                    <Text style={styles.settingTitle}>Auto-Launch Interface</Text>
                  </View>
                  <Text style={styles.settingDescription}>
                    Automatically open a specific interface when connected
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowLaunchPicker(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.pickerButtonContent}>
                    <View style={styles.pickerIcon}>
                      <Ionicons name={selectedShow.icon as any} size={16} color={selectedShow.color} />
                    </View>
                    <Text style={styles.pickerButtonText}>{selectedShow.title}</Text>
                    <Ionicons name="chevron-down" size={16} color={FreeShowTheme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Auto-Launch Fullscreen - only show if auto-launch is enabled and not 'none' or 'api' */}
              {autoLaunchInterface !== 'none' && autoLaunchInterface !== 'api' && (
                <>
                  <View style={styles.settingDivider} />

                  <TouchableOpacity
                    style={styles.settingItem}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingInfo}>
                      <View style={styles.settingTitleRow}>
                        <View style={styles.iconContainer}>
                          <Ionicons name="expand" size={20} color={FreeShowTheme.colors.secondary} />
                        </View>
                        <Text style={styles.settingTitle}>Auto-Launch Fullscreen</Text>
                      </View>
                      <Text style={styles.settingDescription}>
                        Automatically open the interface in fullscreen mode
                      </Text>
                    </View>
                    <Switch
                      value={autoLaunchFullscreen}
                      onValueChange={handleAutoLaunchFullscreenToggle}
                      trackColor={{
                        false: FreeShowTheme.colors.primaryLighter,
                        true: FreeShowTheme.colors.secondary + '60'
                      }}
                      thumbColor={autoLaunchFullscreen ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.text}
                      ios_backgroundColor={FreeShowTheme.colors.primaryLighter}
                      style={styles.switch}
                    />
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

            {/* Section Separator */}
            <View style={styles.sectionSeparator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>HISTORY</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Connection History Section */}
            <View style={styles.settingsCard}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => navigation.navigate('ConnectionHistory')}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingTitleRow}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="time" size={20} color={FreeShowTheme.colors.secondary} />
                    </View>
                    <Text style={styles.settingTitle}>Connection History</Text>
                  </View>
                  <Text style={styles.settingDescription}>
                    View and manage all past connections ({history.length} total)
                  </Text>
                </View>
                <View style={styles.actionIcon}>
                  <Ionicons name="chevron-forward" size={20} color={FreeShowTheme.colors.secondary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Section Separator */}
            <View style={styles.sectionSeparator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>INFO</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* About Section */}
            <View style={styles.settingsCard}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => navigation.navigate('About')}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingTitleRow}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="information-circle" size={20} color={FreeShowTheme.colors.secondary} />
                    </View>
                    <Text style={styles.settingTitle}>About</Text>
                  </View>
                  <Text style={styles.settingDescription}>
                    App information, links, and platform availability
                  </Text>
                </View>
                <View style={styles.actionIcon}>
                  <Ionicons name="chevron-forward" size={20} color={FreeShowTheme.colors.secondary} />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaWrapper>
    </LinearGradient>

    {/* Auto-Launch Picker Modal */}
    <Modal
      visible={showLaunchPicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowLaunchPicker(false)}
    >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Auto-Launch Interface</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLaunchPicker(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color={FreeShowTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {showOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.modalOption,
                    autoLaunchInterface === option.id && styles.modalOptionSelected
                  ]}
                  onPress={() => handleAutoLaunchSelect(option.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionIcon}>
                    <View style={[styles.optionIconBg, { backgroundColor: option.color + '20' }]}>
                      <Ionicons name={option.icon as any} size={22} color={option.color} />
                    </View>
                  </View>
                  <View style={styles.modalOptionInfo}>
                    <Text style={styles.modalOptionTitle}>{option.title}</Text>
                    <Text style={styles.modalOptionDescription}>{option.description}</Text>
                  </View>
                  {autoLaunchInterface === option.id && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={24} color={FreeShowTheme.colors.secondary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeAreaContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  animatedContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.xxxl,
    flexGrow: 1,
  },
  scrollContentWithFloatingNav: {
    padding: FreeShowTheme.spacing.lg,
    paddingBottom: 120,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 0,
    paddingBottom: 20,
  },

  // Brand Header Card
  brandCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  brandGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(240, 0, 140, 0.15)',
    gap: 16,
  },
  titleSection: {
    flex: 1,
    gap: 4,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    letterSpacing: -0.5,
  },
  titleTablet: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.2,
  },
  subtitleTablet: {
    fontSize: 15,
  },

  settingsCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: 16,
    padding: FreeShowTheme.spacing.md + 4,
    marginBottom: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
    sectionSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: FreeShowTheme.colors.primaryLighter,
    opacity: 0.3,
  },
  separatorText: {
    fontSize: FreeShowTheme.fontSize.xs,
    fontWeight: '800',
    color: FreeShowTheme.colors.textSecondary,
    letterSpacing: 2,
    marginHorizontal: FreeShowTheme.spacing.lg,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: FreeShowTheme.spacing.md + 2,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    marginHorizontal: -FreeShowTheme.spacing.sm,
    borderRadius: 12,
    minHeight: 56,
  },
  settingInfo: {
    flex: 1,
    marginRight: FreeShowTheme.spacing.lg,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: FreeShowTheme.colors.secondary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xs,
  },
  settingTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    letterSpacing: -0.2,
  },
  settingDescription: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 20,
    opacity: 0.8,
  },
  switch: {
    transform: [{ scale: 0.9 }],
  },
  pillContainer: {
    flexDirection: 'row',
    marginTop: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    backgroundColor: FreeShowTheme.colors.primary,
    overflow: 'hidden',
    minHeight: 48,
    width: '100%',
  },
  pillHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    gap: FreeShowTheme.spacing.xs,
  },
  pillThird: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.xs,
    gap: 4,
  },
  pillLeft: {
    borderRightWidth: 1,
    borderRightColor: FreeShowTheme.colors.primaryLighter,
  },
  pillMiddle: {
    borderRightWidth: 1,
    borderRightColor: FreeShowTheme.colors.primaryLighter,
  },
  pillRight: {
    // No additional border needed for right side
  },
  pillActive: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  pillText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.secondary,
  },
  pillTextActive: {
    color: 'white',
  },
  settingDivider: {
    height: 1,
    backgroundColor: FreeShowTheme.colors.primaryLighter + '30',
    marginVertical: FreeShowTheme.spacing.md,
  },
  pickerButton: {
    backgroundColor: FreeShowTheme.colors.primaryLighter + '20',
    borderRadius: 12,
    paddingVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.md,
    minWidth: 120,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: FreeShowTheme.colors.primaryLighter + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: FreeShowTheme.spacing.sm,
  },
  pickerButtonText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    flex: 1,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: FreeShowTheme.colors.secondary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
    modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  modalContent: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: 20,
    width: '100%',
    maxHeight: '65%',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '30',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter + '20',
  },
  modalTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FreeShowTheme.colors.primaryLighter + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    maxHeight: 350,
    paddingHorizontal: FreeShowTheme.spacing.sm,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.md,
    marginVertical: FreeShowTheme.spacing.xs / 2,
    borderRadius: 12,
    backgroundColor: FreeShowTheme.colors.primaryLighter + '10',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalOptionSelected: {
    backgroundColor: FreeShowTheme.colors.secondary + '15',
    borderColor: FreeShowTheme.colors.secondary + '30',
  },
  modalOptionIcon: {
    marginRight: FreeShowTheme.spacing.md,
  },
  optionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptionInfo: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.xs / 2,
  },
  modalOptionDescription: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 18,
    opacity: 0.8,
  },
  checkmarkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: FreeShowTheme.colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SettingsScreen; 