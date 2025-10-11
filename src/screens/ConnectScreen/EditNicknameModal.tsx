import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { ConnectionHistory } from '../../repositories';

interface EditNicknameModalProps {
  visible: boolean;
  editingConnection: ConnectionHistory | null;
  editNicknameText: string;
  setEditNicknameText: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const EditNicknameModal: React.FC<EditNicknameModalProps> = ({
  visible,
  editingConnection,
  editNicknameText,
  setEditNicknameText,
  onSave,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.editModalContent}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Edit Connection Name</Text>
            <TouchableOpacity
              style={styles.editModalCloseButton}
              onPress={onCancel}
            >
              <Ionicons name="close" size={24} color={FreeShowTheme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.editModalBody}>
            <Text style={styles.editModalLabel}>
              Connection: {editingConnection?.host}
            </Text>
            <TextInput
              style={styles.editModalInput}
              value={editNicknameText}
              onChangeText={setEditNicknameText}
              placeholder="Enter connection name"
              placeholderTextColor={FreeShowTheme.colors.textSecondary}
              autoFocus={true}
              selectTextOnFocus={true}
            />
          </View>
          
          <View style={styles.editModalButtons}>
            <TouchableOpacity
              style={[styles.editModalButton, styles.editModalCancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.editModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editModalButton, styles.editModalSaveButton]}
              onPress={onSave}
            >
              <Text style={styles.editModalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Edit Modal Styles  
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