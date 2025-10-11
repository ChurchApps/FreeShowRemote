import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ShowOption } from '../types';
import { configService } from '../config/AppConfig';

interface EnableInterfaceModalProps {
  visible: boolean;
  show: ShowOption | null;
  onClose: () => void;
  onSave: (port: string) => void;
  onCancel: () => void;
}

const EnableInterfaceModal: React.FC<EnableInterfaceModalProps> = ({
  visible,
  show,
  onClose,
  onSave,
  onCancel,
}) => {
  const defaultPorts = configService.getDefaultShowPorts();

  // Helper function to get default port for interface
  const getDefaultPortForInterface = (interfaceId: string): string => {
    const portMap: Record<string, number> = {
      'api': defaultPorts.api,
      'remote': defaultPorts.remote,
      'stage': defaultPorts.stage,
      'control': defaultPorts.control,
      'output': defaultPorts.output,
    };
    return String(portMap[interfaceId] ?? defaultPorts.api);
  };

  const [port, setPort] = useState(() => getDefaultPortForInterface(show?.id || ''));

  // Only reset port when the show (interface) changes, not when modal visibility changes
  React.useEffect(() => {
    if (show) {
      setPort(getDefaultPortForInterface(show.id));
    }
  }, [show?.id]); // Only depend on the interface ID, not visibility or defaultPorts

  const handleSave = () => {
    onSave(port);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.enableBackdrop}
      >
        <TouchableOpacity style={styles.enableBackdropTouchable} activeOpacity={1} onPress={onClose} />
        <View style={styles.enablePopupContainer}>
          <View style={styles.enableHandle} />
          
          {/* Header with icon and title */}
          <View style={styles.enableHeader}>
            <View style={[styles.enableIconContainer, { backgroundColor: (show?.color || '#333') + '15' }]}>
              <Ionicons
                name={(show?.icon as any) || 'apps'}
                size={28}
                color={show?.color || '#333'}
              />
            </View>
            <View style={styles.enableTitleContainer}>
              <Text style={styles.enableTitle}>Enable {show?.title}</Text>
              <Text style={styles.enableSubtitle}>Enter port number to enable this interface</Text>
            </View>
          </View>

          {/* Port Input */}
          <View style={styles.portInputContainer}>
            <Text style={styles.portInputLabel}>Port Number</Text>
            <TextInput
              style={styles.portInput}
              value={port}
              onChangeText={setPort}
              placeholder="Enter port number"
              placeholderTextColor={FreeShowTheme.colors.textSecondary}
              keyboardType="numeric"
              maxLength={5}
              autoFocus={true}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.enableActions}>
            <TouchableOpacity 
              style={[styles.enableActionButton, styles.enableCancelButton]}
              onPress={onCancel}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Text style={[styles.enableActionButtonText, styles.enableCancelButtonText]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.enableActionButton}
              onPress={handleSave}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.enableSaveGradient}
              >
                <Text style={styles.enableActionButtonText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Enable interface modal styles
  enableBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  enableBackdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  enablePopupContainer: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderTopLeftRadius: FreeShowTheme.borderRadius.xl || 24,
    borderTopRightRadius: FreeShowTheme.borderRadius.xl || 24,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  enableHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: FreeShowTheme.colors.text + '30',
    alignSelf: 'center',
    marginTop: FreeShowTheme.spacing.sm,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  enableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  enableIconContainer: {
    width: 52,
    height: 52,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  enableTitleContainer: {
    flex: 1,
  },
  enableTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 2,
  },
  enableSubtitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'AA',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
  },
  portInputContainer: {
    marginBottom: FreeShowTheme.spacing.xl,
  },
  portInputLabel: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  portInput: {
    height: 48,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.md,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
  },
  enableActions: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.sm,
  },
  enableActionButton: {
    flex: 1,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  enableSaveGradient: {
    width: '100%',
    paddingVertical: FreeShowTheme.spacing.lg,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
  },
  enableSaveButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  enableCancelButton: {
    backgroundColor: FreeShowTheme.colors.text + '08',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.text + '20',
    shadowOpacity: 0,
    elevation: 0,
  },
  enableActionButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
    color: 'white',
  },
  enableCancelButtonText: {
    color: FreeShowTheme.colors.text + 'DD',
  },
});

export default EnableInterfaceModal;