import { useApp } from '../context/AppContext'
import { ACHIEVEMENTS } from '../data/content'
import { ProgressBar, CircularProgress } from '../components/Primitives'
import {
  IconTrophy, IconSparkle, IconFlame, IconBook, IconClock, IconCheck,
  IconLock, IconStar, IconUsers, IconMic, IconTarget, IconArrowRight,
} from '../components/Icons'
import { Link } from 'react-router-dom'

const rarity = [
  { tier: 'common', label: '普通', color: '#64748b', glow: 'from-ink-100 to-ink-200' },
  { tier: 'rare', label: '稀有', color: '#4f46e5', glow: 'from-brand-100 to-brand-200' },
  { tier: 'epic', label: '史诗', color: '#9333ea', glow: 'from-violet-100 to-purple-200' },
  { tier: 'legend', label: '传说', color: '#e11d48', glow: 'from-rose-100 to-amber-200' },
]

const badgeTiers = ['common', 'rare', 'epic', 'epic', 'rare', 'legend', 'rare', 'rare', 'common', 'common', 'epic', 'rare']

export default function Achievements() {
  const { user } = useApp()
  const unlocked = ACHIEVEMENTS.filter((a) => user.achievements.includes(a.id) || a.unlocked)
  const locked = ACHIEVEMENTS.filter((a) => !user.achievements.includes(a.id) && !a.unlocked)
  const xpPct = Math.round((user.xp / user.xpToNext) * 100)

  const stats = [
    { icon: IconFlame, label: '连续打卡', value: `${user.streak} 天`, color: 'text-rose-500 bg-rose-50' },
    { icon: IconBook, label: '掌握单词', value: user.wordsMastered, color: 'text-violet-600 bg-violet-50' },
    { icon: IconClock, label: '学习时长', value: `${Math.floor(user.totalMinutes / 60)}h`, color: 'text-emerald-600 bg-emerald-50' },
    { icon: IconCheck, label: '完成课程', value: user.lessonsDone, color: 'text-brand-600 bg-brand-50' },
  ]

  const recentBadges = unlocked.slice(-3)

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
      {/* Hero level card */}
      <div className="relative overflow-hidden rounded-[1.5rem] mb-6" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #e11d48)' }}>
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative p-6 lg:p-8 text-white grid lg:grid-cols-[auto_1fr_auto] gap-6 items-center">
          {/* Level ring */}
          <div className="relative">
            <svg width="120" height="120" className="-rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - xpPct / 100)} />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-xs text-white/70">等级</div>
                <div className="font-display text-4xl font-extrabold leading-none">{user.level}</div>
              </div>
            </div>
          </div>
          {/* Info */}
          <div>
            <div className="text-xs text-white/70">学者 · Lv.{user.level}</div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold mt-0.5">{user.name} 的成就墙</h1>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="chip bg-white/15 text-white border border-white/20"><IconSparkle size={13} /> {user.xp.toLocaleString()} XP</span>
              <span className="chip bg-white/15 text-white border border-white/20"><IconTrophy size={13} /> {unlocked.length} 枚徽章</span>
            </div>
            <div className="mt-3 text-xs text-white/80">距离 Lv.{user.level + 1} 还差 {user.xpToNext - user.xp} XP</div>
          </div>
          {/* Recent */}
          <div className="hidden lg:flex flex-col gap-2">
            <div className="text-xs text-white/70 mb-1">近期解锁</div>
            {recentBadges.length > 0 ? (
              <div className="flex gap-2">
                {recentBadges.map((b) => (
                  <div key={b.id} className="h-12 w-12 rounded-xl bg-white/15 grid place-items-center text-2xl border border-white/20" title={b.title}>{b.icon}</div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-white/60">暂无</div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`h-10 w-10 rounded-xl grid place-items-center ${s.color}`}><s.icon size={20} /></div>
            <div className="font-display text-2xl font-extrabold text-ink-900 mt-3">{s.value}</div>
            <div className="text-xs text-ink-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Badges grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-ink-900 flex items-center gap-2"><IconTrophy size={18} className="text-amber-500" /> 徽章收藏</h2>
            <span className="text-sm text-ink-500">{unlocked.length} / {ACHIEVEMENTS.length} 已解锁</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {ACHIEVEMENTS.map((a, i) => {
              const isUnlocked = user.achievements.includes(a.id) || a.unlocked
              const tier = rarity[(['common', 'rare', 'epic', 'legend'].indexOf(badgeTiers[i]) === -1 ? 0 : ['common', 'rare', 'epic', 'legend'].indexOf(badgeTiers[i]))] || rarity[0]
              const progPct = a.total ? Math.round((a.progress / a.total) * 100) : a.progress
              return (
                <div key={a.id} className={`card p-5 text-center relative overflow-hidden transition-all ${isUnlocked ? 'hover:shadow-card-hover' : 'opacity-80'}`}>
                  {isUnlocked && <div className={`absolute inset-0 bg-gradient-to-br ${tier.glow} opacity-50`} />}
                  <div className="relative">
                    <div className={`mx-auto h-20 w-20 rounded-2xl grid place-items-center text-4xl ${isUnlocked ? 'bg-white shadow-sm' : 'bg-ink-100'}`}>
                      {isUnlocked ? a.icon : <IconLock size={28} className="text-ink-400" />}
                    </div>
                    {isUnlocked && (
                      <div className="absolute top-0 right-0 chip text-[9px] px-1.5 py-0.5" style={{ background: tier.color, color: 'white' }}>{tier.label}</div>
                    )}
                    <div className="mt-3 font-display text-sm font-bold text-ink-900">{a.title}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5 leading-snug">{a.desc}</div>
                    {!isUnlocked && (
                      <div className="mt-2">
                        <ProgressBar value={a.progress} max={a.total || 100} height="h-1.5" />
                        <div className="text-[10px] text-ink-400 mt-1">{a.total ? `${a.progress}/${a.total}` : `${a.progress}%`}</div>
                      </div>
                    )}
                    {isUnlocked && (
                      <div className="mt-2 text-[10px] font-semibold text-emerald-600 flex items-center justify-center gap-1"><IconCheck size={11} /> 已解锁</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side */}
        <aside className="space-y-5">
          {/* Leaderboard */}
          <div className="card p-5">
            <h3 className="font-display text-sm font-bold text-ink-900 mb-4 flex items-center gap-2"><IconUsers size={16} className="text-brand-600" /> 本周学习榜</h3>
            <div className="space-y-2.5">
              {[
                { rank: 1, name: '佐藤美咲', avatar: '🐰', xp: 3280, lang: 'en' },
                { rank: 2, name: '林小染', avatar: '🦊', xp: 2940, lang: 'ja' },
                { rank: 3, name: 'Alex Chen', avatar: '🐼', xp: 2610, lang: 'ko' },
                { rank: 4, name: user.name, avatar: user.avatar, xp: user.xp, lang: 'en', me: true },
              ].map((p) => (
                <div key={p.rank} className={`flex items-center gap-3 p-2 rounded-lg ${p.me ? 'bg-brand-50' : ''}`}>
                  <span className={`text-sm font-bold w-5 text-center ${p.rank <= 3 ? 'text-amber-500' : 'text-ink-400'}`}>{p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : p.rank}</span>
                  <div className="h-8 w-8 rounded-full bg-ink-100 grid place-items-center text-base">{p.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-900 truncate">{p.name}{p.me && <span className="text-brand-600 text-[10px] ml-1">(你)</span>}</div>
                    <div className="text-[11px] text-ink-500">{p.xp.toLocaleString()} XP</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily challenge */}
          <div className="card p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
            <div className="flex items-center gap-2 text-amber-700 mb-2"><IconTarget size={16} /><span className="text-sm font-bold">每日挑战</span></div>
            <p className="text-sm text-ink-700">完成 3 节任意课程，解锁额外 50 XP</p>
            <ProgressBar value={1} max={3} className="mt-3" barClass="bg-amber-500" />
            <div className="mt-1.5 flex justify-between text-[11px] text-ink-500"><span>1 / 3</span><span>剩余 2 节</span></div>
            <Link to="/app/courses" className="mt-3 btn-secondary btn-sm w-full">去完成 <IconArrowRight size={14} /></Link>
          </div>

          {/* Streak calendar */}
          <div className="card p-5">
            <h3 className="font-display text-sm font-bold text-ink-900 mb-3 flex items-center gap-2"><IconFlame size={16} className="text-rose-500" /> 连续打卡</h3>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 14 }, (_, i) => {
                const done = i < 12 || (i === 13 && Math.random() > 0.5)
                const today = i === 12
                return (
                  <div key={i} className={`aspect-square rounded-lg grid place-items-center text-[10px] ${done ? 'bg-rose-100 text-rose-600' : 'bg-ink-50 text-ink-300'} ${today ? 'ring-2 ring-rose-400' : ''}`}>
                    {done ? '🔥' : i + 1}
                  </div>
                )
              })}
            </div>
            <div className="mt-3 text-xs text-ink-500">已连续 <b className="text-rose-500">{user.streak}</b> 天，继续加油！</div>
          </div>
        </aside>
      </div>
    </div>
  )
}
