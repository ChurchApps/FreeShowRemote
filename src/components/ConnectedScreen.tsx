import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useSettings } from '../contexts';
import { getNavigationLayoutInfo, getBottomPadding } from '../utils/navigationUtils';

interface ConnectedScreenProps {
  connectionName: string | null;
  connectionHost: string | null;
  currentShowPorts: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  } | null;
  onDisconnect: () => void;
  onShowQRCode: () => void;
  onEditNickname: () => void;
  isFloatingNav?: boolean;
}

const ConnectedScreen: React.FC<ConnectedScreenProps> = ({
  connectionName,
  connectionHost,
  currentShowPorts,
  onDisconnect,
  onShowQRCode,
  onEditNickname,
  isFloatingNav = false,
}) => {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { shouldSkipSafeArea, isFloatingNav: navIsFloating } = getNavigationLayoutInfo(settings?.navigationLayout);
  
  // Use prop value if provided, otherwise use detected value
  const effectiveIsFloatingNav = isFloatingNav || navIsFloating;

  const getActivePortsCount = () => {
    if (!currentShowPorts) return 0;
    return Object.entries(currentShowPorts)
      .filter(([name, port]) => {
        // Filter out non-port properties like hasEnabledInterfaces
        return name !== 'hasEnabledInterfaces' && 
               name !== 'validatedPorts' && 
               port && 
               port > 0 && 
               typeof port === 'number';
      }).length;
  };

  const getActivePortsList = () => {
    if (!currentShowPorts) return [];
    return Object.entries(currentShowPorts)
      .filter(([name, port]) => {
        // Filter out non-port properties like hasEnabledInterfaces
        return name !== 'hasEnabledInterfaces' && 
               name !== 'validatedPorts' && 
               port && 
               port > 0 && 
               typeof port === 'number';
      })
      .map(([name, port]) => ({ 
        name: name.toUpperCase() === 'API' ? 'API' : name, 
        port 
      }));
  };

  const ConnectionInfoCard = () => (
    <View style={styles.infoCard}>
      <LinearGradient
        colors={['rgba(76,175,80,0.12)', 'rgba(76,175,80,0.08)']}
        style={styles.infoCardGradient}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={15} style={styles.infoCardBlur}>
            <View style={styles.infoCardContent}>
              <View style={styles.infoHeader}>
                <View style={styles.statusIndicator}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.statusText}>Connected</Text>
                </View>
              </View>
              
              <View style={styles.connectionDetails}>
                <TouchableOpacity style={styles.detailRow} onPress={onEditNickname}>
                  <Ionicons name="wifi" size={20} color={FreeShowTheme.colors.secondary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Server</Text>
                    <Text style={styles.detailValue}>
                      {connectionName || connectionHost || 'Unknown'}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {connectionHost && (
                  <View style={styles.detailRow}>
                    <Ionicons name="globe-outline" size={20} color={FreeShowTheme.colors.secondary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>IP Address</Text>
                      <Text style={styles.detailValue}>{connectionHost}</Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Ionicons name="layers-outline" size={20} color={FreeShowTheme.colors.secondary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Active Interfaces</Text>
                    <Text style={styles.detailValue}>
                      {getActivePortsCount()} of 5 enabled
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.infoCardContent, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
            <View style={styles.infoHeader}>
              <View style={styles.statusIndicator}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.statusText}>Connected</Text>
              </View>
            </View>
            
            <View style={styles.connectionDetails}>
              <TouchableOpacity style={styles.detailRow} onPress={onEditNickname}>
                <Ionicons name="wifi" size={20} color={FreeShowTheme.colors.secondary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Server</Text>
                  <Text style={styles.detailValue}>
                    {connectionName || connectionHost || 'Unknown'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {connectionHost && (
                <View style={styles.detailRow}>
                  <Ionicons name="globe-outline" size={20} color={FreeShowTheme.colors.secondary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>IP Address</Text>
                    <Text style={styles.detailValue}>{connectionHost}</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.detailRow}>
                <Ionicons name="layers-outline" size={20} color={FreeShowTheme.colors.secondary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Active Interfaces</Text>
                  <Text style={styles.detailValue}>
                    {getActivePortsCount()} of 5 enabled
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  const PortsCard = () => (
    <View style={styles.portsCard}>
      <LinearGradient
        colors={['rgba(240,0,140,0.10)', 'rgba(240,0,140,0.05)']}
        style={styles.portsCardGradient}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={15} style={styles.portsCardBlur}>
            <View style={styles.portsCardContent}>
              <View style={styles.portsHeader}>
                <Ionicons name="settings-outline" size={24} color={FreeShowTheme.colors.secondary} />
                <Text style={styles.portsTitle}>Interface Ports</Text>
              </View>
              
              <View style={styles.portsGrid}>
                {getActivePortsList().map(({ name, port }) => {
                  if (!port || port <= 0 || isNaN(port)) return null;
                  return (
                    <View key={name} style={styles.portItem}>
                      <Text style={styles.portName}>{name}</Text>
                      <Text style={styles.portNumber}>{port}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.portsCardContent, { backgroundColor: 'rgba(255,255,255,0.02)' }]}>
            <View style={styles.portsHeader}>
              <Ionicons name="settings-outline" size={24} color={FreeShowTheme.colors.secondary} />
              <Text style={styles.portsTitle}>Interface Ports</Text>
            </View>
            
            <View style={styles.portsGrid}>
              {getActivePortsList().map(({ name, port }) => {
                if (!port || port <= 0 || isNaN(port)) return null;
                return (
                  <View key={name} style={styles.portItem}>
                    <Text style={styles.portName}>{name}</Text>
                    <Text style={styles.portNumber}>{port}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  const ActionsCard = () => (
    <View style={styles.actionsCard}>
      <Text style={styles.actionsTitle}>Quick Actions</Text>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onShowQRCode}
          activeOpacity={0.7}
        >
          <View style={styles.actionButtonContent}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
              <Ionicons name="qr-code" size={24} color="#2196F3" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionButtonTitle}>Share QR Code</Text>
              <Text style={styles.actionButtonDescription}>Let others connect easily</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onDisconnect}
          activeOpacity={0.7}
        >
          <View style={styles.actionButtonContent}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 83, 80, 0.15)' }]}>
              <Ionicons name="power" size={24} color="#EF5350" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionButtonTitle}>Disconnect</Text>
              <Text style={styles.actionButtonDescription}>End current session</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={FreeShowTheme.gradients.appBackground}
      style={[styles.container, !shouldSkipSafeArea && { paddingTop: insets.top }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getBottomPadding(effectiveIsFloatingNav) }
        ]}
        showsVerticalScrollIndicator={false}
      >
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
                <Text style={[styles.screenTitle, Dimensions.get('window').width >= 768 && styles.titleTablet]}>Connection Status</Text>
                <Text style={[styles.subtitle, Dimensions.get('window').width >= 768 && styles.subtitleTablet]}>
                  Manage your connection
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

        <View style={styles.cardsContainer}>
          <ConnectionInfoCard />
          <PortsCard />
          <ActionsCard />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.md,
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
  screenTitle: {
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
  cardsContainer: {
    gap: FreeShowTheme.spacing.lg,
  },
  
  // Connection Info Card
  infoCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoCardGradient: {
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoCardBlur: {
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoCardContent: {
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoHeader: {
    marginBottom: 14,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4CAF50',
  },
  connectionDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  // Ports Card
  portsCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  portsCardGradient: {
    borderWidth: 1,
    borderColor: 'rgba(240,0,140,0.3)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  portsCardBlur: {
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  portsCardContent: {
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  portsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  portsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: FreeShowTheme.colors.secondary,
  },
  portsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  portItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  portName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  portNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  
  // Actions Card
  actionsCard: {
    gap: 16,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
    gap: 2,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    letterSpacing: -0.2,
  },
  actionButtonDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default ConnectedScreen;
