import { ErrorLogger } from '../services/ErrorLogger'
import { IStorageRepository, StorageKeys } from './IStorageRepository'
import { storageRepository } from './AsyncStorageRepository'

export type ApiFavorite =
  | { id: string; type: 'action'; actionId: string; data?: Record<string, any> }
  | { id: string; type: 'custom'; payload: string }

function simpleHash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

export class ApiFavoritesRepository {
  private readonly logContext = 'ApiFavoritesRepository';
  private storage: IStorageRepository;

  constructor(storage: IStorageRepository = storageRepository) {
    this.storage = storage;
  }

  async getFavorites(): Promise<ApiFavorite[]> {
    try {
      const list = await this.storage.getObject<ApiFavorite[]>(StorageKeys.API_FAVORITES);
      return Array.isArray(list) ? list : [];
    } catch (error) {
      ErrorLogger.error('Failed to get API favorites', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async setFavorites(favorites: ApiFavorite[]): Promise<void> {
    try {
      await this.storage.setObject<ApiFavorite[]>(StorageKeys.API_FAVORITES, favorites);
      ErrorLogger.debug(`Stored ${favorites.length} API favorites`, this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to set API favorites', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private buildIdForAction(actionId: string, data?: Record<string, any>): string {
    const suffix = data && Object.keys(data).length > 0 ? ':' + simpleHash(JSON.stringify(data)) : ''
    return `action:${actionId}${suffix}`
  }

  private buildIdForCustom(payload: string): string {
    return `custom:${simpleHash(payload)}`
  }

  async addFavorite(
    fav: (
      | { type: 'action'; actionId: string; data?: Record<string, any> }
      | { type: 'custom'; payload: string }
    )
  ): Promise<ApiFavorite[]> {
    const current = await this.getFavorites()
    let id: string
    let toSave: ApiFavorite
    if (fav.type === 'action') {
      id = this.buildIdForAction(fav.actionId, fav.data)
      toSave = { id, type: 'action', actionId: fav.actionId, data: fav.data }
    } else {
      id = this.buildIdForCustom(fav.payload)
      toSave = { id, type: 'custom', payload: fav.payload }
    }
    const next = [toSave, ...current.filter(f => f.id !== id)]
    await this.setFavorites(next)
    return next
  }

  async removeFavorite(id: string): Promise<ApiFavorite[]> {
    const current = await this.getFavorites()
    const next = current.filter(f => f.id !== id)
    await this.setFavorites(next)
    return next
  }

  // Quick toggle for parameterless commands (action without data)
  async toggleActionId(actionId: string): Promise<ApiFavorite[]> {
    const current = await this.getFavorites()
    const id = this.buildIdForAction(actionId)
    const exists = current.some(f => f.id === id)
    const actionFav: ApiFavorite = { id, type: 'action', actionId }
    const next: ApiFavorite[] = exists ? current.filter(f => f.id !== id) : [actionFav, ...current]
    await this.setFavorites(next)
    return next
  }
}

export const apiFavoritesRepository = new ApiFavoritesRepository();


