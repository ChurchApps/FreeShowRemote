import React, { useState } from 'react'
import { Modal, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FreeShowTheme } from '../../theme/FreeShowTheme'
import { useFreeShowApi } from '../../hooks/useFreeShowApi'
import { useApiFavorites } from '../../hooks/useApiFavorites'

interface Props {
  visible: boolean
  onClose: () => void
  onSaved?: () => void
}

const CustomCommandModal: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const { send, isSending, lastResponse, connected } = useFreeShowApi()
  const { addFavorite } = useApiFavorites()
  const [text, setText] = useState('')

  const handleRun = () => {
    const raw = text.trim()
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && parsed.action) {
        const { action, ...rest } = parsed
        send(action, rest)
      } else {
        // Not a recognized object; treat as action string
        send(raw)
      }
    } catch {
      // Not JSON; treat as plain action id
      send(raw)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: FreeShowTheme.colors.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: FreeShowTheme.spacing.lg, borderBottomWidth: 1, borderBottomColor: FreeShowTheme.colors.primaryLighter }}>
          <Text style={{ color: FreeShowTheme.colors.text, fontSize: FreeShowTheme.fontSize.lg, fontWeight: '700' }}>Custom API Command</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: FreeShowTheme.spacing.lg }}>
          <Text style={{ color: FreeShowTheme.colors.textSecondary, marginBottom: 8 }}>Enter an action id or full JSON payload</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder='e.g. next_slide or {"action":"get_shows"}'
            placeholderTextColor={FreeShowTheme.colors.textSecondary}
            multiline
            style={{
              minHeight: 120,
              borderWidth: 1,
              borderColor: FreeShowTheme.colors.primaryLighter,
              backgroundColor: FreeShowTheme.colors.primary,
              borderRadius: FreeShowTheme.borderRadius.md,
              padding: FreeShowTheme.spacing.md,
              color: FreeShowTheme.colors.text,
              fontFamily: 'monospace',
              fontSize: FreeShowTheme.fontSize.sm,
            }}
          />

          <View style={{ height: 12 }} />
          <View style={{ borderWidth: 1, borderColor: FreeShowTheme.colors.primaryLighter, borderRadius: FreeShowTheme.borderRadius.md, padding: FreeShowTheme.spacing.md, backgroundColor: FreeShowTheme.colors.primaryDarker }}>
            <Text style={{ color: FreeShowTheme.colors.textSecondary, marginBottom: 8 }}>Last Response</Text>
            <Text style={{ color: FreeShowTheme.colors.text, fontFamily: 'monospace', fontSize: FreeShowTheme.fontSize.xs }}>
              {lastResponse ? (typeof lastResponse === 'string' ? lastResponse : JSON.stringify(lastResponse, null, 2)) : 'No response yet'}
            </Text>
          </View>
        </ScrollView>

        <View style={{ padding: FreeShowTheme.spacing.lg, borderTopWidth: 1, borderTopColor: FreeShowTheme.colors.primaryLighter }}>
          <View style={{ flexDirection: 'row', gap: FreeShowTheme.spacing.md }}>
            <TouchableOpacity
              onPress={async () => {
                if (text.trim()) {
                  await addFavorite({ type: 'custom', payload: text.trim() })
                  onSaved && onSaved()
                  onClose()
                }
              }}
              disabled={!text.trim()}
              style={{
                flex: 1,
                backgroundColor: !text.trim() ? '#6c757d' : FreeShowTheme.colors.primaryDarker,
                borderWidth: 1,
                borderColor: FreeShowTheme.colors.primaryLighter,
                borderRadius: FreeShowTheme.borderRadius.lg,
                paddingVertical: FreeShowTheme.spacing.lg,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: FreeShowTheme.colors.text, fontWeight: '700' }}>Save to Favorites</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRun}
              disabled={!connected || isSending || !text.trim()}
              style={{
                flex: 1,
                backgroundColor: !connected || !text.trim() ? '#6c757d' : FreeShowTheme.colors.secondary,
                borderRadius: FreeShowTheme.borderRadius.lg,
                paddingVertical: FreeShowTheme.spacing.lg,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>{isSending ? 'Sending...' : 'Run'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
      </SafeAreaView>
    </Modal>
  )
}

export default CustomCommandModal


