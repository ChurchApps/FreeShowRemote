import React from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';

interface HeaderProps {
  isConnected: boolean;
  connectionName: string | null;
  connectionHost: string | null;
  connectionPulse: Animated.Value;
  shouldAnimate?: boolean;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'error';
  currentShowPorts?: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  } | null;
  onDisconnect?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isConnected,
  connectionName,
  connectionHost,
  connectionPulse: _connectionPulse,
  shouldAnimate: _shouldAnimate = true,
  connectionStatus = 'disconnected',
  currentShowPorts,
  onDisconnect,
}) => {
  const status = React.useMemo((): {
    color: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    bgColor: string;
    border: string;
    subtitle: string;
  } => {
    if (connectionStatus === 'connected' || isConnected) {
      return {
        color: '#4CAF50',
        label: 'Connected',
        icon: 'checkmark-circle',
        bgColor: 'rgba(76,175,80,0.12)',
        border: 'rgba(76,175,80,0.25)',
        subtitle: `Connected to ${connectionName || connectionHost || 'Unknown'}`,
      };
    }
    if (connectionStatus === 'connecting') {
      return {
        color: '#FF9800',
        label: 'Connecting…',
        icon: 'time',
        bgColor: 'rgba(255,152,0,0.12)',
        border: 'rgba(255,152,0,0.25)',
        subtitle: 'Attempting to connect',
      };
    }
    if (connectionStatus === 'error') {
      return {
        color: '#EF5350',
        label: 'Error',
        icon: 'warning',
        bgColor: 'rgba(239,83,80,0.12)',
        border: 'rgba(239,83,80,0.25)',
        subtitle: 'Not connected',
      };
    }
    return {
      color: FreeShowTheme.colors.textSecondary,
      label: 'Offline',
      icon: 'radio-button-off',
      bgColor: 'rgba(102,102,102,0.1)',
      border: 'rgba(255,255,255,0.12)',
      subtitle: 'Not connected',
    };
  }, [connectionStatus, isConnected, connectionName, connectionHost]);

  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;

  return (
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
            <Text style={[styles.title, isTablet && styles.titleTablet]}>FreeShow Remote</Text>
            <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
              Control your presentations
            </Text>
          </View>

          {/* Logo - Right */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../assets/splash-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Disconnect Button */}
          {onDisconnect && isConnected && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed
              ]}
              onPress={onDisconnect}
            >
              <LinearGradient
                colors={['rgba(239, 83, 80, 0.2)', 'rgba(239, 83, 80, 0.1)']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="power" size={isTablet ? 22 : 20} color="#EF5350" />
              </LinearGradient>
            </Pressable>
          )}
        </LinearGradient>
      </View>

      {/* Connection Status Card - Only show when connected, connecting, or error */}
      {(isConnected || connectionStatus === 'connecting' || connectionStatus === 'error') && (
        <View style={styles.statusCard}>
          <LinearGradient
            colors={
              connectionStatus === 'connected' || isConnected
                ? ['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)']
                : connectionStatus === 'connecting'
                ? ['rgba(255, 152, 0, 0.15)', 'rgba(255, 152, 0, 0.05)']
                : ['rgba(239, 83, 80, 0.15)', 'rgba(239, 83, 80, 0.05)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statusCardGradient, isTablet && styles.statusCardGradientTablet]}
          >
            {/* Status Icon Circle */}
            <View style={[styles.statusIconContainer, { backgroundColor: status.color + '20' }]}>
              <Ionicons name={status.icon} size={isTablet ? 26 : 22} color={status.color} />
            </View>

            {/* Connection Details */}
            <View style={styles.statusInfo}>
              <View style={styles.statusHeader}>
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  {status.label}
                </Text>
              </View>
              {(connectionStatus === 'connected' || isConnected) && (
                <Text style={[styles.connectionName, isTablet && styles.connectionNameTablet]}>
                  {connectionName || connectionHost || 'Connected'}
                </Text>
              )}
              {isConnected && currentShowPorts && (
                <View style={styles.portsContainer}>
                  {Object.entries(currentShowPorts)
                    .filter(([_, port]) => port > 0)
                    .map(([name, port]) => (
                      <View key={name} style={styles.portChip}>
                        <Ionicons name="radio-button-on" size={8} color="#4CAF50" />
                        <Text style={styles.portChipText}>
                          {name} · {port}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 0,
    paddingBottom: 20,
    gap: 16,
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
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.25)',
  },

  // Status Card
  statusCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statusCardGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusCardGradientTablet: {
    padding: 20,
  },
  statusIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    gap: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusLabelTablet: {
    fontSize: 13,
  },
  connectionName: {
    fontSize: 17,
    color: 'white',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  connectionNameTablet: {
    fontSize: 20,
  },
  portsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  portChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  portChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4CAF50',
    textTransform: 'capitalize',
  },
});

export default Header;