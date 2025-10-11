import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'default',
  onConfirm,
  onCancel,
  icon,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                {icon && (
                  <View style={[
                    styles.iconContainer,
                    confirmStyle === 'destructive' && styles.iconContainerDestructive
                  ]}>
                    <Ionicons
                      name={icon}
                      size={24}
                      color={confirmStyle === 'destructive' ? FreeShowTheme.colors.disconnected : FreeShowTheme.colors.secondary}
                    />
                  </View>
                )}
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onCancel}
                >
                  <Ionicons name="close" size={24} color={FreeShowTheme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                <Text style={styles.modalMessage}>{message}</Text>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    confirmStyle === 'destructive' ? styles.destructiveButton : styles.confirmButton
                  ]}
                  onPress={onConfirm}
                >
                  <Text style={[
                    styles.confirmButtonText,
                    confirmStyle === 'destructive' && styles.destructiveButtonText
                  ]}>
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    backgroundColor: FreeShowTheme.colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  iconContainerDestructive: {
    backgroundColor: FreeShowTheme.colors.disconnected + '20',
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
  confirmButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  destructiveButton: {
    backgroundColor: FreeShowTheme.colors.disconnected,
  },
  cancelButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '500',
  },
  confirmButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontWeight: '600',
  },
  destructiveButtonText: {
    color: 'white',
  },
});

export default ConfirmationModal;