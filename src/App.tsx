import { useState, useEffect, useCallback } from 'react'
import { Screen, Song } from './types'
import { hasKeys, getClaudeApiKey, getAppleMusicToken, clearKeys, saveSession, getSession, clearSession } from './lib/storage'
import { generateAndMatch } from './lib/generateAndMatch'
import { matchSongs } from './lib/musickit'
import { initMusicKit, playSong, stopPlayback, onPlaybackStateChange, isPlaying as checkIsPlaying } from './lib/musickit'
import { initTheme, setTheme, getStoredTheme, type Theme } from './lib/theme'
import { SetupScreen } from './components/SetupScreen'
import { PromptScreen } from './components/PromptScreen'
import { ResultsScreen } from './components/ResultsScreen'
import { PlayerBar } from './components/PlayerBar'
import { ThemeToggle } from './components/ThemeToggle'

export default function App() {
  const [screen, setScreen] = useState<Screen>(hasKeys() ? 'prompt' : 'setup')
  const [suggestions, setSuggestions] = useState<Song[]>([])
  const [savedSongs, setSavedSongs] = useState<Song[]>([])
  const [allRemoved, setAllRemoved] = useState<{ title: string; artist: string; reasons: string[] }[]>([])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [musicKitReady, setMusicKitReady] = useState(false)
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    return initTheme()
  }, [])

  function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme)
    setThemeState(newTheme)
  }

  useEffect(() => {
    const token = getAppleMusicToken()
    if (token && !musicKitReady) {
      initMusicKit(token)
        .then(() => setMusicKitReady(true))
        .catch((e) => console.error('MusicKit init failed:', e))
    }
  }, [screen, musicKitReady])

  useEffect(() => {
    const unsub = onPlaybackStateChange(() => {
      if (!checkIsPlaying()) setPlayingSongId(null)
    })
    return unsub
  }, [])

  // Auto-save session when on results screen
  useEffect(() => {
    if (screen === 'results' && suggestions.length > 0) {
      saveSession(prompt, suggestions, savedSongs, allRemoved)
    }
  }, [screen, prompt, suggestions, savedSongs, allRemoved])

  const handlePlay = useCallback(async (songId: string) => {
    if (playingSongId === songId) {
      stopPlayback()
      setPlayingSongId(null)
    } else {
      try {
        setPlayingSongId(songId)
        await playSong(songId)
      } catch (e) {
        console.error('Playback failed:', e)
        setPlayingSongId(null)
      }
    }
  }, [playingSongId])

  async function handleGenerate(userPrompt: string) {
    const apiKey = getClaudeApiKey()
    if (!apiKey) return

    clearSession()
    setLoading(true)
    setError('')
    setPrompt(userPrompt)

    try {
      const matched = await generateAndMatch(apiKey, userPrompt, [], [], 10, true)
      setSuggestions(matched)
      setSavedSongs([])
      setAllRemoved([])
      setScreen('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleResume() {
    const session = getSession()
    if (!session) return

    setLoading(true)
    setPrompt(session.prompt)
    setError('')

    try {
      // Re-match suggestions and saved songs via Apple Music
      const [matchedSuggestions, matchedSaved] = await Promise.all([
        matchSongs(session.suggestions.map(s => s.claude)),
        matchSongs(session.savedSongs.map(s => s.claude)),
      ])

      // Merge back status/reasons from session
      const restoredSuggestions = matchedSuggestions.map((song, i) => ({
        ...song,
        status: session.suggestions[i].status,
        keepReasons: session.suggestions[i].keepReasons,
        removeReasons: session.suggestions[i].removeReasons,
      }))

      const restoredSaved = matchedSaved.map((song, i) => ({
        ...song,
        status: session.savedSongs[i].status,
        keepReasons: session.savedSongs[i].keepReasons,
        removeReasons: session.savedSongs[i].removeReasons,
      }))

      setSuggestions(restoredSuggestions)
      setSavedSongs(restoredSaved)
      setAllRemoved(session.allRemoved)
      setScreen('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resume session')
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    clearSession()
    setScreen('prompt')
  }

  function handleChangeKeys() {
    clearSession()
    clearKeys()
    setScreen('setup')
  }

  const playingSong = suggestions.find(s => s.match?.id === playingSongId)
    ?? savedSongs.find(s => s.match?.id === playingSongId)
    ?? null

  const isResults = screen === 'results'

  const sessionPrompt = screen === 'prompt' ? getSession()?.prompt : undefined

  return (
    <div className={`${isResults ? 'max-w-6xl' : 'max-w-3xl'} mx-auto px-4 py-6 min-h-dvh`}>
      <div className="flex justify-end mb-2">
        <ThemeToggle theme={theme} onChange={handleThemeChange} />
      </div>

      {error && screen === 'prompt' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red text-white px-5 py-2.5 rounded-lg text-sm z-50 animate-[fadeIn_0.3s]">
          {error}
        </div>
      )}

      {screen === 'setup' && (
        <SetupScreen onComplete={() => setScreen('prompt')} />
      )}

      {screen === 'prompt' && (
        <PromptScreen
          onGenerate={handleGenerate}
          onChangeKeys={handleChangeKeys}
          loading={loading}
          sessionPrompt={sessionPrompt}
          onResume={handleResume}
        />
      )}

      {isResults && (
        <ResultsScreen
          suggestions={suggestions}
          savedSongs={savedSongs}
          prompt={prompt}
          onSuggestionsUpdate={setSuggestions}
          onSaveSongs={(songs) => setSavedSongs(prev => [...prev, ...songs])}
          onUpdateSavedSongs={setSavedSongs}
          onBack={handleBack}
          playingSongId={playingSongId}
          onPlay={handlePlay}
          allRemoved={allRemoved}
          onUpdateAllRemoved={setAllRemoved}
        />
      )}

      <PlayerBar
        song={playingSong}
        isPlaying={playingSongId !== null}
        onPlayPause={() => playingSongId && handlePlay(playingSongId)}
      />
    </div>
  )
}
