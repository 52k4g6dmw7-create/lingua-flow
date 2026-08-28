import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { LANGUAGES, LEVELS } from '../data/content'
import { ProgressBar, LangBadge } from '../components/Primitives'
import { IconStar, IconUsers, IconClock, IconBook, IconCheck, IconSearch } from '../components/Icons'

function langOf(code) {
  return LANGUAGES.find((l) => l.code === code)
}

export default function Courses() {
  const { courses, user, enrollCourse } = useApp()
  const [lang, setLang] = useState('all')
  const [level, setLevel] = useState('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (lang !== 'all' && c.language !== lang) return false
      if (level !== 'all' && !c.level.includes(level)) return false
      if (query && !c.title.includes(query) && !c.subtitle.includes(query)) return false
      return true
    })
  }, [courses, lang, level, query])

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">课程中心</h1>
        <p className="text-sm text-ink-500 mt-1">与国际标准对齐的分级课程，覆盖英语、日语、韩语，{courses.length} 门精选课程任你选。</p>
      </div>

      {/* Language filter cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setLang('all')}
          className={`rounded-2xl border-2 p-4 text-left transition-all ${lang === 'all' ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-300'}`}
        >
          <div className="text-2xl">🌐</div>
          <div className="mt-1.5 text-sm font-semibold text-ink-900">全部语种</div>
          <div className="text-[11px] text-ink-500">{courses.length} 门课程</div>
        </button>
        {LANGUAGES.map((l) => {
          const count = courses.filter((c) => c.language === l.code).length
          return (
            <button
              key={l.code}
              onClick={() => setLang(lang === l.code ? 'all' : l.code)}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${lang === l.code ? 'bg-white' : 'bg-white hover:border-ink-300'}`}
              style={lang === l.code ? { borderColor: l.color, background: `${l.color}08` } : { borderColor: '' }}
            >
              <div className="text-2xl">{l.flag}</div>
              <div className="mt-1.5 text-sm font-semibold text-ink-900">{l.name}</div>
              <div className="text-[11px] text-ink-500">{count} 门课程</div>
            </button>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-6 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-11"
            placeholder="搜索课程名称…"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setLevel('all')}
            className={`chip border cursor-pointer ${level === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-600 border-ink-200 hover:border-brand-300'}`}
          >全部</button>
          {['A1', 'A2', 'B1', 'B2', 'C1'].map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(level === lv ? 'all' : lv)}
              className={`chip border cursor-pointer ${level === lv ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-600 border-ink-200 hover:border-brand-300'}`}
            >{lv}</button>
          ))}
        </div>
      </div>

      {/* Course grid */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl">🔍</div>
          <p className="mt-4 text-ink-500">没有找到匹配的课程</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c, i) => {
            const l = langOf(c.language)
            const enrolled = user.enrolledCourses.includes(c.id)
            return (
              <div key={c.id} className="card-hover overflow-hidden flex flex-col animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Banner */}
                <div className="h-28 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${l.color}, ${l.color}cc)` }}>
                  <div className="absolute inset-0 grid-bg opacity-20" />
                  <div className="absolute inset-0 flex items-center justify-between px-5">
                    <div>
                      <div className="text-white/80 text-xs font-medium">{l.englishName}</div>
                      <div className="font-display text-white text-lg font-bold mt-0.5">{c.level}</div>
                    </div>
                    <div className="text-5xl drop-shadow-lg">{l.flag}</div>
                  </div>
                  {c.progress === 100 && (
                    <div className="absolute top-3 right-3 chip bg-white/90 text-emerald-600 text-[10px]"><IconCheck size={11} /> 已完成</div>
                  )}
                  {enrolled && c.progress > 0 && c.progress < 100 && (
                    <div className="absolute top-3 right-3 chip bg-white/90 text-brand-600 text-[10px]">学习中</div>
                  )}
                </div>
                {/* Body */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-display text-base font-bold text-ink-900">{c.title}</h3>
                  <p className="text-xs text-ink-500 mt-0.5">{c.subtitle}</p>
                  <p className="mt-2 text-xs text-ink-600 leading-relaxed line-clamp-2">{c.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.skills.map((s) => (
                      <span key={s} className="chip bg-ink-50 text-ink-500 text-[10px] py-0.5">{s}</span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-ink-500">
                    <span className="flex items-center gap-1"><IconBook size={13} />{c.lessons} 课时</span>
                    <span className="flex items-center gap-1"><IconClock size={13} />{c.hours}h</span>
                    <span className="flex items-center gap-1"><IconUsers size={13} />{(c.students / 10000).toFixed(1)}万</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <span className="flex items-center gap-0.5 text-amber-400">{[...Array(5)].map((_, i) => <IconStar key={i} size={12} className="fill-amber-400" />)}</span>
                    <span className="text-ink-700 font-semibold">{c.rating}</span>
                  </div>

                  {enrolled && c.progress > 0 && c.progress < 100 && (
                    <div className="mt-3">
                      <ProgressBar value={c.progress} height="h-1.5" />
                      <div className="mt-1 text-[11px] text-ink-400">已完成 {c.progress}%</div>
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className="px-5 pb-5">
                  {enrolled ? (
                    <Link to={`/app/courses/${c.id}`} className="btn-primary btn-sm w-full">继续学习</Link>
                  ) : (
                    <button
                      onClick={() => enrollCourse(c.id)}
                      className="btn-secondary btn-sm w-full"
                    >加入学习</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
