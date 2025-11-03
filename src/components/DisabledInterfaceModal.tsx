import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ShowOption } from '../types';
import TVFocusable from './TVFocusable';

interface DisabledInterfaceModalProps {
  visible: boolean;
  show: ShowOption | null;
  onEnable: () => void;
  onCancel: () => void;
}

const DisabledInterfaceModal: React.FC<DisabledInterfaceModalProps> = ({
  visible,
  show,
  onEnable,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[
              styles.iconContainer,
              { backgroundColor: (show?.color || FreeShowTheme.colors.secondary) + '20' }
            ]}>
              <Ionicons
                name={(show?.icon as any) || 'apps'}
                size={24}
                color={show?.color || FreeShowTheme.colors.secondary}
              />
            </View>
            <Text style={styles.modalTitle}>{show?.title} Disabled</Text>
            <TVFocusable onPress={onCancel}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onCancel}
              >
                <Ionicons name="close" size={24} color={FreeShowTheme.colors.textSecondary} />
              </TouchableOpacity>
            </TVFocusable>
          </View>

          {/* Body */}
          <View style={styles.modalBody}>
            <Text style={styles.modalMessage}>
              This interface is currently disabled. Enable it to use this feature?
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.modalButtons}>
            <TVFocusable onPress={onCancel}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </TVFocusable>

            <TVFocusable onPress={onEnable}>
              <TouchableOpacity
                style={[styles.modalButton, styles.enableButton]}
                onPress={onEnable}
              >
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            </TVFocusable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    margin: FreeShowTheme.spacing.lg,
    minWidth: 300,
    maxWidth: 400,
    width: '85%',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  modalTitle: {
    flex: 1,
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  closeButton: {
    padding: FreeShowTheme.spacing.xs,
  },
  modalBody: {
    marginBottom: FreeShowTheme.spacing.xl,
  },
  modalMessage: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: FreeShowTheme.spacing.sm,
  },
  modalButton: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  enableButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  cancelButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '500',
  },
  enableButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontWeight: '600',
  },
});

export default DisabledInterfaceModal;
