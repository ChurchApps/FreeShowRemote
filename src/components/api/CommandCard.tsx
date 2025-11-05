import React from 'react'
import { TouchableOpacity, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FreeShowTheme } from '../../theme/FreeShowTheme'
import { ApiCommandDef } from '../../services/api/apiSchema'

interface Props {
  command: ApiCommandDef
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onPress: (id: string) => void
}

const CommandCard: React.FC<Props> = ({ command, isFavorite, onToggleFavorite, onPress }) => {
  const hasParams = !!command.params && Object.keys(command.params).length > 0

  return (
    <TouchableOpacity
      onPress={() => onPress(command.id)}
      style={{
        backgroundColor: FreeShowTheme.colors.primaryDarker,
        borderWidth: 1,
        borderColor: FreeShowTheme.colors.primaryLighter,
        borderRadius: FreeShowTheme.borderRadius.lg,
        padding: FreeShowTheme.spacing.md,
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: FreeShowTheme.colors.text, fontWeight: '600' }}>{command.label}</Text>
          {hasParams && (
            <Text style={{ color: FreeShowTheme.colors.textSecondary, marginTop: 2, fontSize: FreeShowTheme.fontSize.sm }}>
              Requires parameters
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => onToggleFavorite(command.id)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={isFavorite ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

export default CommandCard


