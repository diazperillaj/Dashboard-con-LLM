import { useEffect, useRef } from 'react'
import { X, Bot, Trash2 } from 'lucide-react'
import { ChatMessage, TypingIndicator } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type { ChatMessage as ChatMessageType } from '@/types/api'

interface ChatWindowProps {
  messages: ChatMessageType[]
  isLoading: boolean
  input: string
  onInputChange: (v: string) => void
  onSend: () => void
  onClose: () => void
  onClear: () => void
}

export function ChatWindow({
  messages,
  isLoading,
  input,
  onInputChange,
  onSend,
  onClose,
  onClear,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="animate-slide-in-right flex flex-col w-[380px] h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-900 text-white shrink-0">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
          <Bot className="w-4.5 h-4.5 text-white" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Asistente de análisis</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-400">En línea · Pregúntame lo que quieras</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={onClear}
              title="Clear chat"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Bot className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">¡Hola! Soy tu asistente de análisis.</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Pregúntame sobre la disponibilidad en tienda,<br />tendencias, picos o perspectivas.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 w-full mt-2">
              {[
                '¿Cuál es la disponibilidad promedio?',
                '¿Cuándo se registró la máxima disponibilidad?',
                '¿Cuáles son las horas de mayor afluencia?',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { onInputChange(suggestion); onSend() }}
                  className="text-xs text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={onInputChange}
        onSend={onSend}
        disabled={isLoading}
      />
    </div>
  )
}
