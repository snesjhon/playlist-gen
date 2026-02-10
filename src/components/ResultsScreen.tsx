import { useState } from 'react'
import { Song, KeepReason, RemoveReason } from '../types'
import { SongRow } from './SongCard'
import { SavedSidebar } from './SavedSidebar'
import { ExportModal } from './ExportModal'
import { generateAndMatch } from '../lib/generateAndMatch'
import { authorize, createPlaylist } from '../lib/musickit'
import { getClaudeApiKey } from '../lib/storage'

interface Props {
  suggestions: Song[]
  savedSongs: Song[]
  prompt: string
  onSuggestionsUpdate: (songs: Song[]) => void
  onSaveSongs: (songs: Song[]) => void
  onUpdateSavedSongs: (songs: Song[]) => void
  onBack: () => void
  playingSongId: string | null
  onPlay: (songId: string) => void
  allRemoved: { title: string; artist: string; reasons: string[] }[]
  onUpdateAllRemoved: (removed: { title: string; artist: string; reasons: string[] }[]) => void
}

export function ResultsScreen({
  suggestions,
  savedSongs,
  prompt,
  onSuggestionsUpdate,
  onSaveSongs,
  onUpdateSavedSongs,
  onBack,
  playingSongId,
  onPlay,
  allRemoved,
  onUpdateAllRemoved,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportResult, setExportResult] = useState<'success' | 'error' | null>(null)
  const [exportError, setExportError] = useState('')
  const [error, setError] = useState('')

  function handleKeep(index: number) {
    const updated = suggestions.map((s, i) =>
      i === index
        ? {
            ...s,
            status: s.status === 'kept' ? 'pending' as const : 'kept' as const,
            keepReasons: s.status === 'kept' ? [] : s.keepReasons,
          }
        : s
    )
    onSuggestionsUpdate(updated)
  }

  function handleRemove(index: number) {
    const updated = suggestions.map((s, i) =>
      i === index
        ? {
            ...s,
            status: s.status === 'removed' ? 'pending' as const : 'removed' as const,
            removeReasons: s.status === 'removed' ? [] : s.removeReasons,
          }
        : s
    )
    onSuggestionsUpdate(updated)
  }

  function handleUpdateReasons(index: number, keepReasons: KeepReason[], removeReasons: RemoveReason[]) {
    const updated = suggestions.map((s, i) =>
      i === index ? { ...s, keepReasons, removeReasons } : s
    )
    onSuggestionsUpdate(updated)
  }

  async function handleRegenerate() {
    const apiKey = getClaudeApiKey()
    if (!apiKey) return

    setLoading(true)
    setError('')

    try {
      const keptSongs = suggestions.filter((s) => s.status === 'kept')
      const kept = keptSongs.map((s) => ({
        title: s.claude.title,
        artist: s.claude.artist,
        reasons: s.keepReasons,
      }))

      const newlyRemoved = suggestions
        .filter((s) => s.status === 'removed')
        .map((s) => ({ title: s.claude.title, artist: s.claude.artist, reasons: s.removeReasons }))

      const removed = [...allRemoved, ...newlyRemoved]
      onUpdateAllRemoved(removed)

      // Move kept suggestions to saved sidebar
      if (keptSongs.length > 0) {
        onSaveSongs(keptSongs)
      }

      // Always fetch 10 new suggestions
      const allKept = [
        ...savedSongs.map(s => ({ title: s.claude.title, artist: s.claude.artist, reasons: s.keepReasons })),
        ...kept,
      ]
      const matched = await generateAndMatch(apiKey, prompt, allKept, removed, 10, false)
      onSuggestionsUpdate(matched)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to regenerate')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(name: string) {
    setExportLoading(true)
    setExportResult(null)
    setExportError('')

    try {
      await authorize()
      const ids = savedSongs.filter(s => s.match !== null).map((s) => s.match!.id)
      await createPlaylist(name, `Generated from: ${prompt}`, ids)
      setExportResult('success')
    } catch (e) {
      setExportResult('error')
      setExportError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  function handleRemoveSaved(index: number) {
    onUpdateSavedSongs(savedSongs.filter((_, i) => i !== index))
  }

  return (
    <div className="pb-24">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main suggestions panel */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6">
            <button
              className="text-text-secondary text-sm hover:text-text-primary transition-colors cursor-pointer bg-transparent border-none mb-3 px-0"
              onClick={onBack}
            >
              &larr; New Prompt
            </button>
            <h2 className="text-2xl font-semibold mb-1">{prompt}</h2>
            <p className="text-text-secondary text-sm mb-4">
              {suggestions.length} suggestions &middot; Keep the ones you like, remove the rest
            </p>
            <button
              className="px-5 py-2.5 bg-surface text-text-primary text-sm font-semibold rounded-lg border border-border hover:bg-surface-hover disabled:opacity-50 transition-colors cursor-pointer"
              onClick={handleRegenerate}
              disabled={loading}
            >
              {loading ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>

          {error && <p className="text-red text-sm mb-4">{error}</p>}

          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1fr_1fr_72px] gap-x-3 px-3 py-2 text-xs text-text-secondary uppercase tracking-wider border-b border-border mb-1">
            <span>#</span>
            <span>Song</span>
            <span>Artist</span>
            <span>Album</span>
            <span></span>
          </div>

          {/* Song list */}
          <div className="flex flex-col">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[40px_1fr] sm:grid-cols-[40px_1fr_1fr_1fr_72px] gap-x-3 px-3 py-3 items-center">
                    <div className="w-8 h-8 rounded bg-border animate-[shimmer_1.5s_infinite]" />
                    <div className="flex flex-col gap-1.5">
                      <div className="h-3.5 w-3/5 rounded bg-border animate-[shimmer_1.5s_infinite]" />
                      <div className="h-3 w-2/5 rounded bg-border animate-[shimmer_1.5s_infinite] sm:hidden" />
                    </div>
                    <div className="hidden sm:block h-3.5 w-2/5 rounded bg-border animate-[shimmer_1.5s_infinite]" />
                    <div className="hidden sm:block h-3.5 w-3/5 rounded bg-border animate-[shimmer_1.5s_infinite]" />
                    <div />
                  </div>
                ))
              : suggestions.map((song, i) => (
                  <SongRow
                    key={`${song.claude.title}-${song.claude.artist}-${i}`}
                    song={song}
                    index={i}
                    onKeep={() => handleKeep(i)}
                    onRemove={() => handleRemove(i)}
                    onPlay={() => song.match && onPlay(song.match.id)}
                    isPlaying={playingSongId === song.match?.id}
                    onUpdateReasons={(keepReasons, removeReasons) => handleUpdateReasons(i, keepReasons, removeReasons)}
                  />
                ))}
          </div>
        </div>

        {/* Saved songs sidebar */}
        <div className="w-full lg:w-80 lg:flex-shrink-0">
          <div className="lg:sticky lg:top-6 bg-surface/50 rounded-xl border border-border p-4">
            <SavedSidebar
              songs={savedSongs}
              onRemove={handleRemoveSaved}
              onExport={() => setShowExport(true)}
              playingSongId={playingSongId}
              onPlay={onPlay}
            />
          </div>
        </div>
      </div>

      {showExport && (
        <ExportModal
          defaultName={prompt.slice(0, 60)}
          songCount={savedSongs.filter(s => s.match !== null).length}
          onExport={handleExport}
          onClose={() => {
            setShowExport(false)
            setExportResult(null)
          }}
          loading={exportLoading}
          result={exportResult}
          errorMessage={exportError}
        />
      )}
    </div>
  )
}
