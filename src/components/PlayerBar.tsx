import { Song } from '../types'

interface Props {
  song: Song | null
  isPlaying: boolean
  onPlayPause: () => void
}

export function PlayerBar({ song, isPlaying, onPlayPause }: Props) {
  if (!song) return null

  const title = song.match?.title ?? song.claude.title
  const artist = song.match?.artist ?? song.claude.artist
  const artworkUrl = song.match?.artworkUrl

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-border z-40 animate-[slideUp_0.3s_ease-out]">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt={title}
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-border flex items-center justify-center text-text-secondary text-sm font-bold flex-shrink-0">
            ?
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{title}</div>
          <div className="text-xs text-text-secondary truncate">{artist}</div>
        </div>

        <button
          onClick={onPlayPause}
          className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0 hover:bg-white/90 transition-colors cursor-pointer text-base"
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
      </div>
    </div>
  )
}
