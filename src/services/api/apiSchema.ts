import { actions as generatedActions } from 'freeshow-api/dist/actions'

export type ParamType = 'string' | 'number' | 'boolean' | 'enum' | 'any'

export interface CommandParam {
  type: ParamType
  required?: boolean
  enum?: string[]
}

export interface ApiCommandDef {
  id: string
  label: string
  params?: Record<string, CommandParam>
}

export interface ApiCategoryDef {
  id: string
  label: string
  icon?: string
  commands: ApiCommandDef[]
}

// Directly use the generated actions map from the package

// Auto-generated schema from freeshow-api package

// Helper: convert snake_case to Title Case
function snakeToTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper: convert freeshow-api generated param schema to our CommandParam map
function convertParamsFromGeneratedSchema(actionId: string): Record<string, CommandParam> | undefined {
  const incoming = (generatedActions as any)?.[actionId] as Record<string, string> | null | undefined
  if (!incoming) return undefined

  const params: Record<string, CommandParam> = {}
  for (const rawKey of Object.keys(incoming)) {
    const typeStr = incoming[rawKey]
    const isOptional = rawKey.endsWith('?')
    const key = isOptional ? rawKey.slice(0, -1) : rawKey

    // Basic type mapping
    let type: ParamType = 'any'
    let enumVals: string[] | undefined

    const normalized = String(typeStr)
    if (normalized === 'string') type = 'string'
    else if (normalized === 'number') type = 'number'
    else if (normalized === 'boolean') type = 'boolean'
  else if (/^".+"\s*\|/.test(normalized)) {
      // Union of string literals -> enum
      // Example: "text" | "media"
      const matches = normalized.match(/"([^"]+)"/g) || []
      enumVals = matches.map(m => m.replace(/"/g, ''))
      type = enumVals.length > 0 ? 'enum' : 'any'
    } else {
      type = 'any'
    }

    params[key] = {
      type,
      required: !isOptional,
      ...(type === 'enum' && enumVals ? { enum: enumVals } : {}),
    }
  }

  return Object.keys(params).length > 0 ? params : undefined
}


// Helper: get icon for category
function getCategoryIcon(categoryId: string): string {
  const icons: Record<string, string> = {
    'PROJECT': 'albums-outline',
    'SHOWS': 'easel-outline',
    'PRESENTATION': 'play-circle-outline',
    'CLEAR': 'trash-outline',
    'MEDIA': 'film-outline',
    'OVERLAYS': 'layers-outline',
    'VISUAL': 'color-palette-outline',
    'STAGE': 'tv-outline',
    'AUDIO': 'volume-high-outline',
    'TIMERS': 'time-outline',
    'FUNCTIONS': 'construct-outline',
    'OTHER': 'ellipsis-horizontal-outline',
    'ACTION': 'flash-outline',
    'EDIT': 'create-outline',
    'GET': 'download-outline',
  }
  return icons[categoryId] || 'ellipsis-horizontal-outline'
}

// Auto-generate categories from actions
function generateCategories(): ApiCategoryDef[] {
  const sections: { [key: string]: string } = {
    id_select_project: 'PROJECT',
    name_select_show: 'SHOWS',
    next_slide: 'PRESENTATION',
    id_select_stage_layout: 'STAGE',
    restore_output: 'CLEAR',
    start_camera: 'MEDIA',
    index_select_overlay: 'OVERLAYS',
    change_volume: 'AUDIO',
    name_start_timer: 'TIMERS',
    id_select_output_style: 'VISUAL',
    change_variable: 'FUNCTIONS',
    sync_drive: 'OTHER',
    name_run_action: 'ACTION',
    add_to_project: 'EDIT',
    get_shows: 'GET',
  }

  const categories: ApiCategoryDef[] = []
  const actionsInOrder = Object.keys(generatedActions || {})

  let currentCategory: ApiCategoryDef | null = null

  for (const actionId of actionsInOrder) {
    // Start a new category when we encounter a marker
    if (sections[actionId]) {
      currentCategory = {
        id: sections[actionId],
        label: sections[actionId],
        icon: getCategoryIcon(sections[actionId]),
        commands: [],
      }
      categories.push(currentCategory)
    }

    // If we don't have any category yet, skip until first marker 
    if (!currentCategory) continue

    // Add command to the current category
    currentCategory.commands.push({
      id: actionId,
      label: snakeToTitleCase(actionId),
      params: convertParamsFromGeneratedSchema(actionId),
    })
  }

  return categories
}

export const apiCategories: ApiCategoryDef[] = generateCategories()

export function findCommandById(commandId: string) {
  for (const cat of apiCategories) {
    const cmd = cat.commands.find(c => c.id === commandId)
    if (cmd) return { category: cat, command: cmd }
  }
  return null
}


