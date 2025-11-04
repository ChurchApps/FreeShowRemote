import React, { useMemo, useState } from 'react'
import { Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FreeShowTheme } from '../../theme/FreeShowTheme'
import CommandForm from './CommandForm'
import { ApiCommandDef } from '../../services/api/apiSchema'
import { useFreeShowApi } from '../../hooks/useFreeShowApi'
import { useApiFavorites } from '../../hooks/useApiFavorites'

interface Props {
  visible: boolean
  onClose: () => void
  command: ApiCommandDef
  onSaved?: () => void
}

const APICommandModal: React.FC<Props> = ({ visible, onClose, command, onSaved }) => {
  const { send, isSending, lastResponse, connected } = useFreeShowApi()
  const { addFavorite } = useApiFavorites()
  const [values, setValues] = useState<Record<string, any>>({})

  const canRun = useMemo(() => {
    const params = command.params || {}
    return Object.entries(params).every(([key, schema]) => !schema.required || (values[key] !== undefined && values[key] !== ''))
  }, [command, values])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: FreeShowTheme.colors.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: FreeShowTheme.spacing.lg, borderBottomWidth: 1, borderBottomColor: FreeShowTheme.colors.primaryLighter }}>
          <Text style={{ color: FreeShowTheme.colors.text, fontSize: FreeShowTheme.fontSize.lg, fontWeight: '700' }}>{command.label}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: FreeShowTheme.spacing.lg }}>
          {!!command.params && (
            <CommandForm
              command={command}
              values={values}
              onChange={(key, value) => setValues(prev => ({ ...prev, [key]: value }))}
            />
          )}
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
                await addFavorite({ type: 'action', actionId: command.id, data: values })
                onSaved && onSaved()
                onClose()
              }}
              disabled={!canRun}
              style={{
                flex: 1,
                backgroundColor: !canRun ? '#6c757d' : FreeShowTheme.colors.primaryDarker,
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
              onPress={() => send(command.id, values)}
              disabled={!connected || isSending || !canRun}
              style={{
                flex: 1,
                backgroundColor: !connected || !canRun ? '#6c757d' : FreeShowTheme.colors.secondary,
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

export default APICommandModal


