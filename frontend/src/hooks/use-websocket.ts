import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    if (!token) return

    socketRef.current = io(WS_URL, {
      auth: { token },
    })

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected')
    })

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [token])

  return socketRef.current
}

export function useWebSocketEvent<T>(event: string, handler: (data: T) => void) {
  const socket = useWebSocket()

  useEffect(() => {
    if (!socket) return

    socket.on(event, handler)

    return () => {
      socket.off(event, handler)
    }
  }, [socket, event, handler])
}
