const CLAUDE_KEY = 'playlist-gen:claude-api-key'
const MUSIC_TOKEN = 'playlist-gen:apple-music-token'

export function getClaudeApiKey(): string | null {
  return localStorage.getItem(CLAUDE_KEY)
}

export function setClaudeApiKey(key: string): void {
  localStorage.setItem(CLAUDE_KEY, key)
}

export function getAppleMusicToken(): string | null {
  return localStorage.getItem(MUSIC_TOKEN)
}

export function setAppleMusicToken(token: string): void {
  localStorage.setItem(MUSIC_TOKEN, token)
}

export function clearKeys(): void {
  localStorage.removeItem(CLAUDE_KEY)
  localStorage.removeItem(MUSIC_TOKEN)
}

export function hasKeys(): boolean {
  return !!getClaudeApiKey() && !!getAppleMusicToken()
}

// Session persistence

import { SessionState, Song } from '../types'

const SESSION_KEY = 'playlist-gen:session'

function toSessionSong(s: Song) {
  return { claude: s.claude, status: s.status, keepReasons: s.keepReasons, removeReasons: s.removeReasons }
}

export function saveSession(
  prompt: string,
  suggestions: Song[],
  savedSongs: Song[],
  allRemoved: { title: string; artist: string; reasons: string[] }[],
): void {
  const state: SessionState = {
    prompt,
    suggestions: suggestions.map(toSessionSong),
    savedSongs: savedSongs.map(toSessionSong),
    allRemoved,
    updatedAt: Date.now(),
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
}

export function getSession(): SessionState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionState
    if (!parsed.prompt || !Array.isArray(parsed.suggestions)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
