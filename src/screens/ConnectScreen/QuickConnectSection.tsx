import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { DiscoveredFreeShowInstance } from '../../services/AutoDiscoveryService';
import { ConnectionHistory } from '../../repositories';
import { configService } from '../../config/AppConfig';
import ErrorModal from '../../components/ErrorModal';

interface QuickConnectSectionProps {
  history: ConnectionHistory[];
  discoveredServices: DiscoveredFreeShowInstance[];
  isDiscoveryAvailable: boolean;
  isScanActive: boolean;
  scanComplete: boolean;
  animatedScanProgress: Animated.Value;
  onScanPress: () => void;
  onDiscoveredConnect: (service: DiscoveredFreeShowInstance) => void;
  onHistoryConnect: (historyItem: ConnectionHistory) => void;
  onRemoveFromHistory: (itemId: string) => void;
  onEditNickname: (item: ConnectionHistory) => void;
  onClearAllHistory: () => void;
}

const QuickConnectSection: React.FC<QuickConnectSectionProps> = React.memo(({
  history,
  discoveredServices,
  isDiscoveryAvailable,
  isScanActive,
  scanComplete,
  animatedScanProgress,
  onScanPress,
  onDiscoveredConnect,
  onHistoryConnect,
  onRemoveFromHistory,
  onEditNickname,
  onClearAllHistory,
}) => {
  const _discoveryTimeout = configService.getNetworkConfig().discoveryTimeout;
  const isIpAddress = useCallback((str: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(str), []);

  // Check if running in Expo Go
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  // Modal state
  const [showExpoGoWarning, setShowExpoGoWarning] = useState(false);
  // Expo Go mock discovery state
  const [isMockScanActive, setIsMockScanActive] = useState(false);
  const [mockedServices, setMockedServices] = useState<DiscoveredFreeShowInstance[]>([]);
  const [showExpoMockNotice, setShowExpoMockNotice] = useState(false);

  // Handle scan press with Expo Go check
  const handleScanPress = useCallback(() => {
    if (isExpoGo) {
      // Simulate discovery results in Expo Go
      setShowExpoMockNotice(true);
      setIsMockScanActive(true);
      const defaultPort = configService.getNetworkConfig().defaultPort;
      const mocks: DiscoveredFreeShowInstance[] = [
        {
          name: 'Main Hall Server',
          host: 'main-hall.local',
          port: defaultPort,
          ip: '192.168.1.50',
          ports: { 
            api: defaultPort, 
            remote: configService.getDefaultShowPorts().remote, 
            stage: configService.getDefaultShowPorts().stage, 
            control: configService.getDefaultShowPorts().control, 
            output: configService.getDefaultShowPorts().output 
          },
          capabilities: ['remoteshow', 'stageshow', 'controlshow', 'outputshow'],
          apiEnabled: true,
        },
        {
          name: 'Stage Left',
          host: 'stage-left.local',
          port: defaultPort,
          ip: '192.168.1.71',
          ports: { 
            api: defaultPort, 
            remote: configService.getDefaultShowPorts().remote, 
            stage: 0, 
            control: configService.getDefaultShowPorts().control, 
            output: 0 
          },
          capabilities: ['remoteshow', 'controlshow'],
          apiEnabled: true,
        },
        {
          name: 'Lobby Display',
          host: 'lobby-screen.local',
          port: defaultPort,
          ip: '192.168.1.89',
          ports: { 
            api: defaultPort, 
            remote: 0, 
            stage: 0, 
            control: 0, 
            output: configService.getDefaultShowPorts().output 
          },
          capabilities: ['outputshow'],
          apiEnabled: true,
        },
      ];
      setMockedServices(mocks);
      // Animate progress briefly for UX, then stop
      Animated.timing(animatedScanProgress, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start(() => {
        setIsMockScanActive(false);
        Animated.timing(animatedScanProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }).start();
      });
      return;
    }
    onScanPress();
  }, [isExpoGo, onScanPress, animatedScanProgress]);

  // Memoize computed values
  const recentHistory = useMemo(() => history.slice(0, 3), [history]);

  const effectiveScanActive = isScanActive || (isExpoGo && isMockScanActive);
  const effectiveServices = useMemo(() => {
    return (isExpoGo && mockedServices.length > 0) ? mockedServices : discoveredServices;
  }, [isExpoGo, mockedServices, discoveredServices]);
  const hasDiscoveredServices = useMemo(() => effectiveServices.length > 0, [effectiveServices]);
  const hasHistory = useMemo(() => history.length > 0, [history.length]);

  return (
    <View style={styles.quickConnectCard}>
      <View style={styles.quickConnectHeader}>
        <Text style={styles.quickConnectTitle}>Quick Connect</Text>
        <Text style={styles.quickConnectSubtitle}>Available connections</Text>
      </View>
      
      <View style={styles.quickConnectContent}>
        {/* Auto Discovery */}
        {isDiscoveryAvailable && (
          <View style={styles.discoverySection}>
            <View style={styles.discoverySectionHeader}>
              <Text style={styles.discoveryTitle}>Network Scan</Text>
              <TouchableOpacity
                onPress={handleScanPress}
                style={[
                  styles.discoveryToggle,
                  effectiveScanActive && styles.discoveryToggleActive,
                  { overflow: 'hidden', position: 'relative' },
                ]}
                accessibilityLabel={isScanActive ? "Stop network scan" : "Start network scan"}
                accessibilityHint={isScanActive ? "Stop scanning for FreeShow devices on the network" : "Scan the network for available FreeShow devices"}
              >
                {/* Progress fill overlay */}
                {effectiveScanActive && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: animatedScanProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: FreeShowTheme.colors.secondary,
                      opacity: 0.3,
                      borderRadius: 20,
                      zIndex: 1,
                    }}
                  />
                )}
                {/* Icon and label */}
                <View style={styles.discoveryToggleContent}>
                  <Ionicons
                    name={effectiveScanActive ? 'stop' : 'search'}
                    size={16}
                    color="white"
                  />
                  <Text style={styles.discoveryToggleText}>
                    {effectiveScanActive ? 'Scanning…' : 'Scan'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            {isExpoGo && showExpoMockNotice && (
              <View style={styles.mockNotice}>
                <Ionicons name="alert-circle" size={14} color={FreeShowTheme.colors.textSecondary} />
                <Text style={styles.mockNoticeText}>Showing simulated results in Expo Go. Build a dev client for real discovery.</Text>
              </View>
            )}
            {hasDiscoveredServices ? (
              <View style={styles.discoveredDevices}>
                {effectiveServices.map((service: DiscoveredFreeShowInstance, _index: number) => {
                  const showHost = service.host && !isIpAddress(service.host);
                  const hasServices = service.capabilities && service.capabilities.length > 0;
                  const connectDisabled = !hasServices || (isExpoGo && showExpoMockNotice);
                  return (
                    <TouchableOpacity
                      key={service.ip}
                      style={[
                        styles.discoveredDevice,
                        !hasServices && styles.discoveredDeviceDisabled
                      ]}
                      onPress={() => onDiscoveredConnect(service)}
                      disabled={connectDisabled}
                      accessibilityLabel={`Connect to ${service.name || service.ip}`}
                      accessibilityHint={hasServices ? "Tap to connect to this FreeShow device" : "This device has no available services"}
                    >
                      <View style={styles.discoveredDeviceIcon}>
                        <Ionicons 
                          name="desktop" 
                          size={20} 
                          color={!hasServices ? FreeShowTheme.colors.textSecondary : FreeShowTheme.colors.text} 
                        />
                      </View>
                      <View style={styles.discoveredDeviceInfo}>
                        <Text style={[
                          styles.discoveredDeviceIP,
                          !hasServices && styles.discoveredDeviceTextDisabled
                        ]}>
                          {service.name || (showHost ? service.host : service.ip)}
                        </Text>
                        {showHost && (
                          <Text style={[
                            styles.discoveredDeviceStatus,
                            !hasServices && styles.discoveredDeviceTextDisabled
                          ]}>
                            {service.ip}
                          </Text>
                        )}
                        {/* Show capabilities */}
                        <View style={styles.capabilitiesContainer}>
                          {(!service.capabilities || service.capabilities.length === 0) ? (
                            <View style={styles.capabilityBadgeDisabled}>
                              <Text style={styles.capabilityBadgeText}>No Services</Text>
                            </View>
                          ) : (
                            <View style={styles.capabilityBadgesRow}>
                              {service.ports?.remote && (
                                <View style={styles.capabilityBadge}>
                                  <Text style={styles.capabilityBadgeText}>Remote: {service.ports.remote}</Text>
                                </View>
                              )}
                              {service.ports?.stage && (
                                <View style={styles.capabilityBadge}>
                                  <Text style={styles.capabilityBadgeText}>Stage: {service.ports.stage}</Text>
                                </View>
                              )}
                              {service.ports?.control && (
                                <View style={styles.capabilityBadge}>
                                  <Text style={styles.capabilityBadgeText}>Control: {service.ports.control}</Text>
                                </View>
                              )}
                              {service.ports?.output && (
                                <View style={styles.capabilityBadge}>
                                  <Text style={styles.capabilityBadgeText}>Output: {service.ports.output}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.discoveredDeviceAction}>
                        <Ionicons 
                          name={connectDisabled ? "ban-outline" : "chevron-forward"} 
                          size={20} 
                          color={connectDisabled ? FreeShowTheme.colors.textSecondary : FreeShowTheme.colors.textSecondary} 
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyDiscovery}>
                {scanComplete && !isScanActive ? (
                  <>
                    <Ionicons name="alert-circle-outline" size={24} color={FreeShowTheme.colors.textSecondary} />
                    <Text style={styles.emptyDiscoveryText}>No devices found</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="search-outline" size={24} color={FreeShowTheme.colors.textSecondary} />
                    <Text style={styles.emptyDiscoveryText}>Tap scan to find devices</Text>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Recent Connections */}
        {hasHistory && (
          <View style={styles.recentSection}>
            <View style={styles.recentSectionHeader}>
              <Text style={styles.recentTitle}>Recent Connections</Text>
              <TouchableOpacity 
                onPress={onClearAllHistory}
                style={styles.clearAllButton}
              >
                <Ionicons name="trash-outline" size={16} color={FreeShowTheme.colors.textSecondary} />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recentDevices}>
              {recentHistory.map((item: ConnectionHistory, _index: number) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentDevice}
                  onPress={() => onHistoryConnect(item)}
                  accessibilityLabel={`Connect to ${item.nickname || item.host}`}
                  accessibilityHint="Tap to reconnect to this previously used FreeShow device"
                >
                  <View style={styles.recentDeviceInfo}>
                    <Text style={styles.recentDeviceIP}>{item.nickname || item.host}</Text>
                    <Text style={styles.recentDeviceTime}>
                      {item.nickname && item.nickname !== item.host ? `${item.host} • ` : ''}{new Date(item.lastUsed).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.recentDeviceActions}>
                    <TouchableOpacity
                      style={styles.editConnectionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        onEditNickname(item);
                      }}
                    >
                      <Ionicons name="create-outline" size={16} color={FreeShowTheme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteConnectionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        onRemoveFromHistory(item.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={FreeShowTheme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Expo Go Warning Modal */}
      <ErrorModal
        visible={showExpoGoWarning}
        title="Network Discovery Not Available"
        message="Network scanning (Bonjour/Zeroconf) doesn't work in Expo Go."
        buttonText="Got it"
        onClose={() => setShowExpoGoWarning(false)}
        icon="information-circle"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  // Quick Connect Styles
  quickConnectCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: 12,
    marginTop: 0,
    marginBottom: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    overflow: 'hidden',
  },
  quickConnectHeader: {
    padding: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  quickConnectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: 4,
  },
  quickConnectSubtitle: {
    fontSize: 14,
    color: FreeShowTheme.colors.textSecondary,
  },
  quickConnectContent: {
    padding: FreeShowTheme.spacing.lg,
  },
  
  // Discovery Section
  discoverySection: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  discoverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: FreeShowTheme.spacing.md,
  },
  discoveryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoveryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  discoveryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 0,
  },
  mockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    borderRadius: 8,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    marginTop: FreeShowTheme.spacing.sm,
    marginBottom: FreeShowTheme.spacing.md,
  },
  mockNoticeText: {
    fontSize: 12,
    color: FreeShowTheme.colors.textSecondary,
    flex: 1,
  },
  discoveryToggleActive: {
    backgroundColor: FreeShowTheme.colors.secondaryDark,
  },

  discoveryToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  discoveryToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  discoveredDevices: {
    gap: 8,
  },
  discoveredDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  discoveredDeviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: FreeShowTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  discoveredDeviceInfo: {
    flex: 1,
  },
  discoveredDeviceIP: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  discoveredDeviceStatus: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 2,
  },
  discoveredDeviceAction: {
    padding: FreeShowTheme.spacing.xs,
  },
  discoveredDeviceDisabled: {
    opacity: 0.5,
  },
  discoveredDeviceTextDisabled: {
    color: FreeShowTheme.colors.textSecondary,
  },
  capabilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  capabilityBadge: {
    backgroundColor: FreeShowTheme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  capabilityBadgeDisabled: {
    backgroundColor: FreeShowTheme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    opacity: 0.6,
  },
  capabilityBadgeText: {
    fontSize: 11,
    color: FreeShowTheme.colors.text,
    fontWeight: '500',
  },
  capabilityBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.xs,
  },
  emptyDiscovery: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.xl,
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  emptyDiscoveryText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: FreeShowTheme.spacing.sm,
    fontStyle: 'italic',
  },
  
  // Recent Connections Section
  recentSection: {
    borderTopWidth: 1,
    borderTopColor: FreeShowTheme.colors.primaryLighter,
    paddingTop: FreeShowTheme.spacing.lg,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: FreeShowTheme.spacing.md,
  },
  recentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  clearAllText: {
    fontSize: 12,
    color: FreeShowTheme.colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  recentDevices: {
    gap: 8,
  },
  recentDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  recentDeviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editConnectionButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  deleteConnectionButton: {
    padding: FreeShowTheme.spacing.sm,
    marginLeft: FreeShowTheme.spacing.xs,
  },
  recentDeviceInfo: {
    flex: 1,
  },
  recentDeviceIP: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '500',
    color: FreeShowTheme.colors.text,
  },
  recentDeviceTime: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 2,
  },
});

export default QuickConnectSection;