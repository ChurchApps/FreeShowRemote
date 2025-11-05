import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ApiFavorite, apiFavoritesRepository } from '../repositories/ApiFavoritesRepository'
import { ErrorLogger } from '../services/ErrorLogger'

interface ApiFavoritesState {
  favorites: ApiFavorite[]
  loading: boolean
  error: string | null
  addFavorite: (
    fav:
      | { type: 'action'; actionId: string; data?: Record<string, any> }
      | { type: 'custom'; payload: string }
  ) => Promise<void>
  removeFavorite: (id: string) => Promise<void>
  toggleActionId: (actionId: string) => Promise<void>
  setFavorites: (list: ApiFavorite[]) => Promise<void>
}

const ApiFavoritesContext = createContext<ApiFavoritesState | undefined>(undefined)

export const ApiFavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavoritesState] = useState<ApiFavorite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const list = await apiFavoritesRepository.getFavorites()
        setFavoritesState(list)
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e)
        setError(err)
        ErrorLogger.error('Failed to load API favorites', 'ApiFavoritesProvider', new Error(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const addFavorite = useCallback(async (
    fav:
      | { type: 'action'; actionId: string; data?: Record<string, any> }
      | { type: 'custom'; payload: string }
  ) => {
    const next = await apiFavoritesRepository.addFavorite(fav)
    setFavoritesState(next)
  }, [])

  const removeFavorite = useCallback(async (id: string) => {
    const next = await apiFavoritesRepository.removeFavorite(id)
    setFavoritesState(next)
  }, [])

  const toggleActionId = useCallback(async (actionId: string) => {
    const next = await apiFavoritesRepository.toggleActionId(actionId)
    setFavoritesState(next)
  }, [])

  const setFavorites = useCallback(async (list: ApiFavorite[]) => {
    await apiFavoritesRepository.setFavorites(list)
    setFavoritesState(list)
  }, [])

  return (
    <ApiFavoritesContext.Provider value={{ favorites, loading, error, addFavorite, removeFavorite, toggleActionId, setFavorites }}>
      {children}
    </ApiFavoritesContext.Provider>
  )
}

export const useApiFavoritesContext = () => {
  const ctx = useContext(ApiFavoritesContext)
  if (!ctx) {
    throw new Error('useApiFavoritesContext must be used within ApiFavoritesProvider')
  }
  return ctx
}


