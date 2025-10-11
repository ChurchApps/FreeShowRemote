import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ErrorLogger } from '../services/ErrorLogger';
import ErrorModal from './ErrorModal';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  showErrorModal: boolean;
  errorModalTitle: string;
  errorModalMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showErrorModal: false,
      errorModalTitle: '',
      errorModalMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    ErrorLogger.error('ErrorBoundary caught an error', 'ErrorBoundary', error, { componentStack: errorInfo.componentStack });

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (onErrorError) {
        ErrorLogger.error('Error in onError callback', 'ErrorBoundary', onErrorError instanceof Error ? onErrorError : new Error(String(onErrorError)));
      }
    }

    this.setState({
      error,
      errorInfo,
    });

    // Optional: Report to crash analytics service
    // crashlytics().recordError(error);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (resetKey, index) => resetKey !== prevProps.resetKeys![index]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error boundary when any props change (if enabled)
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    // Cancel any pending reset
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showErrorModal: false,
      errorModalTitle: '',
      errorModalMessage: '',
    });
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleReportError = () => {
    const { error } = this.state;
    if (!error) return;

    this.setState({
      showErrorModal: true,
      errorModalTitle: 'Error Report',
      errorModalMessage: `Error: ${error.message}\n\nError details have been logged to console for debugging.`,
    });

    // Log the error report
    const { errorInfo } = this.state;
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: 'React Native App',
    };
    ErrorLogger.error('ErrorBoundary error report', 'ErrorBoundary', new Error(JSON.stringify(errorReport)));
  };

  handleCloseErrorModal = () => {
    this.setState({
      showErrorModal: false,
      errorModalTitle: '',
      errorModalMessage: '',
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons 
              name="warning-outline" 
              size={64} 
              color={FreeShowTheme.colors.disconnected} 
            />
            
            <Text style={styles.title}>Something went wrong</Text>
            
            <Text style={styles.message}>
              An unexpected error occurred. The app can continue running, but some features might not work properly.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Error Details (Development Mode)</Text>
                <Text style={styles.debugText}>
                  {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text style={styles.debugStack}>
                    {this.state.error.stack}
                  </Text>
                )}
              </ScrollView>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={this.handleRetry}
              >
                <Ionicons 
                  name="refresh-outline" 
                  size={20} 
                  color={FreeShowTheme.colors.text} 
                />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.handleReportError}
              >
                <Ionicons 
                  name="bug-outline" 
                  size={20} 
                  color={FreeShowTheme.colors.secondary} 
                />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Report Error
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Modal */}
          <ErrorModal
            visible={this.state.showErrorModal}
            title={this.state.errorModalTitle}
            message={this.state.errorModalMessage}
            onClose={this.handleCloseErrorModal}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    maxWidth: 400,
    alignItems: 'center',
    padding: 24,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.disconnected + '40',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: FreeShowTheme.colors.text + 'CC',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  debugContainer: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.secondary,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: FreeShowTheme.colors.disconnected,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  debugStack: {
    fontSize: 10,
    color: FreeShowTheme.colors.text + '80',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  secondaryButtonText: {
    color: FreeShowTheme.colors.secondary,
  },
});
