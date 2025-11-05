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
  route: { params?: { categoryId?: string, highlightCommandId?: string } }
  navigation: any
}

const APICategoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { categoryId, highlightCommandId } = route.params || {}
  const { favorites, toggleActionId } = useApiFavorites()
  const { send } = useFreeShowApi()
  const [activeCommandId, setActiveCommandId] = useState<string | null>(null)
  const [confirmCommandId, setConfirmCommandId] = useState<string | null>(null)

  const category: ApiCategoryDef | undefined = useMemo(() => {
    const id = categoryId || apiCategories[0]?.id
    return apiCategories.find(c => c.id === id)
  }, [categoryId])
  const activeCommand = useMemo(() => category?.commands.find(c => c.id === activeCommandId) || null, [category, activeCommandId])

  const scrollRef = React.useRef<ScrollView>(null)
  const [blinkOn, setBlinkOn] = useState(false)
  React.useEffect(() => {
    if (!category || !highlightCommandId) return
    const index = category.commands.findIndex(c => c.id === highlightCommandId)
    if (index < 0) return
    // Approximate item height to scroll into view
    const approxItemHeight = 64
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, index * approxItemHeight - 40), animated: true })
    }, 50)
  }, [category, highlightCommandId])

  // Blink effect for highlighted command (single short flash)
  React.useEffect(() => {
    if (!highlightCommandId) return
    setBlinkOn(false)
    let endTimeout: NodeJS.Timeout | null = null
    const startTimeout = setTimeout(() => {
      setBlinkOn(true)
      endTimeout = setTimeout(() => setBlinkOn(false), 320)
    }, 120)
    return () => {
      clearTimeout(startTimeout)
      if (endTimeout) clearTimeout(endTimeout)
    }
  }, [highlightCommandId])

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

      <ScrollView ref={scrollRef} style={{ flex: 1, padding: FreeShowTheme.spacing.lg }}>
        {category?.commands.map(cmd => {
          const isHighlighted = highlightCommandId === cmd.id
          return (
          <View
            key={cmd.id}
            style={{
              marginBottom: FreeShowTheme.spacing.md,
              borderRadius: FreeShowTheme.borderRadius.lg,
              position: 'relative',
            }}
          >
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
                  // For GET commands without params, open modal to show response and allow copy
                  if (cmd.id.startsWith('get_')) {
                    setActiveCommandId(id)
                  } else {
                    setConfirmCommandId(id)
                  }
                }
              }}
            />
            {isHighlighted && blinkOn && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: FreeShowTheme.colors.secondary + '55',
                borderRadius: FreeShowTheme.borderRadius.lg,
              }} />
            )}
          </View>
        )})}
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


