// Progress bar
export function ProgressBar({ value = 0, max = 100, className = '', barClass = 'bg-brand-600', height = 'h-2' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className={`w-full ${height} rounded-full bg-ink-100 overflow-hidden ${className}`}>
      <div
        className={`h-full ${barClass} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// Circular progress ring
export function CircularProgress({ value = 0, size = 64, stroke = 6, color = '#4f46e5', track = '#e2e8f0', label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value))
  const offset = c - (pct / 100) * c
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-display text-sm font-bold text-ink-900">{label ?? `${Math.round(pct)}%`}</span>
    </div>
  )
}

// Avatar
export function Avatar({ emoji = '🦊', size = 40, ring = false }) {
  const s = size
  return (
    <div
      className={`${ring ? 'ring-2 ring-brand-200 ring-offset-2' : ''} rounded-full bg-gradient-to-br from-brand-100 to-brand-50 grid place-items-center shrink-0`}
      style={{ width: s, height: s }}
    >
      <span style={{ fontSize: s * 0.5 }}>{emoji}</span>
    </div>
  )
}

// Language badge
export function LangBadge({ code }) {
  const map = {
    en: { label: '英语', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
    ja: { label: '日语', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    ko: { label: '韩语', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  }
  const m = map[code] || map.en
  return <span className={`chip border ${m.cls}`}>{m.label}</span>
}

// Stat tile
export function Stat({ icon, label, value, accent = 'text-brand-600' }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl bg-ink-50 grid place-items-center ${accent}`}>{icon}</div>
      <div>
        <div className="font-display text-lg font-bold text-ink-900 leading-none">{value}</div>
        <div className="text-xs text-ink-500 mt-1">{label}</div>
      </div>
    </div>
  )
}
