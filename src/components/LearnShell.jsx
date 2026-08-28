import { Link } from 'react-router-dom'
import { ProgressBar } from './Primitives'
import { IconX, IconSparkle, IconFlame } from './Icons'
import { useApp } from '../context/AppContext'

export default function LearnShell({ title, lang, total, current, xp, onClose, children }) {
  const { user } = useApp()
  return (
    <div className="min-h-full flex flex-col bg-ink-50/50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-ink-100 flex items-center gap-4 px-4 lg:px-8 sticky top-0 z-10">
        <Link to={onClose} className="h-9 w-9 rounded-lg grid place-items-center text-ink-500 hover:bg-ink-100" aria-label="close">
          <IconX size={20} />
        </Link>
        <div className="hidden sm:flex items-center gap-2 text-sm text-ink-500">
          <span className="font-medium text-ink-900">{title}</span>
        </div>
        <div className="flex-1 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <ProgressBar value={current} max={total} height="h-2" />
            <span className="text-xs font-semibold text-ink-600 shrink-0">{current}/{total}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {xp > 0 && (
            <div className="chip bg-amber-50 text-amber-700 border border-amber-100">
              <IconSparkle size={13} /> +{xp}
            </div>
          )}
          {user && (
            <div className="chip bg-rose-50 text-rose-600 border border-rose-100">
              <IconFlame size={13} /> {user.streak}
            </div>
          )}
        </div>
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  )
}
