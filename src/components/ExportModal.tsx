import { useState } from 'react'

interface Props {
  defaultName: string
  songCount: number
  onExport: (name: string) => void
  onClose: () => void
  loading: boolean
  result: 'success' | 'error' | null
  errorMessage: string
}

export function ExportModal({
  defaultName,
  songCount,
  onExport,
  onClose,
  loading,
  result,
  errorMessage,
}: Props) {
  const [name, setName] = useState(defaultName)

  return (
    <div
      className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl p-7 max-w-[420px] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {result === 'success' ? (
          <>
            <h2 className="text-xl font-semibold mb-3">Playlist Created!</h2>
            <p className="text-text-secondary mb-4">Your playlist has been added to your Apple Music library.</p>
            <button
              className="w-full px-6 py-3 bg-accent text-white text-[15px] font-semibold rounded-lg hover:bg-accent-hover transition-colors"
              onClick={onClose}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-3">Export to Apple Music</h2>
            <p className="text-text-secondary mb-4">
              {songCount} song{songCount !== 1 ? 's' : ''} will be added to a new playlist.
            </p>

            <div className="mb-4">
              <label htmlFor="playlist-name" className="block text-sm font-medium mb-1.5">
                Playlist Name
              </label>
              <input
                id="playlist-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-3 bg-bg border border-border rounded-lg text-text-primary text-[15px] outline-none focus:border-accent transition-colors disabled:opacity-50"
              />
            </div>

            {result === 'error' && <p className="text-red text-sm mb-2">{errorMessage}</p>}

            <div className="flex gap-3 mt-4">
              <button
                className="flex-1 px-6 py-3 bg-surface text-text-primary text-[15px] font-semibold rounded-lg border border-border hover:bg-surface-hover disabled:opacity-50 transition-colors"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-accent text-white text-[15px] font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() => onExport(name)}
                disabled={!name.trim() || loading}
              >
                {loading ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
