import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'
import { Avatar } from '../components/Primitives'
import { IconHome, IconBook, IconPath, IconUsers, IconTrophy, IconSettings, IconLogout, IconBell, IconSearch, IconFlame } from '../components/Icons'
import { useApp } from '../context/AppContext'
import { useEffect, useState } from 'react'

const nav = [
  { to: '/app', label: '学习首页', icon: IconHome, end: true },
  { to: '/app/courses', label: '课程中心', icon: IconBook },
  { to: '/app/path', label: '学习路径', icon: IconPath },
  { to: '/app/community', label: '学习社区', icon: IconUsers },
  { to: '/app/achievements', label: '成就墙', icon: IconTrophy },
]

export default function AppLayout({ children }) {
  const { user, logout } = useApp()
  const navigate = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [loc.pathname])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const xpPct = user ? Math.round((user.xp / user.xpToNext) * 100) : 0

  return (
    <div className="min-h-screen bg-ink-50/60 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-[260px] shrink-0 bg-white border-r border-ink-200/70 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center px-5 border-b border-ink-100">
          <Logo size="sm" to="/app" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        {user && (
          <div className="px-3 pb-4">
            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Avatar emoji={user.avatar} size={40} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{user.name}</div>
                  <div className="text-xs text-brand-100">Lv.{user.level} · {user.xp} XP</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${xpPct}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-brand-100">
                <span>距下一级 {user.xpToNext - user.xp} XP</span>
                <span className="flex items-center gap-1"><IconFlame size={12} />{user.streak}天</span>
              </div>
            </div>
          </div>
        )}

        <div className="px-3 pb-4 space-y-1 border-t border-ink-100 pt-3">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-900 transition-all">
            <IconLogout size={20} />
            退出登录
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-ink-900/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-ink-100 flex items-center gap-4 px-4 lg:px-8">
          <button
            className="lg:hidden h-9 w-9 rounded-lg grid place-items-center text-ink-600 hover:bg-ink-100"
            onClick={() => setOpen((v) => !v)}
            aria-label="menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="hidden md:flex items-center gap-2 h-9 flex-1 max-w-md rounded-xl border border-ink-200 bg-ink-50 px-3.5 text-sm text-ink-400">
            <IconSearch size={16} />
            <span>搜索课程、单词、语法…</span>
          </div>
          <div className="flex-1 md:hidden" />
          <button className="relative h-9 w-9 rounded-lg grid place-items-center text-ink-600 hover:bg-ink-100">
            <IconBell size={20} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
          </button>
          {user && (
            <div className="flex items-center gap-2.5">
              <Avatar emoji={user.avatar} size={36} ring />
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-ink-900 leading-none">{user.name}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">Lv.{user.level}</div>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
