import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ConnectionHistory, settingsRepository } from '../repositories';
import { ErrorLogger } from '../services/ErrorLogger';

interface EditNicknameModalProps {
  visible: boolean;
  connection: ConnectionHistory | null;
  onClose: () => void;
  onSaved?: (nickname: string) => void;
  onError?: (error: string) => void;
}

const EditNicknameModal: React.FC<EditNicknameModalProps> = ({
  visible,
  connection,
  onClose,
  onSaved,
  onError,
}) => {
  const [nickname, setNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Update nickname when connection changes
  useEffect(() => {
    if (connection) {
      setNickname(connection.nickname || connection.host);
    }
  }, [connection]);

  const handleSave = async () => {
    if (!connection || isSaving) return;

    setIsSaving(true);
    try {
      await settingsRepository.updateConnectionNickname(connection.id, nickname);
      onSaved?.(nickname);
      onClose();
    } catch (error) {
      ErrorLogger.error('Failed to update connection name', 'EditNicknameModal', error instanceof Error ? error : new Error(String(error)));
      onError?.('Failed to update connection name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!isSaving) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.editModalContent}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Edit Connection Name</Text>
            <TouchableOpacity
              style={styles.editModalCloseButton}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Ionicons name="close" size={24} color={FreeShowTheme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.editModalBody}>
            <Text style={styles.editModalLabel}>
              Connection: {connection?.host}
            </Text>
            <TextInput
              style={styles.editModalInput}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Enter connection name"
              placeholderTextColor={FreeShowTheme.colors.textSecondary}
              autoFocus={true}
              selectTextOnFocus={true}
              editable={!isSaving}
            />
          </View>
          
          <View style={styles.editModalButtons}>
            <TouchableOpacity
              style={[styles.editModalButton, styles.editModalCancelButton]}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Text style={styles.editModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.editModalButton,
                styles.editModalSaveButton,
                isSaving && styles.editModalButtonDisabled
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.editModalSaveText}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    margin: FreeShowTheme.spacing.lg,
    minWidth: 280,
    maxWidth: 400,
    width: '80%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  editModalTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  editModalCloseButton: {
    padding: FreeShowTheme.spacing.xs,
  },
  editModalBody: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  editModalLabel: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  editModalInput: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: FreeShowTheme.spacing.sm,
  },
  editModalButton: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  editModalCancelButton: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  editModalSaveButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  editModalButtonDisabled: {
    opacity: 0.5,
  },
  editModalCancelText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '500',
  },
  editModalSaveText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontWeight: '600',
  },
});

export default EditNicknameModal;
