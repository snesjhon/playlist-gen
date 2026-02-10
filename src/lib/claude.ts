import { ClaudeSong } from '../types'

const API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT =
  'You are a music recommendation engine. Return EXACTLY the requested number of songs as a JSON array with fields: title, artist, reason (1 sentence). Return ONLY the JSON array, no markdown, no explanation.'

function parseResponse(text: string): ClaudeSong[] {
  // Strip markdown fences if present
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('Response is not an array')
  return parsed.map((s: Record<string, unknown>) => ({
    title: String(s.title ?? ''),
    artist: String(s.artist ?? ''),
    reason: String(s.reason ?? ''),
  }))
}

async function callClaude(apiKey: string, userMessage: string): Promise<ClaudeSong[]> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    if (res.status === 401) throw new Error('Invalid Claude API key')
    if (res.status === 429) throw new Error('Rate limited. Please wait a moment and try again.')
    throw new Error(`Claude API error (${res.status}): ${body}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''
  return parseResponse(text)
}

export async function testClaudeKey(apiKey: string): Promise<void> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    }),
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid Claude API key')
    if (res.status === 403) throw new Error('Claude API key not authorized')
    throw new Error(`Claude API error (${res.status})`)
  }
}

export async function generatePlaylist(
  apiKey: string,
  prompt: string,
  avoid: { title: string; artist: string }[] = []
): Promise<ClaudeSong[]> {
  let message = `Create a playlist of 10 songs: "${prompt}"`
  if (avoid.length > 0) {
    const avoidList = avoid.map(s => `- "${s.title}" by ${s.artist}`).join('\n')
    message += `\n\nDo NOT suggest these songs:\n${avoidList}`
  }
  return callClaude(apiKey, message)
}

export async function regeneratePlaylist(
  apiKey: string,
  prompt: string,
  kept: { title: string; artist: string; reasons: string[] }[],
  removed: { title: string; artist: string; reasons: string[] }[],
  count: number
): Promise<ClaudeSong[]> {
  const formatReasons = (reasons: string[]) =>
    reasons.length > 0 ? ` — user feedback: ${reasons.join(', ')}` : ''

  const keptList = kept
    .map((s) => `- "${s.title}" by ${s.artist}${formatReasons(s.reasons)}`)
    .join('\n')

  const removedList = removed
    .map((s) => `- "${s.title}" by ${s.artist}${formatReasons(s.reasons)}`)
    .join('\n')

  const message = `Create a playlist: "${prompt}"

KEPT (user liked these, do NOT suggest again):
${keptList || '(none)'}

REMOVED (user disliked these, avoid similar):
${removedList || '(none)'}

Based on the feedback patterns, adjust your recommendations accordingly.
Suggest ${count} NEW songs that complement the kept songs.`

  return callClaude(apiKey, message)
}
