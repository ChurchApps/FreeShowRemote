import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';

/**
 * Get tab icon and color based on route and state
 */
export function getTabIcon(routeName: string, isFocused: boolean, isConnected: boolean, connectionStatus: string) {
  let iconName: keyof typeof Ionicons.glyphMap;
  let iconColor = isFocused ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.text + '80';

  if (routeName === 'Interface') {
    iconName = isFocused ? 'apps' : 'apps-outline';
  } else if (routeName === 'Connect') {
    iconName = isFocused ? 'wifi' : 'wifi-outline';
    // Dynamic color for Connect tab based on connection status
    if (isFocused) {
      iconColor = FreeShowTheme.colors.secondary; // Purple when focused (on Connect page)
    } else if (isConnected) {
      iconColor = FreeShowTheme.colors.connected; // Green when connected
    } else if (connectionStatus === 'connecting') {
      iconColor = FreeShowTheme.colors.secondaryLight; // Light purple when connecting
    } else if (connectionStatus === 'error') {
      iconColor = FreeShowTheme.colors.disconnected; // Red when error
    }
  } else if (routeName === 'Settings') {
    iconName = isFocused ? 'settings' : 'settings-outline';
  } else {
    iconName = 'help-outline';
  }

  return { iconName, iconColor };
}
