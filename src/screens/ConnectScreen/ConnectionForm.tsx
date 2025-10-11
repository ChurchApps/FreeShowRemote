import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { useConnection } from '../../contexts';
import { ValidationService } from '../../services/InputValidationService';
import { ErrorLogger } from '../../services/ErrorLogger';
import { configService } from '../../config/AppConfig';

interface ConnectionFormProps {
  host: string;
  setHost: (host: string) => void;
  remotePort: string;
  setRemotePort: (port: string) => void;
  stagePort: string;
  setStagePort: (port: string) => void;
  controlPort: string;
  setControlPort: (port: string) => void;
  outputPort: string;
  setOutputPort: (port: string) => void;
  apiPort: string;
  setApiPort: (port: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onCancelConnection: () => void;
  onShowQRScanner: () => void;
  onShowShareQR: () => void;
  navigation: any;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({
  host,
  setHost,
  remotePort,
  setRemotePort,
  stagePort,
  setStagePort,
  controlPort,
  setControlPort,
  outputPort,
  setOutputPort,
  apiPort,
  setApiPort,
  showAdvanced,
  setShowAdvanced,
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
  onCancelConnection,
  onShowQRScanner,
  onShowShareQR,
  navigation: _navigation,
}) => {
  const connection = useConnection();
  const { updateShowPorts } = connection.actions;
  const defaultPorts = configService.getDefaultShowPorts();

  // Convert port strings to numbers for show ports
  const getShowPorts = useCallback(() => ({
    remote: remotePort.trim() === '' ? 0 : (parseInt(remotePort) || 0),
    stage: stagePort.trim() === '' ? 0 : (parseInt(stagePort) || 0),
    control: controlPort.trim() === '' ? 0 : (parseInt(controlPort) || 0),
    output: outputPort.trim() === '' ? 0 : (parseInt(outputPort) || 0),
    api: apiPort.trim() === '' ? 0 : (parseInt(apiPort) || 0),
  }), [remotePort, stagePort, controlPort, outputPort, apiPort]);

  // Update show ports from form fields only when not connected (during connection setup)
  // When connected, ShowSelector controls interface states
  const prevPortsRef = useRef<string>('');
  
  useEffect(() => {
    if (!isConnected) {
      const currentPortsKey = `${remotePort}-${stagePort}-${controlPort}-${outputPort}-${apiPort}`;
      if (currentPortsKey !== prevPortsRef.current) {
        updateShowPorts(getShowPorts()).catch(error => {
          ErrorLogger.error('Failed to update show ports in ConnectionForm', 'ConnectionForm', error);
        });
        prevPortsRef.current = currentPortsKey;
      }
    }
  }, [isConnected, remotePort, stagePort, controlPort, outputPort, apiPort, updateShowPorts, getShowPorts]);

  // Animated spinner for connecting state
  const spinAnimRef = useRef(new Animated.Value(0));
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const spinInterpolation = spinAnimRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    if (isConnecting) {
      // Reset and start a continuous rotation
      spinAnimRef.current.setValue(0);
      animRef.current = Animated.loop(
        Animated.timing(spinAnimRef.current, {
          toValue: 1,
          duration: 800,
          easing: undefined as any,
          useNativeDriver: true,
        })
      );
      animRef.current.start();
    } else {
      // Stop animation and reset
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      spinAnimRef.current.stopAnimation(() => {
        spinAnimRef.current.setValue(0);
      });
    }
    return () => {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
    };
  }, [isConnecting]);

  const handleConnect = async () => {
    try {
      // Validate host input
      const hostValidation = ValidationService.validateHost(host.trim());
      if (!hostValidation.isValid) {
        // Error handling would be done in parent component
        throw new Error(`Invalid host: ${hostValidation.error || 'Please enter a valid host address'}`);
      }

      // Validate show ports (allow blank ports to be treated as disabled)
      const portsToValidate = {
        remote: remotePort,
        stage: stagePort,
        control: controlPort,
        output: outputPort,
        api: apiPort,
      };

      const validatedPorts: any = {};
      for (const [portName, portValue] of Object.entries(portsToValidate)) {
        // If port is blank, treat as disabled (port = 0)
        if (portValue.trim() === '') {
          validatedPorts[portName] = 0;
        } else {
          const portValidation = ValidationService.validatePort(portValue);
          if (!portValidation.isValid) {
            throw new Error(`${portName.charAt(0).toUpperCase() + portName.slice(1)} port: ${portValidation.error}`);
          }
          validatedPorts[portName] = portValidation.sanitizedValue;
        }
      }

      // Validate all ports (the validation function handles disabled ports)
      const showPortsValidation = ValidationService.validateShowPorts(validatedPorts);
      if (!showPortsValidation.isValid) {
        throw new Error(showPortsValidation.error || 'Invalid port configuration');
      }

      onConnect();
    } catch (error) {
      ErrorLogger.error('Manual connection failed', 'ConnectionForm', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  const handleRestoreDefaults = () => {
    setRemotePort(String(defaultPorts.remote));
    setStagePort(String(defaultPorts.stage));
    setControlPort(String(defaultPorts.control));
    setOutputPort(String(defaultPorts.output));
    setApiPort(String(defaultPorts.api));
  };

  // Function to clear a port (disable an interface)
  const handleClearPort = (portType: 'remote' | 'stage' | 'control' | 'output' | 'api') => {
    switch (portType) {
      case 'remote':
        setRemotePort('');
        break;
      case 'stage':
        setStagePort('');
        break;
      case 'control':
        setControlPort('');
        break;
      case 'output':
        setOutputPort('');
        break;
      case 'api':
        setApiPort('');
        break;
    }
  };

  return (
    <View style={styles.mainCard}>
      <Text style={styles.cardTitle}>
        {isConnected ? 'Connection Details' : 'Manual Connection'}
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Server Address</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={host}
            onChangeText={setHost}
            placeholder={configService.getNetworkConfig().hostPlaceholder}
            placeholderTextColor={FreeShowTheme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnected}
            accessibilityLabel="Server address input"
            accessibilityHint="Enter the IP address or hostname of the FreeShow server"
            keyboardType="default"
          />
          {!isConnected && (
            <TouchableOpacity
              style={styles.inputAction}
              onPress={onShowQRScanner}
              accessibilityRole="button"
              accessibilityLabel="Scan QR code"
              accessibilityHint="Open camera to scan a QR code for connection details"
            >
              <Ionicons name="qr-code-outline" size={22} color={FreeShowTheme.colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Advanced Settings Toggle */}
      <TouchableOpacity 
        style={styles.advancedToggle}
        onPress={() => setShowAdvanced(!showAdvanced)}
        accessibilityRole="button"
        accessibilityLabel={showAdvanced ? "Hide interface ports" : "Show interface ports"}
        accessibilityHint="Toggle display of advanced port configuration options"
      >
        <Text style={styles.advancedText}>Interface Ports</Text>
        <Ionicons 
          name={showAdvanced ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={FreeShowTheme.colors.textSecondary} 
        />
      </TouchableOpacity>

      {/* Advanced Settings */}
      {showAdvanced && (
        <View style={styles.advancedSection}>
          <View style={styles.portGrid}>
            <View style={styles.portItem}>
              <Text style={styles.portLabel}>Remote</Text>
              <View style={styles.portInputContainer}>
                <TextInput
                  style={styles.portInput}
                  value={remotePort}
                  onChangeText={setRemotePort}
                  placeholder=""
                  placeholderTextColor={FreeShowTheme.colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!isConnected}
                />
                {remotePort !== '' && !isConnected && (
                  <TouchableOpacity 
                    style={styles.clearPortButton}
                    onPress={() => handleClearPort('remote')}
                  >
                    <Ionicons name="close" size={16} color={FreeShowTheme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.portItem}>
              <Text style={styles.portLabel}>Stage</Text>
              <View style={styles.portInputContainer}>
                <TextInput
                  style={styles.portInput}
                  value={stagePort}
                  onChangeText={setStagePort}
                  placeholder=""
                  placeholderTextColor={FreeShowTheme.colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!isConnected}
                />
                {stagePort !== '' && !isConnected && (
                  <TouchableOpacity 
                    style={styles.clearPortButton}
                    onPress={() => handleClearPort('stage')}
                  >
                    <Ionicons name="close" size={16} color={FreeShowTheme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.portItem}>
              <Text style={styles.portLabel}>Control</Text>
              <View style={styles.portInputContainer}>
                <TextInput
                  style={styles.portInput}
                  value={controlPort}
                  onChangeText={setControlPort}
                  placeholder=""
                  placeholderTextColor={FreeShowTheme.colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!isConnected}
                />
                {controlPort !== '' && !isConnected && (
                  <TouchableOpacity 
                    style={styles.clearPortButton}
                    onPress={() => handleClearPort('control')}
                  >
                    <Ionicons name="close" size={16} color={FreeShowTheme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.portItem}>
              <Text style={styles.portLabel}>Output</Text>
              <View style={styles.portInputContainer}>
                <TextInput
                  style={styles.portInput}
                  value={outputPort}
                  onChangeText={setOutputPort}
                  placeholder=""
                  placeholderTextColor={FreeShowTheme.colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!isConnected}
                />
                {outputPort !== '' && !isConnected && (
                  <TouchableOpacity 
                    style={styles.clearPortButton}
                    onPress={() => handleClearPort('output')}
                  >
                    <Ionicons name="close" size={16} color={FreeShowTheme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.portItem}>
              <Text style={styles.portLabel}>API</Text>
              <View style={styles.portInputContainer}>
                <TextInput
                  style={styles.portInput}
                  value={apiPort}
                  onChangeText={setApiPort}
                  placeholder=""
                  placeholderTextColor={FreeShowTheme.colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!isConnected}
                />
                {apiPort !== '' && !isConnected && (
                  <TouchableOpacity 
                    style={styles.clearPortButton}
                    onPress={() => handleClearPort('api')}
                  >
                    <Ionicons name="close" size={16} color={FreeShowTheme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          
          {/* Help text for ports */}
          <View style={styles.portHelpContainer}>
            <Text style={styles.portHelpText}>
              <Ionicons name="information-circle-outline" size={14} color={FreeShowTheme.colors.textSecondary} />
              {' '}Leave ports empty to disable. Each port will be tested before connecting.
            </Text>
          </View>
          
          {/* Restore Defaults Button */}
          {!isConnected && (
            <TouchableOpacity 
              style={styles.restoreDefaultsButton}
              onPress={handleRestoreDefaults}
            >
              <Ionicons name="refresh" size={16} color={FreeShowTheme.colors.textSecondary} />
              <Text style={styles.restoreDefaultsText}>Restore Defaults</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main Action Button */}
      <View style={styles.actionContainer}>
        {isConnected ? (
          <View style={styles.connectedActions}>
            <TouchableOpacity 
              style={styles.secondaryActionButton} 
              onPress={onShowShareQR}
              accessibilityRole="button"
              accessibilityLabel="Share connection QR code"
              accessibilityHint="Generate and display a QR code for sharing this connection"
            >
              <LinearGradient
                colors={['#4CAF50', '#388E3C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.secondaryButtonContent}>
                <Ionicons name="share-outline" size={20} color="white" />
                <Text style={styles.secondaryButtonText}>Share</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={onDisconnect}
              accessibilityRole="button"
              accessibilityLabel="Disconnect from server"
              accessibilityHint="End the current connection to the FreeShow server"
            >
              <LinearGradient
                colors={['#F44336', '#D32F2F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.secondaryButtonContent}>
                <Ionicons name="log-out-outline" size={20} color="white" />
                <Text style={styles.secondaryButtonText}>Disconnect</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          isConnecting ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.connectingButton]}
              onPress={onCancelConnection}
              accessibilityRole="button"
              accessibilityLabel="Cancel connection attempt"
              accessibilityHint="Stop the current connection attempt"
            >
              <LinearGradient
                colors={['#F0008C', '#E0007A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.buttonContent}>
                <Animated.View style={[styles.spinner, { transform: [{ rotate: spinInterpolation }] }]} />
                <Text style={styles.buttonText}>Connecting to interface</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.connectButton]}
              onPress={handleConnect}
              accessibilityRole="button"
              accessibilityLabel="Connect to FreeShow server"
              accessibilityHint="Attempt to connect to the FreeShow server with the entered details"
            >
              <LinearGradient
                colors={['#F0008C', '#E0007A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.buttonContent}>
                <Ionicons name="wifi" size={24} color="white" />
                <Text style={styles.buttonText}>Connect</Text>
              </View>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Card Styles
  mainCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.xl,
    marginTop: 0, // Remove default margin since spacing is handled by parent
    marginBottom: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  
  // Input Styles
  inputContainer: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  inputLabel: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.md,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
  },
  inputAction: {
    padding: FreeShowTheme.spacing.sm,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  
  // Advanced Settings
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.md,
  },
  advancedText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
  },
  advancedSection: {
    marginTop: FreeShowTheme.spacing.md,
  },
  portGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.md,
  },
  portItem: {
    flex: 1,
    minWidth: '45%',
  },
  portLabel: {
    fontSize: FreeShowTheme.fontSize.xs,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  portInputContainer: {
    position: 'relative',
  },
  portInput: {
    height: 40,
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text,
    textAlign: 'center',
  },
  clearPortButton: {
    position: 'absolute',
    right: 8,
    top: 10,
    padding: 4,
    borderRadius: 10,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
  },
  
  // Restore Defaults Button
  restoreDefaultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.sm,
    backgroundColor: FreeShowTheme.colors.primary,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  restoreDefaultsText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginLeft: FreeShowTheme.spacing.xs,
  },
  
  // Action Buttons
  actionContainer: {
    marginTop: FreeShowTheme.spacing.xl,
  },
  connectedActions: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.sm,
    flex: 1,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.md,
    gap: FreeShowTheme.spacing.sm,
    minHeight: 44,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.md,
    gap: FreeShowTheme.spacing.sm,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FreeShowTheme.spacing.md,
    zIndex: 1,
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FreeShowTheme.spacing.sm,
    zIndex: 1,
  },
  connectButton: {
    shadowColor: '#F0008C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  connectingButton: {
    // Uses the same shadows as actionButton
  },
  shareButton: {
    shadowColor: '#F0008C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disconnectButton: {
    shadowColor: '#F0008C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  spinner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'white',
    borderTopColor: 'transparent',
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: '#2f3542',
    marginLeft: FreeShowTheme.spacing.md,
  },
  portHelpContainer: {
    marginTop: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.sm,
  },
  portHelpText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 18,
    textAlign: 'left',
  },
});

export default ConnectionForm;