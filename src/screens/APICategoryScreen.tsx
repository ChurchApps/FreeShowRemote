import React, { useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FreeShowTheme } from '../theme/FreeShowTheme'
import { apiCategories, ApiCategoryDef } from '../services/api/apiSchema'
import { useApiFavorites } from '../hooks/useApiFavorites'
import CommandCard from '../components/api/CommandCard'
import APICommandModal from '../components/api/APICommandModal'
import ConfirmRunModal from '../components/api/ConfirmRunModal'
import { useFreeShowApi } from '../hooks/useFreeShowApi'

interface Props {
  route: { params?: { categoryId?: string, openCommandId?: string } }
  navigation: any
}

const APICategoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { categoryId, openCommandId } = route.params || {}
  const { favorites, toggleActionId } = useApiFavorites()
  const { send } = useFreeShowApi()
  const [activeCommandId, setActiveCommandId] = useState<string | null>(null)
  const [confirmCommandId, setConfirmCommandId] = useState<string | null>(null)

  const category: ApiCategoryDef | undefined = useMemo(() => {
    const id = categoryId || apiCategories[0]?.id
    return apiCategories.find(c => c.id === id)
  }, [categoryId])
  const activeCommand = useMemo(() => category?.commands.find(c => c.id === activeCommandId) || null, [category, activeCommandId])

  React.useEffect(() => {
    if (!category || !openCommandId) return
    const cmd = category.commands.find(c => c.id === openCommandId)
    if (!cmd) return
    const hasParams = !!cmd.params && Object.keys(cmd.params).length > 0
    if (hasParams) {
      setActiveCommandId(cmd.id)
    } else {
      setConfirmCommandId(cmd.id)
    }
  }, [category, openCommandId])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FreeShowTheme.colors.primary }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: FreeShowTheme.spacing.md, paddingVertical: FreeShowTheme.spacing.md, backgroundColor: FreeShowTheme.colors.primaryDarker, borderBottomWidth: 1, borderBottomColor: FreeShowTheme.colors.primaryLighter }}>
        <TouchableOpacity style={{ padding: FreeShowTheme.spacing.sm }} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
        <View style={{ marginLeft: FreeShowTheme.spacing.md }}>
          <Text style={{ color: FreeShowTheme.colors.text, fontWeight: '700', fontSize: FreeShowTheme.fontSize.md }}>{category?.label || 'API'}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: FreeShowTheme.spacing.lg }}>
        {category?.commands.map(cmd => (
          <View key={cmd.id} style={{ marginBottom: FreeShowTheme.spacing.md }}>
            <CommandCard
              command={cmd}
              isFavorite={!!favorites.find(f => f.type === 'action' && f.actionId === cmd.id && (!cmd.params || Object.keys(cmd.params).length === 0))}
              onToggleFavorite={() => {
                const hasParams = !!cmd.params && Object.keys(cmd.params).length > 0
                if (hasParams) {
                  setActiveCommandId(cmd.id)
                } else {
                  toggleActionId(cmd.id)
                }
              }}
              onPress={(id) => {
                const hasParams = !!cmd.params && Object.keys(cmd.params).length > 0
                if (hasParams) {
                  setActiveCommandId(id)
                } else {
                  setConfirmCommandId(id)
                }
              }}
            />
          </View>
        ))}
      </ScrollView>

      {activeCommand && (
        <APICommandModal
          visible={!!activeCommand}
          onClose={() => setActiveCommandId(null)}
          command={activeCommand}
          onSaved={() => {
            setActiveCommandId(null)
            navigation.goBack()
          }}
        />
      )}

      {/* Confirmation modal for parameterless commands */}
      <ConfirmRunModal
        visible={!!confirmCommandId}
        title={category?.commands.find(c => c.id === confirmCommandId)?.label || 'Run Command'}
        message={'Are you sure you want to run this command?'}
        onCancel={() => setConfirmCommandId(null)}
        onConfirm={async () => {
          if (confirmCommandId) {
            await send(confirmCommandId)
            setConfirmCommandId(null)
          }
        }}
      />
    </SafeAreaView>
  )
}

export default APICategoryScreen


