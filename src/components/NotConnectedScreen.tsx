import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Animated,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FreeShowTheme } from '../theme/FreeShowTheme'
import { getBottomPadding } from "../utils/navigationUtils"
import TVFocusable from './TVFocusable'

interface NotConnectedScreenProps {
  onNavigateToConnect: () => void;
}

/**
 * Not Connected Screen Component
 * Shows when the app is not connected to FreeShow with option to connect
 */
const NotConnectedScreen: React.FC<NotConnectedScreenProps> = ({
  onNavigateToConnect
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={FreeShowTheme.gradients.appBackground}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View
        style={[
          styles.notConnectedContainer,
          {
            paddingTop: insets.top,
            paddingBottom: getBottomPadding(),
          },
          {
            opacity: 1,
            transform: [{ translateY: 0 }],
          }
        ]}
      >
        <View style={styles.notConnectedIcon}>
          <Ionicons name="wifi-outline" size={56} color={FreeShowTheme.colors.textSecondary} />
        </View>

        <Text style={styles.notConnectedTitle}>{t('interfaceScreen.notConnectedTitle')}</Text>
        <Text style={styles.notConnectedSubtitle}>
          {t('interfaceScreen.notConnectedSubtitle')}
        </Text>

        <TVFocusable onPress={onNavigateToConnect}>
          <Pressable
            style={({ pressed }) => [
              styles.connectButton,
              pressed && styles.connectButtonPressed
            ]}
            onPress={onNavigateToConnect}
            accessibilityRole="button"
            accessibilityLabel="Connect to FreeShow server"
            accessibilityHint="Navigate to connection screen to set up a new connection"
          >
            <Text style={styles.connectButtonText}>{t('interfaceScreen.connectToFreeShow')}</Text>
            <Ionicons name="arrow-forward" size={18} color="white" style={styles.connectButtonIcon} />
          </Pressable>
        </TVFocusable>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notConnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  notConnectedIcon: {
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
  notConnectedTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  notConnectedSubtitle: {
    fontSize: 16,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    maxWidth: 320,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonPressed: {
    backgroundColor: FreeShowTheme.colors.secondaryDark,
    transform: [{ scale: 0.98 }],
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.2,
  },
  connectButtonIcon: {
    marginLeft: 8,
  },
});

export default NotConnectedScreen;
