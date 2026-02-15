import { type Theme, resolveTheme } from '../lib/theme'

interface Props {
  theme: Theme
  onChange: (theme: Theme) => void
}

const CYCLE: Theme[] = ['system', 'light', 'dark']

export function ThemeToggle({ theme, onChange }: Props) {
  const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]
  const resolved = resolveTheme(theme)

  return (
    <button
      onClick={() => onChange(next)}
      className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer bg-transparent border-none text-base"
      title={`Theme: ${theme} (click for ${next})`}
    >
      {resolved === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
