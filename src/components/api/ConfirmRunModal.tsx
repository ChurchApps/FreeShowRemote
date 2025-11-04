import React from 'react'
import { Modal, View, Text, TouchableOpacity } from 'react-native'
import { FreeShowTheme } from '../../theme/FreeShowTheme'

interface Props {
  visible: boolean
  title?: string
  message?: string
  onCancel: () => void
  onConfirm: () => void
}

const ConfirmRunModal: React.FC<Props> = ({ visible, title = 'Run Command', message = 'Are you sure you want to run this command?', onCancel, onConfirm }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: '85%',
          backgroundColor: FreeShowTheme.colors.primaryDarker,
          borderRadius: FreeShowTheme.borderRadius.lg,
          borderWidth: 1,
          borderColor: FreeShowTheme.colors.primaryLighter,
          padding: FreeShowTheme.spacing.lg,
        }}>
          <Text style={{ color: FreeShowTheme.colors.text, fontWeight: '700', fontSize: FreeShowTheme.fontSize.md }}>{title}</Text>
          <Text style={{ color: FreeShowTheme.colors.textSecondary, marginTop: 8 }}>{message}</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: FreeShowTheme.spacing.lg, gap: FreeShowTheme.spacing.md }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                paddingVertical: FreeShowTheme.spacing.md,
                paddingHorizontal: FreeShowTheme.spacing.lg,
                borderRadius: FreeShowTheme.borderRadius.md,
                backgroundColor: FreeShowTheme.colors.primary,
                borderWidth: 1,
                borderColor: FreeShowTheme.colors.primaryLighter,
              }}
            >
              <Text style={{ color: FreeShowTheme.colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={{
                paddingVertical: FreeShowTheme.spacing.md,
                paddingHorizontal: FreeShowTheme.spacing.lg,
                borderRadius: FreeShowTheme.borderRadius.md,
                backgroundColor: FreeShowTheme.colors.secondary,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Run</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default ConfirmRunModal


