import { Link } from 'react-router-dom'

export default function Logo({ size = 'md', light = false, to = '/' }) {
  const dims = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'
  const text = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  return (
    <Link to={to} className="flex items-center gap-2.5 group">
      <div className={`${dims} rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center shadow-sm group-hover:shadow-card-hover transition-all`}>
        <svg viewBox="0 0 64 64" className="h-3/5 w-3/5" fill="none" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 44 L32 18 L44 44 M24.5 36 L39.5 36" />
        </svg>
      </div>
      <span className={`font-display ${text} font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink-900'}`}>
        Lingua<span className="text-brand-600">Flow</span>
      </span>
    </Link>
  )
}
