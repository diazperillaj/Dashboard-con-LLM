import { useState, useCallback } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { ChatWindow } from './ChatWindow'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/api'

let msgId = 0
const nextId = () => String(++msgId)

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')

  const mutation = useMutation({
    mutationFn: api.sendChat,
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        },
      ])
    },
    onError: () => {
      setMessages(prev => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: 'Lo siento, se ha producido un error. Por favor, inténtelo de nuevo.',
          timestamp: new Date(),
        },
      ])
    },
  })

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || mutation.isPending) return

    setMessages(prev => [
      ...prev,
      {
        id: nextId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      },
    ])
    setInput('')
    mutation.mutate(text)
  }, [input, mutation])

  const handleClear = () => setMessages([])

  const unreadCount = open ? 0 : 0

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat window */}
      {open && (
        <ChatWindow
          messages={messages}
          isLoading={mutation.isPending}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onClose={() => setOpen(false)}
          onClear={handleClear}
        />
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95',
          open
            ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-300'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-300'
        )}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        <div
          className="transition-all duration-200"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(0deg)' }}
        >
          {open
            ? <X className="w-5.5 h-5.5 text-white" size={22} />
            : <MessageCircle className="w-5.5 h-5.5 text-white" size={22} />
          }
        </div>
        {/* Unread badge placeholder */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
