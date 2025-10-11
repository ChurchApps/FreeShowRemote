import { useState } from 'react';
import { ShowOption } from '../types';
import { ErrorLogger } from '../services/ErrorLogger';

/**
 * Error modal state interface
 */
export interface ErrorModalState {
  visible: boolean;
  title: string;
  message: string;
}

/**
 * Navigation result interface
 */
export interface NavigationResult {
  success: boolean;
  error?: string;
}

/**
 * Custom hook for managing interface navigation logic
 * @param navigation - Navigation object
 * @param connectionHost - Current connection host
 * @param isConnected - Connection status
 * @returns Navigation handlers and error state
 */
export const useInterfaceNavigation = (
  navigation: any,
  connectionHost: string | null,
  isConnected: boolean
) => {
  const [errorModal, setErrorModal] = useState<ErrorModalState>({
    visible: false,
    title: '',
    message: ''
  });

  /**
   * Shows error modal with specified message
   */
  const showError = (title: string, message: string) => {
    setErrorModal({ visible: true, title, message });
  };

  /**
   * Hides error modal
   */
  const hideError = () => {
    setErrorModal({ visible: false, title: '', message: '' });
  };

  /**
   * Validates navigation availability
   */
  const validateNavigation = (): boolean => {
    return navigation && typeof navigation.navigate === 'function';
  };

  /**
   * Validates connection and interface state
   */
  const validateConnection = (show: ShowOption): boolean => {
    if (!show.port || show.port === 0) {
      showError(
        'Interface Disabled',
        `${show.title} is currently disabled. Enable it first to use this interface.`
      );
      return false;
    }

    if (!isConnected || !connectionHost) {
      showError('Error', 'Not connected to FreeShow');
      return false;
    }

    return true;
  };

  /**
   * Navigates to API screen
   */
  const navigateToApi = (show: ShowOption): NavigationResult => {
    try {
      if (validateNavigation()) {
        navigation.navigate('APIScreen', {
          title: show.title,
          showId: show.id,
        });
        return { success: true };
      } else {
        const error = 'No navigation available for API screen';
        ErrorLogger.error(error, 'useInterfaceNavigation');
        showError('Navigation Error', 'Unable to navigate to the API interface');
        return { success: false, error };
      }
    } catch (navigationError) {
      const error = `Navigation error: ${navigationError}`;
      ErrorLogger.error('Navigation to API screen failed', 'useInterfaceNavigation', navigationError instanceof Error ? navigationError : new Error(String(navigationError)));
      showError('Navigation Error', 'Unable to navigate to the API interface');
      return { success: false, error };
    }
  };

  /**
   * Navigates to WebView screen
   */
  const navigateToWebView = (show: ShowOption): NavigationResult => {
    try {
      const url = `http://${connectionHost}:${show.port}`;

      if (validateNavigation()) {
        navigation.navigate('WebView', {
          url,
          title: show.title,
          showId: show.id,
        });
        return { success: true };
      } else {
        const error = 'No navigation available for WebView screen';
        ErrorLogger.error(error, 'useInterfaceNavigation');
        showError('Navigation Error', 'Unable to navigate to the selected interface');
        return { success: false, error };
      }
    } catch (navigationError) {
      const error = `Navigation error: ${navigationError}`;
      ErrorLogger.error('Navigation to WebView screen failed', 'useInterfaceNavigation', navigationError instanceof Error ? navigationError : new Error(String(navigationError)));
      showError('Navigation Error', 'Unable to navigate to the selected interface');
      return { success: false, error };
    }
  };

  /**
   * Main navigation handler for interface selection
   */
  const handleShowSelect = (show: ShowOption): NavigationResult => {
    if (!validateConnection(show)) {
      return { success: false, error: 'Connection validation failed' };
    }

    if (show.id === 'api') {
      return navigateToApi(show);
    } else {
      return navigateToWebView(show);
    }
  };

  /**
   * Navigates back to connect screen
   */
  const navigateToConnect = (): NavigationResult => {
    try {
      if (validateNavigation()) {
        navigation.navigate('Connect');
        return { success: true };
      } else {
        const error = 'No navigation available for Connect screen';
        ErrorLogger.warn(error, 'useInterfaceNavigation');
        return { success: false, error };
      }
    } catch (navigationError) {
      const error = `Connect navigation error: ${navigationError}`;
      ErrorLogger.error('Navigation to Connect screen failed', 'useInterfaceNavigation', navigationError instanceof Error ? navigationError : new Error(String(navigationError)));
      return { success: false, error };
    }
  };

  return {
    errorModal,
    showError,
    hideError,
    handleShowSelect,
    navigateToConnect,
  };
};
