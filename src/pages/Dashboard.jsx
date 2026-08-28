import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { LANGUAGES } from '../data/content'
import { CircularProgress, ProgressBar, Stat } from '../components/Primitives'
import {
  IconFlame, IconChart, IconBook, IconMic, IconCheck, IconArrowRight,
  IconClock, IconStar, IconSparkle, IconCalendar, IconTarget, IconChevronRight,
} from '../components/Icons'

function langOf(code) {
  return LANGUAGES.find((l) => l.code === code)
}

const weekly = [
  { d: '周一', m: 35, words: 12 },
  { d: '周二', m: 65, words: 28 },
  { d: '周三', m: 20, words: 8 },
  { d: '周四', m: 80, words: 35 },
  { d: '周五', m: 50, words: 22 },
  { d: '周六', m: 95, words: 41 },
  { d: '周日', m: 0, words: 0 },
]

const todayTasks = [
  { id: 1, title: '口语跟读 · 餐厅点餐对话', type: 'speaking', lang: 'en', done: false, time: '15 分钟' },
  { id: 2, title: '词汇复习 · 8 个待复习单词', type: 'word', lang: 'en', done: false, time: '10 分钟' },
  { id: 3, title: '语法练习 · 现在完成时', type: 'grammar', lang: 'en', done: true, time: '12 分钟' },
  { id: 4, title: '听力训练 · 机场广播', type: 'listening', lang: 'en', done: false, time: '10 分钟' },
]

const typeMap = {
  speaking: { label: '口语', color: 'text-rose-600 bg-rose-50', to: 'speaking' },
  word: { label: '词汇', color: 'text-brand-600 bg-brand-50', to: 'word' },
  grammar: { label: '语法', color: 'text-violet-600 bg-violet-50', to: 'grammar' },
  listening: { label: '听力', color: 'text-amber-600 bg-amber-50', to: 'listening' },
}

export default function Dashboard() {
  const { user, courses } = useApp()
  const myCourses = courses.filter((c) => user.enrolledCourses.includes(c.id))
  const hour = new Date().getHours()
  const greeting = hour < 6 ? '凌晨好' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const maxM = Math.max(...weekly.map((w) => w.m))
  const doneCount = todayTasks.filter((t) => t.done).length

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">{greeting}，{user.name} 👋</h1>
          <p className="text-sm text-ink-500 mt-1">坚持就是胜利，今天是连续学习第 {user.streak} 天</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="card px-4 py-2.5 flex items-center gap-2.5">
            <IconFlame size={20} className="text-rose-500" />
            <div>
              <div className="font-display text-base font-bold text-ink-900 leading-none">{user.streak} 天</div>
              <div className="text-[10px] text-ink-500 mt-0.5">连续打卡</div>
            </div>
          </div>
          <Link to="/app/courses" className="btn-primary btn-sm">继续学习 <IconArrowRight size={16} /></Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <Stat icon={<IconSparkle size={20} />} label="累计经验值" value={`${user.xp.toLocaleString()} XP`} />
          <ProgressBar value={user.xp} max={user.xpToNext} className="mt-3" />
          <div className="mt-1.5 text-[11px] text-ink-400">距 Lv.{user.level + 1} 还差 {user.xpToNext - user.xp} XP</div>
        </div>
        <div className="card p-5"><Stat icon={<IconBook size={20} />} label="已掌握单词" value={user.wordsMastered} accent="text-violet-600" /><div className="mt-3 text-[11px] text-ink-400">本周新增 38 个</div></div>
        <div className="card p-5"><Stat icon={<IconClock size={20} />} label="累计学习时长" value={`${Math.floor(user.totalMinutes / 60)}h`} accent="text-emerald-600" /><div className="mt-3 text-[11px] text-ink-400">本周 142 分钟</div></div>
        <div className="card p-5"><Stat icon={<IconTarget size={20} />} label="答题正确率" value={`${user.accuracy}%`} accent="text-amber-600" /><div className="mt-3 text-[11px] text-ink-400">语法 88% · 听力 95%</div></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900 flex items-center gap-2"><IconChart size={18} className="text-brand-600" /> 本周学习</h2>
                <p className="text-xs text-ink-500 mt-0.5">坚持每日打卡，保持学习节奏</p>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-extrabold text-brand-600">345<span className="text-sm font-medium text-ink-400"> 分钟</span></div>
                <div className="text-[11px] text-ink-500">较上周 +18%</div>
              </div>
            </div>
            <div className="flex items-end gap-2 sm:gap-3 h-44">
              {weekly.map((w, i) => (
                <div key={w.d} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-[10px] text-ink-500">{w.m || ''}</div>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand-200 to-brand-500 hover:from-brand-300 hover:to-brand-600 transition-colors relative group"
                      style={{ height: `${w.m ? (w.m / maxM) * 100 : 0}%`, minHeight: w.m ? '8px' : '0' }}
                    >
                      <div className="absolute inset-x-0 -top-7 hidden group-hover:grid place-items-center">
                        <span className="text-[10px] bg-ink-900 text-white rounded px-1.5 py-0.5">{w.m}分 / {w.words}词</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[11px] ${i === 6 ? 'text-brand-600 font-semibold' : 'text-ink-400'}`}>{w.d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* My courses */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-ink-900">学习中的课程</h2>
              <Link to="/app/courses" className="text-sm text-brand-600 font-medium hover:underline flex items-center gap-1">全部课程 <IconChevronRight size={14} /></Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {myCourses.map((c) => {
                const l = langOf(c.language)
                return (
                  <Link key={c.id} to={`/app/courses/${c.id}`} className="card-hover p-5 group block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-2xl grid place-items-center text-2xl shrink-0" style={{ background: `${l.color}15` }}>{l.flag}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="chip text-[10px] py-0.5" style={{ background: `${l.color}15`, color: l.color }}>{c.level.split(' ')[0]}</span>
                          </div>
                          <div className="font-semibold text-ink-900 text-sm mt-1 truncate">{c.title}</div>
                          <div className="text-[11px] text-ink-500">{c.lessons} 课时 · {c.lessonsData.filter((x) => x.done).length}/{c.lessonsData.length} 已完成</div>
                        </div>
                      </div>
                      <CircularProgress value={c.progress} size={52} stroke={5} color={l.color} />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <ProgressBar value={c.progress} barClass="rounded-full" height="h-1.5" />
                      <span className="ml-3 text-xs font-semibold text-brand-600 group-hover:translate-x-0.5 transition-transform">继续 →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Achievements mini */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-ink-900 flex items-center gap-2"><IconStar size={18} className="text-amber-500" /> 最新成就</h2>
              <Link to="/app/achievements" className="text-sm text-brand-600 font-medium hover:underline flex items-center gap-1">成就墙 <IconChevronRight size={14} /></Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {[
                { i: '🔥', t: '一周坚持' }, { i: '📚', t: '词汇达人' }, { i: '🎤', t: '口语新秀' },
                { i: '🌍', t: '多语学者' }, { i: '☀️', t: '晨读先锋' }, { i: '🎓', t: '课程毕业' },
              ].map((b) => (
                <div key={b.t} className="shrink-0 w-24 text-center">
                  <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 grid place-items-center text-3xl">{b.i}</div>
                  <div className="mt-1.5 text-[11px] font-medium text-ink-700">{b.t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Today's tasks */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-ink-900 flex items-center gap-2"><IconCalendar size={18} className="text-brand-600" /> 今日任务</h2>
              <span className="chip bg-brand-50 text-brand-700">{doneCount}/{todayTasks.length}</span>
            </div>
            <ProgressBar value={doneCount} max={todayTasks.length} className="mb-4" />
            <div className="space-y-2">
              {todayTasks.map((t) => {
                const tp = typeMap[t.type]
                const l = langOf(t.lang)
                return (
                  <Link
                    key={t.id}
                    to={`/app/learn/${tp.to}/${t.lang}`}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${t.done ? 'border-ink-100 bg-ink-50/50' : 'border-ink-200 hover:border-brand-300 hover:bg-brand-50/40'}`}
                  >
                    <div className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 ${tp.color}`}>
                      {t.type === 'speaking' ? <IconMic size={16} /> : t.type === 'word' ? <IconBook size={16} /> : t.type === 'grammar' ? <IconTarget size={16} /> : <IconChart size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${t.done ? 'text-ink-400 line-through' : 'text-ink-900'}`}>{t.title}</div>
                      <div className="text-[11px] text-ink-500 flex items-center gap-2 mt-0.5">
                        <span>{l.flag} {l.name}</span><span>·</span><span>{t.time}</span>
                      </div>
                    </div>
                    {t.done ? (
                      <span className="h-6 w-6 rounded-full bg-emerald-100 grid place-items-center"><IconCheck size={14} className="text-emerald-600" /></span>
                    ) : (
                      <IconChevronRight size={16} className="text-ink-400 shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
            <div className="mt-4 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 p-4 text-white">
              <div className="flex items-center gap-2 text-xs text-brand-100 mb-1"><IconSparkle size={14} /> 完成今日全部任务</div>
              <div className="font-display text-base font-bold">额外 +50 XP · 解锁徽章进度</div>
            </div>
          </div>

          {/* Recommended path */}
          <div className="card p-6 bg-gradient-to-br from-white to-violet-50/40">
            <h2 className="font-display text-lg font-bold text-ink-900 flex items-center gap-2 mb-1"><IconTarget size={18} className="text-violet-600" /> 个性化学习路径</h2>
            <p className="text-xs text-ink-500 mb-4">基于你的目标与水平智能生成</p>
            <div className="space-y-3">
              {[
                { w: '第 1 周', t: '发音基础与核心高频词', c: 'from-brand-500 to-brand-600' },
                { w: '第 2 周', t: '日常场景对话训练', c: 'from-violet-500 to-purple-600' },
                { w: '第 3 周', t: '中级语法与听力精练', c: 'from-rose-500 to-red-600' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${s.c} grid place-items-center text-white text-xs font-bold shrink-0`}>{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-[11px] text-ink-400">{s.w}</div>
                    <div className="text-sm font-medium text-ink-900">{s.t}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/app/path" className="mt-5 btn-secondary w-full text-sm">查看完整路径 <IconArrowRight size={14} /></Link>
          </div>
        </div>
      </div>
    </div>
  )
}
