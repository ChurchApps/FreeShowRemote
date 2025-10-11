import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';

interface ConnectingScreenProps {
  onCancel: () => void;
  connectionStatus: string;
  isFloatingNav?: boolean;
}

/**
 * Connecting Screen Component
 * Shows a clean, mature connecting state that matches the not connected screen design
 */
const ConnectingScreen: React.FC<ConnectingScreenProps> = ({ 
  onCancel, 
  connectionStatus, 
  isFloatingNav = false 
}) => {
  const insets = useSafeAreaInsets();


  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Establishing connection to FreeShow';
      case 'error':
        return 'Retrying connection to FreeShow';
      case 'disconnected':
        return 'Attempting to reconnect to FreeShow';
      default:
        return 'Connecting to FreeShow';
    }
  };

  // Simple animated WiFi icon - same as not connected but with subtle pulse
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnimation]);

  return (
    <LinearGradient
      colors={FreeShowTheme.gradients.appBackground}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View
        style={[
          styles.connectingContainer,
          { 
            paddingTop: insets.top,
            paddingBottom: isFloatingNav ? 120 : 40,
          },
          {
            opacity: 1,
            transform: [{ translateY: 0 }],
          }
        ]}
      >
        {/* Icon container - matches not connected design exactly */}
        <View style={styles.connectingIcon}>
          <Animated.View style={{ opacity: pulseAnimation }}>
            <Ionicons name="wifi-outline" size={56} color={FreeShowTheme.colors.textSecondary} />
          </Animated.View>
        </View>

        <Text style={styles.connectingTitle}>Connecting</Text>
        <Text style={styles.connectingSubtitle}>
          {getStatusMessage()}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.cancelButtonPressed
          ]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel connection attempt"
          accessibilityHint="Stop the current connection attempt"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  connectingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  connectingTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  connectingSubtitle: {
    fontSize: 16,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    maxWidth: 320,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  cancelButtonPressed: {
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    transform: [{ scale: 0.98 }],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    letterSpacing: 0.2,
  },
});

export default ConnectingScreen;
