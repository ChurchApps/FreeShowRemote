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

interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title,
  message,
  buttonText = 'OK',
  onClose,
  icon = 'alert-circle-outline',
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={icon} 
                size={24} 
                color={FreeShowTheme.colors.disconnected} 
              />
            </View>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={FreeShowTheme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalMessage}>{message}</Text>
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.okButton}
              onPress={onClose}
            >
              <Text style={styles.okButtonText}>{buttonText}</Text>
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
    backgroundColor: FreeShowTheme.colors.disconnected + '20',
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
  },
  okButton: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    backgroundColor: FreeShowTheme.colors.secondary,
    minWidth: 80,
    alignItems: 'center',
  },
  okButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontWeight: '600',
  },
});

export default ErrorModal;