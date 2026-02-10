import { Song } from '../types'

interface Props {
  songs: Song[]
  onRemove: (index: number) => void
  onExport: () => void
  playingSongId: string | null
  onPlay: (songId: string) => void
}

export function SavedSidebar({ songs, onRemove, onExport, playingSongId, onPlay }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">
          Your Playlist ({songs.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5">
        {songs.length === 0 && (
          <p className="text-text-secondary text-sm py-4">
            Keep songs from suggestions to build your playlist.
          </p>
        )}
        {songs.map((song, i) => {
          const { match, claude } = song
          const isPlaying = playingSongId === match?.id
          return (
            <div
              key={`${claude.title}-${claude.artist}-${i}`}
              className={`group flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface transition-colors cursor-pointer ${
                isPlaying ? 'bg-surface' : ''
              }`}
              onClick={() => match && onPlay(match.id)}
            >
              {match?.artworkUrl ? (
                <img
                  src={match.artworkUrl}
                  alt=""
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-border flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium truncate ${isPlaying ? 'text-accent' : ''}`}>
                  {match?.title ?? claude.title}
                </div>
                <div className="text-xs text-text-secondary truncate">
                  {match?.artist ?? claude.artist}
                </div>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center text-text-secondary hover:text-red text-xs transition-all bg-transparent border-none cursor-pointer flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(i)
                }}
                title="Remove from playlist"
              >
                &#10005;
              </button>
            </div>
          )
        })}
      </div>

      {songs.length > 0 && (
        <button
          className="mt-3 w-full px-4 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
          onClick={onExport}
        >
          Export Playlist ({songs.length})
        </button>
      )}
    </div>
  )
}
