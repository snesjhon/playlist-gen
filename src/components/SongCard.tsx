import { Song, KeepReason, RemoveReason } from '../types'

const KEEP_CHIPS: { value: KeepReason; label: string }[] = [
  { value: 'perfect-mood', label: 'Perfect mood' },
  { value: 'love-genre', label: 'Love the genre' },
  { value: 'great-tempo', label: 'Great tempo' },
  { value: 'love-artist', label: 'Love artist' },
  { value: 'good-discovery', label: 'Good discovery' },
  { value: 'nostalgic', label: 'Nostalgic' },
]

const REMOVE_CHIPS: { value: RemoveReason; label: string }[] = [
  { value: 'wrong-mood', label: 'Wrong mood' },
  { value: 'wrong-genre', label: 'Wrong genre' },
  { value: 'wrong-era', label: 'Wrong era' },
  { value: 'too-popular', label: 'Too popular' },
  { value: 'too-obscure', label: 'Too obscure' },
  { value: 'dislike-artist', label: "Don't like artist" },
  { value: 'too-fast', label: 'Too fast' },
  { value: 'too-slow', label: 'Too slow' },
  { value: 'too-intense', label: 'Too intense' },
  { value: 'too-soft', label: 'Too soft' },
]

interface Props {
  song: Song
  index: number
  onKeep: () => void
  onRemove: () => void
  onPlay: () => void
  isPlaying: boolean
  onUpdateReasons: (keepReasons: KeepReason[], removeReasons: RemoveReason[]) => void
}

export function SongRow({ song, index, onKeep, onRemove, onPlay, isPlaying, onUpdateReasons }: Props) {
  const { claude, match, status } = song
  const isKept = status === 'kept'
  const isRemoved = status === 'removed'

  const title = match?.title ?? claude.title
  const artist = match?.artist ?? claude.artist
  const album = match?.album ?? ''

  function toggleKeepReason(reason: KeepReason) {
    const current = song.keepReasons
    const updated = current.includes(reason)
      ? current.filter((r) => r !== reason)
      : [...current, reason]
    onUpdateReasons(updated, song.removeReasons)
  }

  function toggleRemoveReason(reason: RemoveReason) {
    const current = song.removeReasons
    const updated = current.includes(reason)
      ? current.filter((r) => r !== reason)
      : [...current, reason]
    onUpdateReasons(song.keepReasons, updated)
  }

  return (
    <div>
      <div
        className={`group grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_1fr_1fr_72px] gap-x-3 px-3 py-2.5 items-center rounded-lg hover:bg-surface transition-colors cursor-pointer ${
          isRemoved ? 'opacity-40' : ''
        } ${isKept ? 'border-l-2 border-l-green' : 'border-l-2 border-l-transparent'}`}
        onClick={match ? onPlay : undefined}
      >
        {/* Number / artwork */}
        <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
          {match?.artworkUrl ? (
            <>
              <img
                src={match.artworkUrl}
                alt=""
                className={`w-8 h-8 rounded object-cover ${isPlaying ? 'hidden' : 'block'} group-hover:hidden`}
              />
              <span className={`text-text-secondary text-sm ${isPlaying ? 'hidden' : 'hidden'} group-hover:block`}>
                ▶
              </span>
              {isPlaying && (
                <span className="text-accent text-sm font-bold">❚❚</span>
              )}
            </>
          ) : (
            <span className="text-text-secondary text-sm">{index + 1}</span>
          )}
        </div>

        {/* Song title + artist (mobile shows both here) */}
        <div className="min-w-0">
          <div className={`text-sm font-medium truncate ${isRemoved ? 'line-through' : ''}`}>
            {title}
          </div>
          <div className="text-xs text-text-secondary truncate sm:hidden">{artist}</div>
          {claude.reason && (
            <div className="text-xs text-text-secondary italic truncate mt-0.5 sm:hidden" title={claude.reason}>
              {claude.reason}
            </div>
          )}
        </div>

        {/* Artist (desktop) */}
        <div className="hidden sm:block text-sm text-text-secondary truncate" title={claude.reason}>
          {artist}
        </div>

        {/* Album (desktop) */}
        <div className="hidden sm:block text-sm text-text-secondary truncate">
          {album || '—'}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs cursor-pointer transition-all ${
              isKept
                ? 'bg-green border-green text-white'
                : 'border-border text-text-secondary hover:border-text-primary hover:text-text-primary bg-transparent'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            onClick={onKeep}
            title="Keep"
            disabled={isRemoved}
          >
            &#10003;
          </button>
          <button
            className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs cursor-pointer transition-all ${
              isRemoved
                ? 'bg-red border-red text-white'
                : 'border-border text-text-secondary hover:border-text-primary hover:text-text-primary bg-transparent'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            onClick={onRemove}
            title="Remove"
            disabled={isKept}
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* Feedback chips */}
      {isKept && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-0.5 ml-[52px]">
          {KEEP_CHIPS.map((chip) => {
            const selected = song.keepReasons.includes(chip.value)
            return (
              <button
                key={chip.value}
                onClick={() => toggleKeepReason(chip.value)}
                className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                  selected
                    ? 'bg-green/20 border-green text-green'
                    : 'bg-transparent border-border text-text-secondary hover:border-green/50 hover:text-green/70'
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      )}

      {isRemoved && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-0.5 ml-[52px] opacity-60">
          {REMOVE_CHIPS.map((chip) => {
            const selected = song.removeReasons.includes(chip.value)
            return (
              <button
                key={chip.value}
                onClick={() => toggleRemoveReason(chip.value)}
                className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                  selected
                    ? 'bg-red/20 border-red text-red'
                    : 'bg-transparent border-border text-text-secondary hover:border-red/50 hover:text-red/70'
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
