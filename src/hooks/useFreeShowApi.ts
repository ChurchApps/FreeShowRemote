import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useConnection } from '../contexts'
import { configService } from '../config/AppConfig'
import { ErrorLogger } from '../services/ErrorLogger'

export interface ApiSendOptions {
  silent?: boolean
}

export function useFreeShowApi() {
  const { state } = useConnection()
  const { connectionHost, isConnected, currentShowPorts } = state

  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [lastResponse, setLastResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const isApiAvailable = !!(currentShowPorts?.api && currentShowPorts.api > 0)

  useEffect(() => {
    if (!isConnected || !connectionHost || !isApiAvailable) {
      disconnect()
      return
    }
    connect()
    return () => disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, connectionHost, currentShowPorts?.api])

  const connect = useCallback(() => {
    try {
      if (!connectionHost || !currentShowPorts?.api) return
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      const socketUrl = `http://${connectionHost}:${currentShowPorts.api}`
      const socket = io(socketUrl, {
        transports: ['websocket'],
        timeout: configService.getNetworkConfig().connectionTimeout,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1500,
      })

      socket.on('connect', () => {
        setConnected(true)
        setError(null)
      })
      socket.on('disconnect', () => {
        setConnected(false)
      })
      socket.on('connect_error', (e) => {
        setError(e?.message || 'Connection error')
      })
      socket.on('data', (resp) => {
        setLastResponse(resp)
      })

      socketRef.current = socket
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      ErrorLogger.error('Failed to connect to API', 'useFreeShowApi', e instanceof Error ? e : new Error(String(e)))
    }
  }, [connectionHost, currentShowPorts?.api])

  const disconnect = useCallback(() => {
    try {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setConnected(false)
    } catch (e) {
      // ignore
    }
  }, [])

  const send = useCallback(async (action: string, data: any = {}, _options?: ApiSendOptions) => {
    if (!socketRef.current || !socketRef.current.connected) {
      setError('Not connected to FreeShow')
      return
    }
    try {
      setIsSending(true)
      const payload = { action, ...data }
      ErrorLogger.debug('Sending API command', 'useFreeShowApi', { payload })
      socketRef.current.emit('data', JSON.stringify(payload))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      ErrorLogger.error('API send failed', 'useFreeShowApi', e instanceof Error ? e : new Error(String(e)))
    } finally {
      setIsSending(false)
    }
  }, [])

  return { connected, isSending, lastResponse, error, send, isApiAvailable }
}


