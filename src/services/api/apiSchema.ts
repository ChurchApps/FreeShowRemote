export type ParamType = 'string' | 'number' | 'boolean' | 'enum' | 'any'

export interface CommandParam {
  type: ParamType
  required?: boolean
  enum?: string[]
}

export interface ApiCommandDef {
  id: string // action id
  label: string
  params?: Record<string, CommandParam>
}

export interface ApiCategoryDef {
  id: string
  label: string
  icon?: string // Ionicons name
  commands: ApiCommandDef[]
}

// Minimal but extensible schema derived from https://freeshow.app/api
export const apiCategories: ApiCategoryDef[] = [
  {
    id: 'PROJECT',
    label: 'PROJECT',
    icon: 'albums-outline',
    commands: [
      { id: 'id_select_project', label: 'Select Project by ID', params: { id: { type: 'string', required: true } } },
      { id: 'index_select_project', label: 'Select Project by Index', params: { index: { type: 'number', required: true } } },
      { id: 'name_select_project', label: 'Select Project by Name', params: { value: { type: 'string', required: true } } },
      { id: 'next_project_item', label: 'Next Project Item' },
      { id: 'previous_project_item', label: 'Previous Project Item' },
      { id: 'index_select_project_item', label: 'Select Project Item Index', params: { index: { type: 'number', required: true } } },
    ],
  },
  {
    id: 'SHOWS',
    label: 'SHOWS',
    icon: 'easel-outline',
    commands: [
      { id: 'name_select_show', label: 'Select Show by Name', params: { value: { type: 'string', required: true } } },
      { id: 'start_show', label: 'Start Show', params: { id: { type: 'string', required: true } } },
      { id: 'change_layout', label: 'Change Layout', params: { showId: { type: 'string' }, layoutId: { type: 'string', required: true } } },
      { id: 'set_plain_text', label: 'Set Plain Text', params: { id: { type: 'string', required: true }, value: { type: 'string', required: true } } },
      { id: 'set_show', label: 'Set Show', params: { id: { type: 'string', required: true }, value: { type: 'string', required: true } } },
      { id: 'rearrange_groups', label: 'Rearrange Groups', params: { showId: { type: 'string', required: true }, from: { type: 'number', required: true }, to: { type: 'number', required: true } } },
      { id: 'add_group', label: 'Add Group', params: { showId: { type: 'string', required: true }, groupId: { type: 'string', required: true } } },
      { id: 'set_template', label: 'Set Template', params: { id: { type: 'string', required: true } } },
    ],
  },
  {
    id: 'PRESENTATION',
    label: 'PRESENTATION',
    icon: 'play-circle-outline',
    commands: [
      { id: 'next_slide', label: 'Next Slide' },
      { id: 'previous_slide', label: 'Previous Slide' },
      { id: 'random_slide', label: 'Random Slide' },
      { id: 'index_select_slide', label: 'Select Slide by Index', params: { index: { type: 'number', required: true }, showId: { type: 'string' }, layoutId: { type: 'string' } } },
      { id: 'name_select_slide', label: 'Select Slide by Name', params: { value: { type: 'string', required: true } } },
      { id: 'id_select_group', label: 'Select Group by ID', params: { id: { type: 'string', required: true } } },
      { id: 'start_slide_recording', label: 'Start Slide Recording' },
    ],
  },
  {
    id: 'CLEAR',
    label: 'CLEAR',
    icon: 'trash-outline',
    commands: [
      { id: 'restore_output', label: 'Restore Output' },
      { id: 'clear_all', label: 'Clear All' },
      { id: 'clear_background', label: 'Clear Background' },
      { id: 'clear_slide', label: 'Clear Slide' },
      { id: 'clear_overlays', label: 'Clear Overlays' },
      { id: 'clear_audio', label: 'Clear Audio' },
      { id: 'clear_next_timer', label: 'Clear Next Timer' },
      { id: 'clear_drawing', label: 'Clear Drawing' },
    ],
  },
  {
    id: 'MEDIA',
    label: 'MEDIA',
    icon: 'film-outline',
    commands: [
      { id: 'start_camera', label: 'Start Camera', params: { id: { type: 'string', required: true }, name: { type: 'string' }, groupId: { type: 'string' } } },
      { id: 'start_screen', label: 'Start Screen', params: { id: { type: 'string', required: true }, name: { type: 'string' } } },
      { id: 'play_media', label: 'Play Media', params: { path: { type: 'string', required: true }, index: { type: 'number' }, data: { type: 'any' } } },
    ],
  },
  {
    id: 'OVERLAYS',
    label: 'OVERLAYS',
    icon: 'layers-outline',
    commands: [
      { id: 'index_select_overlay', label: 'Select Overlay Index', params: { index: { type: 'number', required: true } } },
      { id: 'name_select_overlay', label: 'Select Overlay Name', params: { value: { type: 'string', required: true } } },
      { id: 'id_select_overlay', label: 'Select Overlay by ID', params: { id: { type: 'string', required: true } } },
      { id: 'start_scripture', label: 'Start Scripture', params: { id: { type: 'string', required: true }, reference: { type: 'string', required: true } } },
      { id: 'scripture_next', label: 'Scripture Next' },
      { id: 'scripture_previous', label: 'Scripture Previous' },
      { id: 'lock_output', label: 'Lock Output', params: { value: { type: 'boolean' } } },
      { id: 'toggle_output_windows', label: 'Toggle Output Windows' },
      { id: 'toggle_output', label: 'Toggle Output', params: { id: { type: 'string', required: true } } },
    ],
  },
  {
    id: 'VISUAL',
    label: 'VISUAL',
    icon: 'color-palette-outline',
    commands: [
      { id: 'id_select_output_style', label: 'Select Output Style by ID', params: { id: { type: 'string', required: true } } },
      { id: 'change_output_style', label: 'Change Output Style', params: { outputStyle: { type: 'string' }, styleOutputs: { type: 'any' } } },
      { id: 'change_stage_output_layout', label: 'Change Stage Output Layout', params: { outputId: { type: 'string' }, stageLayoutId: { type: 'string', required: true } } },
      { id: 'change_transition', label: 'Change Transition', params: { id: { type: 'enum', enum: ['text', 'media'] }, type: { type: 'string' }, duration: { type: 'number' }, easing: { type: 'string' } } },
    ],
  },
  {
    id: 'STAGE',
    label: 'STAGE',
    icon: 'tv-outline',
    commands: [
      { id: 'id_select_stage_layout', label: 'Select Stage Layout by ID', params: { id: { type: 'string', required: true } } },
      { id: 'play_audio', label: 'Play Audio', params: { path: { type: 'string', required: true }, index: { type: 'number' }, data: { type: 'any' } } },
      { id: 'pause_audio', label: 'Pause Audio', params: { path: { type: 'string', required: true }, index: { type: 'number' }, data: { type: 'any' } } },
      { id: 'stop_audio', label: 'Stop Audio', params: { path: { type: 'string', required: true }, index: { type: 'number' }, data: { type: 'any' } } },
    ],
  },
  {
    id: 'AUDIO',
    label: 'AUDIO',
    icon: 'volume-high-outline',
    commands: [
      { id: 'change_volume', label: 'Change Volume', params: { volume: { type: 'number' }, gain: { type: 'number' } } },
      { id: 'start_audio_stream', label: 'Start Audio Stream', params: { id: { type: 'string', required: true } } },
      { id: 'start_playlist', label: 'Start Playlist', params: { id: { type: 'string', required: true } } },
      { id: 'playlist_next', label: 'Playlist Next' },
      { id: 'start_metronome', label: 'Start Metronome', params: { tempo: { type: 'number' }, beats: { type: 'number' }, volume: { type: 'number' }, audioOutput: { type: 'string' } } },
    ],
  },
  {
    id: 'TIMERS',
    label: 'TIMERS',
    icon: 'time-outline',
    commands: [
      { id: 'name_start_timer', label: 'Start Timer by Name', params: { value: { type: 'string', required: true } } },
      { id: 'id_start_timer', label: 'Start Timer by ID', params: { id: { type: 'string', required: true } } },
      { id: 'start_slide_timers', label: 'Start Slide Timers', params: { showId: { type: 'string' }, slideId: { type: 'string' } } },
      { id: 'pause_timers', label: 'Pause Timers' },
      { id: 'stop_timers', label: 'Stop Timers' },
      { id: 'edit_timer', label: 'Edit Timer', params: { id: { type: 'string', required: true }, key: { type: 'string', required: true }, value: { type: 'any', required: true } } },
    ],
  },
  {
    id: 'FUNCTIONS',
    label: 'FUNCTIONS',
    icon: 'construct-outline',
    commands: [
      { id: 'change_variable', label: 'Change Variable', params: { id: { type: 'string' }, name: { type: 'string' }, index: { type: 'number' }, key: { type: 'enum', enum: ['text','number','random_number','value','enabled','step','name','type','increment','decrement','randomize','reset'] }, value: { type: 'any' }, variableAction: { type: 'enum', enum: ['increment','decrement'] } } },
      { id: 'start_trigger', label: 'Start Trigger', params: { id: { type: 'string', required: true } } },
    ],
  },
  {
    id: 'OTHER',
    label: 'OTHER',
    icon: 'ellipsis-horizontal-outline',
    commands: [
      { id: 'sync_drive', label: 'Sync Drive' },
      { id: 'sync_pco', label: 'Sync PCO' },
      { id: 'send_rest_command', label: 'Send REST Command', params: { url: { type: 'string', required: true }, method: { type: 'string', required: true }, contentType: { type: 'string', required: true }, payload: { type: 'string', required: true } } },
      { id: 'emit_action', label: 'Emit Action', params: { emitter: { type: 'string', required: true }, template: { type: 'string' }, templateValues: { type: 'any' } } },
    ],
  },
  {
    id: 'ACTION',
    label: 'ACTION',
    icon: 'flash-outline',
    commands: [
      { id: 'name_run_action', label: 'Run Action by Name', params: { value: { type: 'string', required: true } } },
      { id: 'run_action', label: 'Run Action by ID', params: { id: { type: 'string', required: true } } },
      { id: 'toggle_action', label: 'Toggle Action', params: { id: { type: 'string', required: true }, value: { type: 'boolean' } } },
    ],
  },
  {
    id: 'EDIT',
    label: 'EDIT',
    icon: 'create-outline',
    commands: [
      { id: 'add_to_project', label: 'Add to Project', params: { projectId: { type: 'string', required: true }, id: { type: 'string', required: true }, data: { type: 'any' } } },
      { id: 'create_show', label: 'Create Show', params: { text: { type: 'string', required: true }, name: { type: 'string' }, category: { type: 'string' } } },
    ],
  },
  {
    id: 'GET',
    label: 'GET',
    icon: 'download-outline',
    commands: [
      { id: 'get_shows', label: 'Get Shows' },
      { id: 'get_show', label: 'Get Show', params: { id: { type: 'string', required: true } } },
      { id: 'get_show_layout', label: 'Get Show Layout', params: { id: { type: 'string', required: true } } },
      { id: 'get_projects', label: 'Get Projects' },
      { id: 'get_project', label: 'Get Project', params: { id: { type: 'string', required: true } } },
      { id: 'get_plain_text', label: 'Get Plain Text', params: { id: { type: 'string', required: true } } },
      { id: 'get_groups', label: 'Get Groups', params: { id: { type: 'string', required: true } } },
      { id: 'get_output', label: 'Get Output', params: { id: { type: 'string' } } },
      { id: 'get_output_slide_text', label: 'Get Output Slide Text' },
      { id: 'get_output_group_name', label: 'Get Output Group Name' },
      { id: 'get_dynamic_value', label: 'Get Dynamic Value', params: { value: { type: 'string', required: true }, ref: { type: 'any' } } },
      { id: 'get_playing_video_duration', label: 'Get Playing Video Duration' },
      { id: 'get_playing_video_time', label: 'Get Playing Video Time' },
      { id: 'get_playing_video_time_left', label: 'Get Playing Video Time Left' },
      { id: 'get_playing_audio_duration', label: 'Get Playing Audio Duration' },
      { id: 'get_playing_audio_time', label: 'Get Playing Audio Time' },
      { id: 'get_playing_audio_time_left', label: 'Get Playing Audio Time Left' },
      { id: 'get_playing_audio_data', label: 'Get Playing Audio Data' },
      { id: 'get_playlists', label: 'Get Playlists' },
      { id: 'get_playlist', label: 'Get Playlist', params: { id: { type: 'string' } } },
      { id: 'get_slide', label: 'Get Slide', params: { showId: { type: 'string' }, slideId: { type: 'string' } } },
      { id: 'get_thumbnail', label: 'Get Thumbnail', params: { path: { type: 'string', required: true }, index: { type: 'number' }, data: { type: 'any' } } },
      { id: 'get_slide_thumbnail', label: 'Get Slide Thumbnail', params: { showId: { type: 'string' }, layoutId: { type: 'string' }, index: { type: 'number' } } },
      { id: 'get_pdf_thumbnails', label: 'Get PDF Thumbnails', params: { path: { type: 'string', required: true }, index: { type: 'number' }, data: { type: 'any' } } },
      { id: 'get_cleared', label: 'Get Cleared' },
    ],
  },
]

export function findCommandById(commandId: string) {
  for (const cat of apiCategories) {
    const cmd = cat.commands.find(c => c.id === commandId)
    if (cmd) return { category: cat, command: cmd }
  }
  return null
}


