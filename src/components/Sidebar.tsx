import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts';
import { configService } from '../config/AppConfig';
import TVFocusable from './TVFocusable';

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(280, screenWidth * 0.75);
const SIDEBAR_WIDTH_COLLAPSED = 70;

interface NavigationItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  route: string;
}

// ================= Sidebar Overlay (Mobile/TV) =================
interface SidebarProps {
  navigation: any;
  currentRoute: string;
  onNavigate: (route: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onNavigate,
  isVisible,
  onClose,
  currentRoute,
}) => {
  const [slideAnim] = useState(new Animated.Value(-SIDEBAR_WIDTH));
  const [backdropOpacity] = useState(new Animated.Value(0));
  const { state } = useConnection();
  const { isConnected, connectionStatus } = state;

  const navigationItems: NavigationItem[] = [
    { key: 'Interface', label: 'Interface', icon: 'apps-outline', iconFocused: 'apps', route: 'Interface' },
    { key: 'Connect', label: 'Connect', icon: 'wifi-outline', iconFocused: 'wifi', route: 'Connect' },
    { key: 'Settings', label: 'Settings', icon: 'settings-outline', iconFocused: 'settings', route: 'Settings' },
  ];

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 120, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [isVisible]);

  const handleNavigate = (route: string) => {
    onNavigate(route);
    setTimeout(() => onClose(), configService.getNetworkConfig().sidebarCloseDelay);
  };

  const getConnectionColor = () => {
    if (isConnected) return '#4CAF50';
    if (connectionStatus === 'connecting') return '#FF9800';
    return FreeShowTheme.colors.textSecondary;
  };

  const getItemColor = (item: NavigationItem) =>
    currentRoute === item.route ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.textSecondary;

  const getItemBackgroundColor = (item: NavigationItem) =>
    currentRoute === item.route ? FreeShowTheme.colors.secondary + '15' : 'transparent';

  return (
    <Modal visible={isVisible} transparent onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'top', 'bottom']}>
          <View style={styles.sidebar}>
            {/* Header */}
            <View style={styles.header}>
              <TVFocusable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
              </TVFocusable>

              <View style={styles.headerText}>
                <Text style={styles.appName}>FreeShow</Text>
                <Text style={styles.appSubtitle}>Remote</Text>
              </View>

              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="cover" />
                </View>
              </View>
            </View>

            {/* Navigation */}
            <View style={styles.navigation}>
              {navigationItems.map(item => (
                <TVFocusable
                  key={item.key}
                  onPress={() => handleNavigate(item.route)}
                  style={[styles.navItem, { backgroundColor: getItemBackgroundColor(item) }]}
                >
                  <View style={styles.navItemIcon}>
                    <Ionicons
                      name={currentRoute === item.route ? item.iconFocused : item.icon}
                      size={24}
                      color={getItemColor(item)}
                    />
                  </View>
                  <View style={styles.navItemText}>
                    <Text style={[styles.navItemLabel, { color: getItemColor(item) }]}>{item.label}</Text>
                  </View>
                  {currentRoute === item.route && <View style={styles.activeIndicator} />}
                </TVFocusable>
              ))}
            </View>

            {/* Connection Status */}
            <View style={styles.statusSection}>
              <View style={styles.connectionStatus}>
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: getConnectionColor() }]} />
                  <Text style={styles.statusText}>
                    {isConnected ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

// ================= Sidebar Traditional (Tablet/Desktop) =================
interface SidebarTraditionalProps {
  navigation: any;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const SidebarTraditional: React.FC<SidebarTraditionalProps> = ({ currentRoute, onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [animatedWidth] = useState(new Animated.Value(SIDEBAR_WIDTH));
  const { state } = useConnection();
  const { isConnected, connectionStatus } = state;

  const navigationItems: NavigationItem[] = [
    { key: 'Interface', label: 'Interface', icon: 'apps-outline', iconFocused: 'apps', route: 'Interface' },
    { key: 'Connect', label: 'Connect', icon: 'wifi-outline', iconFocused: 'wifi', route: 'Connect' },
    { key: 'Settings', label: 'Settings', icon: 'settings-outline', iconFocused: 'settings', route: 'Settings' },
  ];

  const toggleSidebar = () => {
    const targetWidth = isExpanded ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;
    Animated.timing(animatedWidth, { toValue: targetWidth, duration: 150, useNativeDriver: false }).start();
    setIsExpanded(!isExpanded);
  };

  const getConnectionColor = () => {
    if (isConnected) return '#4CAF50';
    if (connectionStatus === 'connecting') return '#FF9800';
    return FreeShowTheme.colors.textSecondary;
  };

  const getItemColor = (item: NavigationItem) =>
    currentRoute === item.route ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.textSecondary;

  const getItemBackgroundColor = (item: NavigationItem) =>
    currentRoute === item.route ? FreeShowTheme.colors.secondary + '15' : 'transparent';

  return (
    <SafeAreaView style={traditionalStyles.safeArea} edges={['left', 'top', 'bottom']}>
      <Animated.View style={[traditionalStyles.sidebar, { width: animatedWidth }]}>
        {/* Header */}
        <View style={[traditionalStyles.header, !isExpanded && traditionalStyles.headerCollapsed]}>
          <TVFocusable onPress={toggleSidebar} style={traditionalStyles.toggleButton}>
            <Ionicons name={isExpanded ? 'chevron-back' : 'menu'} size={24} color={FreeShowTheme.colors.text} />
          </TVFocusable>

          {isExpanded && (
            <>
              <View style={traditionalStyles.headerText}>
                <Text style={traditionalStyles.appName}>FreeShow</Text>
                <Text style={traditionalStyles.appSubtitle}>Remote</Text>
              </View>

              <View style={traditionalStyles.logoContainer}>
                <View style={traditionalStyles.logoCircle}>
                  <Image source={require('../../assets/icon.png')} style={traditionalStyles.logoImage} resizeMode="cover" />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Navigation */}
        <View style={[traditionalStyles.navigation, !isExpanded && traditionalStyles.navigationCollapsed]}>
          {navigationItems.map(item => (
            <TVFocusable
              key={item.key}
              onPress={() => onNavigate(item.route)}
              style={[
                traditionalStyles.navItem,
                { backgroundColor: getItemBackgroundColor(item) },
                !isExpanded && traditionalStyles.navItemCollapsed,
              ]}
            >
              <View style={[traditionalStyles.navItemIcon, !isExpanded && traditionalStyles.navItemIconCollapsed]}>
                <Ionicons
                  name={currentRoute === item.route ? item.iconFocused : item.icon}
                  size={24}
                  color={getItemColor(item)}
                />
              </View>
              {isExpanded && (
                <View style={traditionalStyles.navItemText}>
                  <Text style={[traditionalStyles.navItemLabel, { color: getItemColor(item) }]}>{item.label}</Text>
                </View>
              )}
              {currentRoute === item.route && (isExpanded ? <View style={traditionalStyles.activeIndicator} /> : <View style={traditionalStyles.activeIndicatorCollapsed} />)}
            </TVFocusable>
          ))}
        </View>

        {isExpanded && (
          <View style={traditionalStyles.statusSection}>
            <View style={traditionalStyles.connectionStatus}>
              <View style={traditionalStyles.statusIndicator}>
                <View style={[traditionalStyles.statusDot, { backgroundColor: getConnectionColor() }]} />
                <Text style={traditionalStyles.statusText}>
                  {isConnected ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

// ================= Styles =================
const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sidebarContainer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: SIDEBAR_WIDTH, zIndex: 1000 },
  safeArea: { flex: 1, backgroundColor: FreeShowTheme.colors.primaryDarkest },
  sidebar: { flex: 1, backgroundColor: FreeShowTheme.colors.primaryDarkest, paddingVertical: FreeShowTheme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: FreeShowTheme.spacing.lg, marginBottom: FreeShowTheme.spacing.xl, justifyContent: 'flex-start' },
  closeButton: { width: 40, height: 40, borderRadius: FreeShowTheme.borderRadius.lg, backgroundColor: FreeShowTheme.colors.primaryDarker, borderWidth: 1, borderColor: FreeShowTheme.colors.primaryLighter, justifyContent: 'center', alignItems: 'center' },
  headerText: { marginLeft: FreeShowTheme.spacing.md, flex: 1 },
  logoContainer: { marginLeft: FreeShowTheme.spacing.sm, alignItems: 'center', justifyContent: 'center' },
  logoCircle: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', backgroundColor: 'transparent' },
  logoImage: { width: 28, height: 28 },
  appName: { fontSize: FreeShowTheme.fontSize.lg, fontWeight: '700', color: FreeShowTheme.colors.text, marginBottom: 2 },
  appSubtitle: { fontSize: FreeShowTheme.fontSize.sm, color: FreeShowTheme.colors.textSecondary, fontWeight: '500' },
  navigation: { flex: 1, paddingHorizontal: FreeShowTheme.spacing.sm },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: FreeShowTheme.spacing.md, paddingHorizontal: FreeShowTheme.spacing.md, borderRadius: FreeShowTheme.borderRadius.lg, marginBottom: FreeShowTheme.spacing.xs, position: 'relative' },
  navItemIcon: { width: 40, alignItems: 'center' },
  navItemText: { flex: 1, marginLeft: FreeShowTheme.spacing.md },
  navItemLabel: { fontSize: FreeShowTheme.fontSize.md, fontWeight: '600' },
  activeIndicator: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: FreeShowTheme.colors.secondary, borderRadius: 2 },
  statusSection: { paddingHorizontal: FreeShowTheme.spacing.lg, paddingTop: FreeShowTheme.spacing.lg, borderTopWidth: 1, borderTopColor: FreeShowTheme.colors.primaryLighter },
  connectionStatus: { padding: FreeShowTheme.spacing.md, backgroundColor: FreeShowTheme.colors.primaryDarker, borderRadius: FreeShowTheme.borderRadius.lg, borderWidth: 1, borderColor: FreeShowTheme.colors.primaryLighter },
  statusIndicator: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: FreeShowTheme.spacing.sm },
  statusText: { fontSize: FreeShowTheme.fontSize.sm, color: FreeShowTheme.colors.textSecondary, fontWeight: '500' },
});

// ================= SidebarTraditional Styles =================
const traditionalStyles = StyleSheet.create({
  safeArea: { backgroundColor: FreeShowTheme.colors.primaryDarkest },
  sidebar: { backgroundColor: FreeShowTheme.colors.primaryDarkest, height: '100%', paddingVertical: FreeShowTheme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: FreeShowTheme.spacing.lg, marginBottom: FreeShowTheme.spacing.xl, justifyContent: 'flex-start' },
  headerCollapsed: { justifyContent: 'center', paddingHorizontal: FreeShowTheme.spacing.sm },
  toggleButton: { width: 40, height: 40, borderRadius: FreeShowTheme.borderRadius.lg, backgroundColor: FreeShowTheme.colors.primaryDarker, borderWidth: 1, borderColor: FreeShowTheme.colors.primaryLighter, justifyContent: 'center', alignItems: 'center' },
  headerText: { marginLeft: FreeShowTheme.spacing.md, flex: 1 },
  logoContainer: { marginLeft: FreeShowTheme.spacing.sm, alignItems: 'center', justifyContent: 'center' },
  logoCircle: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden', backgroundColor: 'transparent' },
  logoImage: { width: 26, height: 26 },
  appName: { fontSize: FreeShowTheme.fontSize.lg, fontWeight: '700', color: FreeShowTheme.colors.text, marginBottom: 2 },
  appSubtitle: { fontSize: FreeShowTheme.fontSize.sm, color: FreeShowTheme.colors.textSecondary, fontWeight: '500' },
  navigation: { flex: 1, paddingHorizontal: FreeShowTheme.spacing.sm },
  navigationCollapsed: { paddingHorizontal: FreeShowTheme.spacing.xs, alignItems: 'center' },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: FreeShowTheme.spacing.md, paddingHorizontal: FreeShowTheme.spacing.md, borderRadius: FreeShowTheme.borderRadius.lg, marginBottom: FreeShowTheme.spacing.xs, position: 'relative' },
  navItemCollapsed: { paddingHorizontal: FreeShowTheme.spacing.xs, marginHorizontal: FreeShowTheme.spacing.xs, justifyContent: 'center', alignItems: 'center', width: 54 },
  navItemIcon: { width: 40, alignItems: 'center' },
  navItemIconCollapsed: { width: 'auto', alignItems: 'center', justifyContent: 'center' },
  navItemText: { flex: 1, marginLeft: FreeShowTheme.spacing.md },
  navItemLabel: { fontSize: FreeShowTheme.fontSize.md, fontWeight: '600' },
  activeIndicator: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: FreeShowTheme.colors.secondary, borderRadius: 2 },
  activeIndicatorCollapsed: { position: 'absolute', right: 2, top: 0, bottom: 0, width: 3, backgroundColor: FreeShowTheme.colors.secondary, borderRadius: 2 },
  statusSection: { paddingHorizontal: FreeShowTheme.spacing.lg, paddingTop: FreeShowTheme.spacing.lg, borderTopWidth: 1, borderTopColor: FreeShowTheme.colors.primaryLighter },
  connectionStatus: { padding: FreeShowTheme.spacing.md, backgroundColor: FreeShowTheme.colors.primaryDarker, borderRadius: FreeShowTheme.borderRadius.lg, borderWidth: 1, borderColor: FreeShowTheme.colors.primaryLighter },
  statusIndicator: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: FreeShowTheme.spacing.sm },
  statusText: { fontSize: FreeShowTheme.fontSize.lg, color: FreeShowTheme.colors.textSecondary, fontWeight: '500' },
});

