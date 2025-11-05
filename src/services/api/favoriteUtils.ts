import { ApiFavorite } from '../../repositories/ApiFavoritesRepository'

export function buildSendArgsFromFavorite(fav: ApiFavorite): { action: string; data?: any } | null {
  if (fav.type === 'action') {
    return { action: fav.actionId, data: fav.data }
  }
  // custom: try parse JSON with {action,...}
  try {
    const parsed = JSON.parse(fav.payload)
    if (parsed && typeof parsed === 'object' && parsed.action) {
      const { action, ...rest } = parsed
      return { action, data: rest }
    }
  } catch {
    // ignore
  }
  // treat as raw action id
  return { action: fav.payload }
}


