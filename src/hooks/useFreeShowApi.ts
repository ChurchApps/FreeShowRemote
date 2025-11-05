import { useCallback, useEffect, useRef, useState } from 'react'
import api from 'freeshow-api'
import { io, Socket } from 'socket.io-client'
import { useConnection } from '../contexts'
import { ErrorLogger } from '../services/ErrorLogger'

export interface ApiSendOptions {
	silent?: boolean
}

export function useFreeShowApi() {
	const { state } = useConnection()
	const { connectionHost, isConnected, currentShowPorts } = state

	const apiRef = useRef<ReturnType<typeof api> | null>(null)
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
	}, [isConnected, connectionHost, currentShowPorts?.api])

	const connect = useCallback(() => {
		try {
			if (!connectionHost || !currentShowPorts?.api) return
			const baseUrl = `http://${connectionHost}:${currentShowPorts.api}`
			apiRef.current = api(baseUrl)
			if (socketRef.current) {
				socketRef.current.disconnect()
				socketRef.current = null
			}
			const socket = io(baseUrl, {
				transports: ['websocket'],
				reconnection: true,
				reconnectionAttempts: 5,
				reconnectionDelay: 1500,
			})
			socket.on('connect', () => setConnected(true))
			socket.on('disconnect', () => setConnected(false))
			socket.on('data', (resp: any) => {
				try {
					const parsed = typeof resp === 'string' ? JSON.parse(resp) : resp
					setLastResponse(parsed)
				} catch {
					setLastResponse(resp)
				}
			})
			socket.on('connect_error', (e: any) => setError(e?.message || 'Connection error'))
			socketRef.current = socket
			setConnected(true)
			setError(null)
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e))
			ErrorLogger.error('Failed to initialize FreeShow API', 'useFreeShowApi', e instanceof Error ? e : new Error(String(e)))
		}
	}, [connectionHost, currentShowPorts?.api])

	const disconnect = useCallback(() => {
		try {
			apiRef.current = null
			if (socketRef.current) {
				socketRef.current.disconnect()
				socketRef.current = null
			}
			setConnected(false)
		} catch {
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


