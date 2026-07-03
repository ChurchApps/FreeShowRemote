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
    if (isFocused) {
      iconColor = FreeShowTheme.colors.secondary;
    } else if (isConnected) {
      iconColor = FreeShowTheme.colors.connected;
    } else if (connectionStatus === 'connecting') {
      iconColor = FreeShowTheme.colors.secondaryLight;
    } else if (connectionStatus === 'error') {
      iconColor = FreeShowTheme.colors.disconnected;
    }
  } else if (routeName === 'Settings') {
    iconName = isFocused ? 'settings' : 'settings-outline';
  } else {
    iconName = 'help-outline';
  }

  return { iconName, iconColor };
}
