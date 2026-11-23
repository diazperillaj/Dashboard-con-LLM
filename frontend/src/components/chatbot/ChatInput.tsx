import { useRef } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
}

export function ChatInput({ value, onChange, onSend, disabled = false }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
    }
  }

  const canSend = !disabled && value.trim().length > 0

  return (
    <div className="border-t border-slate-200 p-3 bg-white">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Pregunta por la disponibilidad en tienda…"
          className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all disabled:opacity-50 max-h-[120px] leading-relaxed"
          style={{ height: 40 }}
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0',
            canSend
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5 px-1">
        Introduzca para enviar · Mayús + Intro para nueva línea
      </p>
    </div>
  )
}
