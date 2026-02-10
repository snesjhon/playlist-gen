import { useState } from 'react'
import { setClaudeApiKey, setAppleMusicToken, getClaudeApiKey, getAppleMusicToken } from '../lib/storage'
import { testClaudeKey } from '../lib/claude'
import { testMusicToken } from '../lib/musickit'

type FieldStatus = 'idle' | 'testing' | 'valid' | 'invalid'

interface Props {
  onComplete: () => void
}

export function SetupScreen({ onComplete }: Props) {
  const [claudeKey, setClaudeKey] = useState(getClaudeApiKey() ?? '')
  const [musicToken, setMusicToken] = useState(getAppleMusicToken() ?? '')
  const [claudeStatus, setClaudeStatus] = useState<FieldStatus>('idle')
  const [musicStatus, setMusicStatus] = useState<FieldStatus>('idle')
  const [claudeError, setClaudeError] = useState('')
  const [musicError, setMusicError] = useState('')
  const [validating, setValidating] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!claudeKey.trim() || !musicToken.trim()) {
      if (!claudeKey.trim()) { setClaudeStatus('invalid'); setClaudeError('Required') }
      if (!musicToken.trim()) { setMusicStatus('invalid'); setMusicError('Required') }
      return
    }

    setValidating(true)
    setClaudeStatus('testing')
    setMusicStatus('testing')
    setClaudeError('')
    setMusicError('')

    const results = await Promise.allSettled([
      testClaudeKey(claudeKey.trim()),
      testMusicToken(musicToken.trim()),
    ])

    const claudeOk = results[0].status === 'fulfilled'
    const musicOk = results[1].status === 'fulfilled'

    setClaudeStatus(claudeOk ? 'valid' : 'invalid')
    setMusicStatus(musicOk ? 'valid' : 'invalid')

    if (!claudeOk) {
      setClaudeError(results[0].status === 'rejected' ? (results[0].reason as Error).message : 'Validation failed')
    }
    if (!musicOk) {
      setMusicError(results[1].status === 'rejected' ? (results[1].reason as Error).message : 'Validation failed')
    }

    setValidating(false)

    if (claudeOk && musicOk) {
      setClaudeApiKey(claudeKey.trim())
      setAppleMusicToken(musicToken.trim())
      onComplete()
    }
  }

  function statusIndicator(status: FieldStatus) {
    if (status === 'testing') return <span className="inline-block ml-2 w-3 h-3 border-2 border-text-secondary border-t-transparent rounded-full animate-[spin_0.6s_linear_infinite] align-middle" />
    if (status === 'valid') return <span className="inline-block ml-2 text-sm font-bold text-green">&#10003;</span>
    if (status === 'invalid') return <span className="inline-block ml-2 text-sm font-bold text-red">&#10005;</span>
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80dvh]">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Playlist Generator</h1>
        <p className="text-text-secondary mb-6">
          Enter your API keys to get started. Keys are stored locally in your browser.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="claude-key" className="block text-sm font-medium mb-1.5">
              Claude API Key
              {statusIndicator(claudeStatus)}
            </label>
            <input
              id="claude-key"
              type="password"
              placeholder="sk-ant-..."
              value={claudeKey}
              onChange={(e) => { setClaudeKey(e.target.value); setClaudeStatus('idle'); setClaudeError('') }}
              autoComplete="off"
              disabled={validating}
              className="w-full px-3.5 py-3 bg-surface border border-border rounded-lg text-text-primary text-[15px] outline-none focus:border-accent transition-colors disabled:opacity-50"
            />
            <span className="block text-xs text-text-secondary mt-1">
              Get yours at{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                console.anthropic.com
              </a>
            </span>
            {claudeError && <p className="text-red text-sm mt-1">{claudeError}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="music-token" className="block text-sm font-medium mb-1.5">
              Apple Music Developer Token
              {statusIndicator(musicStatus)}
            </label>
            <input
              id="music-token"
              type="password"
              placeholder="eyJ..."
              value={musicToken}
              onChange={(e) => { setMusicToken(e.target.value); setMusicStatus('idle'); setMusicError('') }}
              autoComplete="off"
              disabled={validating}
              className="w-full px-3.5 py-3 bg-surface border border-border rounded-lg text-text-primary text-[15px] outline-none focus:border-accent transition-colors disabled:opacity-50"
            />
            <span className="block text-xs text-text-secondary mt-1">JWT signed with your MusicKit private key</span>
            {musicError && <p className="text-red text-sm mt-1">{musicError}</p>}
          </div>

          <button
            type="submit"
            className="w-full mt-2 px-6 py-3 bg-accent text-white text-[15px] font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={validating}
          >
            {validating ? 'Validating keys...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  )
}
