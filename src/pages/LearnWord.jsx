import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { WORDS, LANGUAGES } from '../data/content'
import LearnShell from '../components/LearnShell'
import { useApp } from '../context/AppContext'
import {
  IconSpeaker, IconCheck, IconX, IconArrowRight, IconRefresh,
  IconSparkle, IconBook, IconChevronRight,
} from '../components/Icons'

function langOf(code) {
  return LANGUAGES.find((l) => l.code === code)
}

export default function LearnWord() {
  const { lang } = useParams()
  const { addXp } = useApp()
  const list = WORDS[lang] || WORDS.en
  const l = langOf(lang)

  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([]) // 'known' | 'fuzzy' | 'unknown'
  const [done, setDone] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const word = list[idx]
  const total = list.length
  const known = results.filter((r) => r === 'known').length

  const speak = () => {
    setSpeaking(true)
    try {
      const u = new SpeechSynthesisUtterance(word.word)
      u.lang = lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : 'en-US'
      u.rate = 0.9
      u.onend = () => setSpeaking(false)
      window.speechSynthesis.speak(u)
    } catch {
      setTimeout(() => setSpeaking(false), 800)
    }
  }

  const grade = (level) => {
    const next = [...results, level]
    setResults(next)
    const xp = level === 'known' ? 10 : level === 'fuzzy' ? 5 : 3
    addXp(xp)
    if (idx + 1 < total) {
      setIdx(idx + 1)
      setFlipped(false)
    } else {
      setDone(true)
    }
  }

  const restart = () => {
    setIdx(0); setFlipped(false); setResults([]); setDone(false)
  }

  if (done) {
    return (
      <LearnShell title="单词记忆" lang={lang} total={total} current={total} xp={known * 10} onClose="/app/courses">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card p-10 max-w-md w-full text-center animate-pop-in">
            <div className="text-6xl">🎉</div>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-ink-900">本组单词学完！</h2>
            <p className="mt-2 text-ink-500">你掌握了 {known} / {total} 个单词，继续加油！</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-emerald-50 p-3"><div className="font-display text-xl font-bold text-emerald-600">{results.filter((r) => r === 'known').length}</div><div className="text-[11px] text-ink-500">认识</div></div>
              <div className="rounded-xl bg-amber-50 p-3"><div className="font-display text-xl font-bold text-amber-600">{results.filter((r) => r === 'fuzzy').length}</div><div className="text-[11px] text-ink-500">模糊</div></div>
              <div className="rounded-xl bg-rose-50 p-3"><div className="font-display text-xl font-bold text-rose-600">{results.filter((r) => r === 'unknown').length}</div><div className="text-[11px] text-ink-500">不认识</div></div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={restart} className="btn-secondary flex-1"><IconRefresh size={16} /> 再练一组</button>
              <Link to="/app" className="btn-primary flex-1">返回首页 <IconArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </LearnShell>
    )
  }

  return (
    <LearnShell title="单词记忆" lang={lang} total={total} current={idx + 1} xp={known * 10} onClose="/app/courses">
      <div className="flex-1 grid lg:grid-cols-[1fr_300px] gap-0">
        {/* Card area */}
        <div className="flex flex-col items-center justify-center p-6 lg:p-10">
          <button
            onClick={() => setFlipped((v) => !v)}
            className="w-full max-w-xl card p-8 lg:p-12 text-center cursor-pointer hover:shadow-card-hover transition-all relative group"
            style={{ minHeight: '320px' }}
          >
            <div className="absolute top-4 right-4 chip bg-ink-50 text-ink-500 text-[10px]">{word.pos}</div>
            <div className="absolute top-4 left-4 text-xs text-ink-400">点击翻卡</div>

            {!flipped ? (
              <div className="animate-fade-in">
                <div className="text-xs text-ink-400 mb-3">{l.flag} {l.name} · 单词</div>
                <h2 className="font-display text-4xl lg:text-5xl font-extrabold text-ink-900">{word.word}</h2>
                <div className="mt-3 text-ink-500 text-lg">{word.phon}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); speak() }}
                  className={`mt-5 h-12 w-12 rounded-full grid place-items-center text-white transition-all ${speaking ? 'bg-brand-400 scale-110' : 'bg-brand-600 hover:bg-brand-700'}`}
                >
                  <IconSpeaker size={22} />
                </button>
                <div className="mt-2 text-xs text-ink-400">{speaking ? '播放中…' : '点击听发音'}</div>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="text-xs text-ink-400 mb-2">释义</div>
                <div className="font-display text-2xl font-bold text-brand-600">{word.meaning}</div>
                <div className="mt-5 pt-5 border-t border-ink-100 text-left">
                  <div className="text-xs text-ink-400 mb-1">例句</div>
                  <p className="text-ink-800 text-base font-medium">{word.example}</p>
                  <p className="mt-1.5 text-ink-500 text-sm">{word.trans}</p>
                </div>
              </div>
            )}
          </button>

          {/* Grading buttons */}
          <div className="mt-6 w-full max-w-xl grid grid-cols-3 gap-3">
            <button onClick={() => grade('unknown')} className="rounded-xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 p-3.5 transition-all group">
              <div className="flex items-center justify-center gap-1.5 text-rose-600 font-semibold text-sm">
                <IconX size={16} /> 不认识
              </div>
              <div className="text-[10px] text-rose-400 mt-1">稍后复习 · +3 XP</div>
            </button>
            <button onClick={() => grade('fuzzy')} className="rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 p-3.5 transition-all">
              <div className="flex items-center justify-center gap-1.5 text-amber-600 font-semibold text-sm">
                ～ 模糊
              </div>
              <div className="text-[10px] text-amber-400 mt-1">再练一次 · +5 XP</div>
            </button>
            <button onClick={() => grade('known')} className="rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 p-3.5 transition-all">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-semibold text-sm">
                <IconCheck size={16} /> 认识
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">已掌握 · +10 XP</div>
            </button>
          </div>
        </div>

        {/* Side stats */}
        <aside className="border-l border-ink-100 bg-white p-6 hidden lg:block">
          <h3 className="font-display text-sm font-bold text-ink-900 mb-4">学习统计</h3>
          <div className="space-y-3">
            <div className="rounded-xl bg-brand-50 p-3.5">
              <div className="flex items-center gap-2 text-brand-700 text-xs font-medium"><IconSparkle size={14} /> 今日已得</div>
              <div className="font-display text-2xl font-extrabold text-brand-600 mt-1">{known * 10} XP</div>
            </div>
            <div className="rounded-xl bg-ink-50 p-3.5">
              <div className="flex items-center gap-2 text-ink-500 text-xs font-medium"><IconBook size={14} /> 本组进度</div>
              <div className="font-display text-lg font-bold text-ink-900 mt-1">{idx + 1} / {total}</div>
            </div>
            <div className="rounded-xl bg-ink-50 p-3.5">
              <div className="text-xs text-ink-500 font-medium mb-2">记忆曲线</div>
              <div className="flex items-end gap-1 h-12">
                {[30, 55, 75, 40, 60, 80, 50].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand-200 to-brand-500" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="mt-1 text-[10px] text-ink-400">基于艾宾浩斯遗忘曲线</div>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-ink-100">
            <div className="text-xs text-ink-500 mb-2">复习建议</div>
            <p className="text-xs text-ink-600 leading-relaxed">对"模糊"和"不认识"的单词，建议明天再练一组加深记忆。</p>
          </div>
          <Link to="/app/learn/grammar/en" className="mt-5 btn-secondary w-full text-sm justify-between">
            下一步：语法练习 <IconChevronRight size={14} />
          </Link>
        </aside>
      </div>
    </LearnShell>
  )
}
