import React from 'react'
import { View, Text, TextInput, Switch } from 'react-native'
import { FreeShowTheme } from '../../theme/FreeShowTheme'
import { ApiCommandDef, CommandParam } from '../../services/api/apiSchema'

interface Props {
  command: ApiCommandDef
  values: Record<string, any>
  onChange: (key: string, value: any) => void
}

const Field: React.FC<{ name: string; schema: CommandParam; value: any; onChange: (v: any) => void }> = ({ name, schema, value, onChange }) => {
  const label = `${name}${schema.required ? ' *' : ''}`
  if (schema.type === 'boolean') {
    return (
      <View style={{ marginBottom: FreeShowTheme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: FreeShowTheme.colors.text }}>{label}</Text>
        <Switch value={!!value} onValueChange={onChange} />
      </View>
    )
  }
  if (schema.type === 'enum' && schema.enum) {
    // Simple text input that suggests enum; could be improved with a Picker
    return (
      <View style={{ marginBottom: FreeShowTheme.spacing.md }}>
        <Text style={{ color: FreeShowTheme.colors.text, marginBottom: 6 }}>{label} ({schema.enum.join(' | ')})</Text>
        <TextInput
          value={value ?? ''}
          onChangeText={onChange}
          placeholder="Select value"
          placeholderTextColor={FreeShowTheme.colors.textSecondary}
          style={{
            borderWidth: 1,
            borderColor: FreeShowTheme.colors.primaryLighter,
            backgroundColor: FreeShowTheme.colors.primary,
            borderRadius: FreeShowTheme.borderRadius.md,
            padding: FreeShowTheme.spacing.md,
            color: FreeShowTheme.colors.text,
          }}
        />
      </View>
    )
  }
  return (
    <View style={{ marginBottom: FreeShowTheme.spacing.md }}>
      <Text style={{ color: FreeShowTheme.colors.text, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value != null ? String(value) : ''}
        onChangeText={(t) => {
          if (schema.type === 'number') {
            const num = Number(t)
            onChange(Number.isNaN(num) ? undefined : num)
          } else {
            onChange(t)
          }
        }}
        placeholder={schema.type === 'number' ? 'Enter number' : 'Enter value'}
        placeholderTextColor={FreeShowTheme.colors.textSecondary}
        keyboardType={schema.type === 'number' ? 'numeric' : 'default'}
        style={{
          borderWidth: 1,
          borderColor: FreeShowTheme.colors.primaryLighter,
          backgroundColor: FreeShowTheme.colors.primary,
          borderRadius: FreeShowTheme.borderRadius.md,
          padding: FreeShowTheme.spacing.md,
          color: FreeShowTheme.colors.text,
        }}
        multiline={schema.type === 'any'}
      />
    </View>
  )
}

const CommandForm: React.FC<Props> = ({ command, values, onChange }) => {
  const params = command.params || {}
  return (
    <View>
      {Object.entries(params).map(([key, schema]) => (
        <Field key={key} name={key} schema={schema} value={values[key]} onChange={(v) => onChange(key, v)} />
      ))}
    </View>
  )
}

export default CommandForm


