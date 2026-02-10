import { useState } from 'react'

interface Props {
  onGenerate: (prompt: string) => void
  onChangeKeys: () => void
  loading: boolean
  sessionPrompt?: string
  onResume?: () => void
}

export function PromptScreen({ onGenerate, onChangeKeys, loading, sessionPrompt, onResume }: Props) {
  const [prompt, setPrompt] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || loading) return
    onGenerate(prompt.trim())
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80dvh]">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">What kind of playlist?</h1>
        <p className="text-text-secondary mb-6">Describe the vibe, mood, genre, or occasion.</p>

        {sessionPrompt && onResume && (
          <div className="mb-5 p-4 bg-surface border border-border rounded-lg">
            <p className="text-sm text-text-secondary mb-1">You have an in-progress playlist</p>
            <p className="text-sm font-medium text-text-primary mb-3 truncate">"{sessionPrompt}"</p>
            <button
              type="button"
              onClick={onResume}
              disabled={loading}
              className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Resuming...' : 'Resume'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <textarea
            placeholder="e.g. chill lo-fi beats for studying, upbeat 90s road trip, melancholy indie folk for rainy days..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            disabled={loading}
            className="w-full px-3.5 py-3 bg-surface border border-border rounded-lg text-text-primary text-[15px] font-[inherit] outline-none focus:border-accent transition-colors resize-y min-h-[100px] disabled:opacity-50"
          />

          <button
            type="submit"
            className="w-full mt-2 px-6 py-3 bg-accent text-white text-[15px] font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={!prompt.trim() || loading}
          >
            {loading ? 'Generating...' : 'Generate Playlist'}
          </button>
        </form>

        <button
          className="bg-transparent border-none text-text-secondary text-sm cursor-pointer py-2 mt-4 hover:text-text-primary transition-colors"
          onClick={onChangeKeys}
        >
          Change API keys
        </button>
      </div>
    </div>
  )
}
