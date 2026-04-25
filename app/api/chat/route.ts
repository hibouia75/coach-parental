export const dynamic = 'force-dynamic'

type IncomingMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ChatRequestBody = {
  message?: string
  history?: IncomingMessage[]
}

const SYSTEM_PROMPT =
  "Tu es un coach parental bienveillant et expert en développement de l'enfant. Tu aides les parents dans leurs moments difficiles avec des conseils pratiques et empathiques. Tu poses des questions pour mieux comprendre la situation avant de conseiller."

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 })
  }

  let body: ChatRequestBody
  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return Response.json({ error: 'Missing message' }, { status: 400 })
  }

  const history = Array.isArray(body.history) ? body.history : []
  const cleanedHistory = history
    .filter((m): m is IncomingMessage => !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content }))

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...cleanedHistory, { role: 'user', content: message }],
      temperature: 0.7,
    }),
  })

  if (!groqRes.ok) {
    let details: unknown = undefined
    try {
      details = await groqRes.json()
    } catch {
      details = await groqRes.text().catch(() => undefined)
    }

    return Response.json(
      {
        error: 'Groq request failed',
        status: groqRes.status,
        details,
      },
      { status: 502 },
    )
  }

  const data = (await groqRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    return Response.json({ error: 'Empty model response' }, { status: 502 })
  }

  return Response.json({ message: content })
}

