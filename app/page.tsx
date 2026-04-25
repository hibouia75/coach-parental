'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function sendToAssistant(args: { message: string; history: Array<{ role: 'user' | 'assistant'; content: string }> }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }

  const data = (await res.json()) as { message?: string }
  if (!data.message) throw new Error('Réponse vide')
  return data.message
}

export default function Home() {
  const sessionId = useId()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: `${sessionId}-welcome`,
      role: 'assistant',
      content: "Bonjour ! Décris-moi la situation et l'âge de ton enfant, et je t’aide pas à pas.",
      createdAt: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const listRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const content = input.trim()
    if (!content || isSending) return

    setIsSending(true)
    setInput('')

    const userMsg: ChatMessage = {
      id: `${sessionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: 'user',
      content,
      createdAt: Date.now(),
    }

    const historyForApi = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMsg])

    try {
      const assistantText = await sendToAssistant({
        message: content,
        history: historyForApi,
      })

      const assistantMsg: ChatMessage = {
        id: `${sessionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: 'assistant',
        content: assistantText,
        createdAt: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'Erreur inconnue'
      const assistantMsg: ChatMessage = {
        id: `${sessionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: 'assistant',
        content: `Désolé, je n’arrive pas à répondre pour le moment.\n\nDétail: ${errorText}`,
        createdAt: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } finally {
      setIsSending(false)
      queueMicrotask(() => listRef.current?.focus())
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <span className="text-sm font-semibold tracking-tight">CP</span>
            </div>
            <div className="leading-tight">
              <h1 className="text-xl font-semibold tracking-tight">Coach Parental</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Propulsé par Groq (llama3-8b-8192)</p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div
            ref={listRef}
            tabIndex={-1}
            className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
            aria-label="Historique de la conversation"
          >
            <div className="space-y-4">
              {messages.map((m) => {
                const isUser = m.role === 'user'
                return (
                  <div key={m.id} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
                    <div className={isUser ? 'max-w-[85%] sm:max-w-[75%]' : 'max-w-[85%] sm:max-w-[75%]'}>
                      <div
                        className={[
                          'rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ring-1',
                          isUser
                            ? 'bg-zinc-950 text-white ring-zinc-950 dark:bg-white dark:text-zinc-950 dark:ring-white'
                            : 'bg-zinc-50 text-zinc-950 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-800',
                        ].join(' ')}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                      <div className={isUser ? 'mt-1 text-right text-xs text-zinc-500' : 'mt-1 text-xs text-zinc-500'}>
                        {formatTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="border-t border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-4"
          >
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écris ton message…"
                rows={1}
                className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-950 shadow-sm outline-none transition focus:border-zinc-300 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-700 dark:focus:ring-white/10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (canSend) onSubmit(e as unknown as React.FormEvent)
                  }
                }}
              />
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Envoyer
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne.
            </p>
          </form>
        </main>
      </div>
    </div>
  )
}
