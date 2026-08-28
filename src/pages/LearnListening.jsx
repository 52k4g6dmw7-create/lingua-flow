import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LISTENING, LANGUAGES } from '../data/content'
import LearnShell from '../components/LearnShell'
import { useApp } from '../context/AppContext'
import {
  IconSpeaker, IconArrowRight, IconRefresh, IconCheck, IconX,
  IconChevronRight, IconChart,
} from '../components/Icons'

function langOf(code) {
  return LANGUAGES.find((l) => l.code === code)
}

export default function LearnListening() {
  const { lang } = useParams()
  const { addXp } = useApp()
  const list = LISTENING[lang] || LISTENING.en
  const l = langOf(lang)

  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showTrans, setShowTrans] = useState(false)
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef(null)

  const passage = list[idx]
  const questions = passage?.questions || []
  const total = list.length

  const play = () => {
    setPlaying(true)
    setProgress(0)
    try {
      const u = new SpeechSynthesisUtterance(passage.audioText)
      u.lang = lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : 'en-US'
      u.rate = 0.9
      window.speechSynthesis.speak(u)
    } catch { /* noop */ }
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timerRef.current)
          setPlaying(false)
          return 100
        }
        return p + 4
      })
    }, 120)
  }

  useEffect(() => () => { clearInterval(timerRef.current); window.speechSynthesis?.cancel() }, [])

  const choose = (i) => {
    if (answered) return
    setSelected(i)
    setAnswered(true)
    if (i === questions[qIdx].answer) {
      setCorrect((c) => c + 1)
      addXp(15)
    } else {
      addXp(5)
    }
  }

  const nextQ = () => {
    if (qIdx + 1 < questions.length) {
      setQIdx(qIdx + 1); setSelected(null); setAnswered(false)
    } else {
      // passage done
      if (idx + 1 < total) {
        setIdx(idx + 1); setQIdx(0); setSelected(null); setAnswered(false)
        setShowTrans(false); setProgress(0)
      } else {
        setDone(true)
      }
    }
  }

  const restart = () => {
    setIdx(0); setQIdx(0); setSelected(null); setAnswered(false); setCorrect(0); setDone(false); setShowTrans(false); setProgress(0)
  }

  if (done) {
    return (
      <LearnShell title="听力训练" lang={lang} total={questions.length} current={questions.length} xp={correct * 15} onClose="/app/courses">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card p-10 max-w-md w-full text-center animate-pop-in">
            <div className="text-6xl">🎧</div>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-ink-900">听力训练完成！</h2>
            <p className="mt-2 text-ink-500">答对 {correct} / {questions.length} 题</p>
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5">
              <div className="text-xs text-ink-500">累计获得</div>
              <div className="font-display text-3xl font-extrabold text-amber-600 mt-1">{correct * 15} XP</div>
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

  const q = questions[qIdx]

  return (
    <LearnShell title="听力训练" lang={lang} total={total} current={idx + 1} xp={correct * 15} onClose="/app/courses">
      <div className="flex-1 grid lg:grid-cols-[1fr_300px] gap-0">
        <div className="flex flex-col items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="chip bg-amber-50 text-amber-700 border border-amber-100"><IconChart size={13} /> 听力 · {l.name}</span>
              <span className="text-xs text-ink-400">{passage.title}</span>
            </div>

            {/* Audio player */}
            <div className="card p-6 mb-5">
              <div className="flex items-center gap-4">
                <button
                  onClick={play}
                  disabled={playing}
                  className="h-14 w-14 rounded-full bg-amber-500 grid place-items-center text-white shadow-card-hover hover:bg-amber-600 transition-all disabled:opacity-70 shrink-0"
                >
                  {playing ? (
                    <div className="flex gap-1">
                      <div className="h-4 w-1 bg-white rounded animate-pulse" />
                      <div className="h-4 w-1 bg-white rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="h-4 w-1 bg-white rounded animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  ) : <IconSpeaker size={24} />}
                </button>
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink-900">{playing ? '正在播放…' : '点击播放音频'}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5">原声 · 语速 0.9x · 可重复播放</div>
                  <div className="mt-2 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              {/* Speed controls */}
              <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {['0.75x', '0.9x', '1.0x'].map((s) => (
                    <span key={s} className={`chip text-[10px] ${s === '0.9x' ? 'bg-amber-100 text-amber-700' : 'bg-ink-50 text-ink-500'}`}>{s}</span>
                  ))}
                </div>
                <button onClick={() => setShowTrans((v) => !v)} className="text-xs text-amber-600 font-medium hover:underline">
                  {showTrans ? '隐藏原文' : '查看原文'}
                </button>
              </div>

              {showTrans && (
                <div className="mt-4 rounded-xl bg-amber-50/60 border border-amber-100 p-4 animate-fade-up">
                  <div className="text-xs text-ink-500 mb-1.5">原文 · 中文翻译</div>
                  <p className="text-sm text-ink-800 leading-relaxed">{passage.audioText}</p>
                  <p className="mt-2 text-sm text-ink-500 leading-relaxed">{passage.trans}</p>
                </div>
              )}
            </div>

            {/* Comprehension question */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-bold text-ink-900">理解测验</h3>
                <span className="text-xs text-ink-400">第 {qIdx + 1} / {questions.length} 题</span>
              </div>
              <p className="text-base font-medium text-ink-900 mb-4">{q.q}</p>
              <div className="space-y-2.5">
                {q.options.map((opt, i) => {
                  const isCorrect = i === q.answer
                  const isSel = i === selected
                  let cls = 'border-ink-200 bg-white hover:border-amber-300 hover:bg-amber-50/40'
                  if (answered) {
                    if (isCorrect) cls = 'border-emerald-400 bg-emerald-50'
                    else if (isSel) cls = 'border-rose-400 bg-rose-50'
                    else cls = 'border-ink-200 bg-white opacity-60'
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => choose(i)}
                      disabled={answered}
                      className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${cls}`}
                    >
                      <span className="font-medium text-ink-900">{opt}</span>
                      {answered && isCorrect && <IconCheck size={18} className="text-emerald-600" />}
                      {answered && isSel && !isCorrect && <IconX size={18} className="text-rose-600" />}
                    </button>
                  )
                })}
              </div>
              {answered && (
                <button onClick={nextQ} className="mt-4 btn-primary w-full">
                  {qIdx + 1 < questions.length ? '下一题' : (idx + 1 < total ? '下一段' : '完成训练')} <IconArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="border-l border-ink-100 bg-white p-6 hidden lg:block">
          <h3 className="font-display text-sm font-bold text-ink-900 mb-4">听力策略</h3>
          <ul className="space-y-3 text-xs text-ink-600 leading-relaxed">
            <li className="flex gap-2"><IconCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />先整体听 1 遍，抓住大意</li>
            <li className="flex gap-2"><IconCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />再逐句精听，注意关键词</li>
            <li className="flex gap-2"><IconCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />听不懂可调慢语速</li>
            <li className="flex gap-2"><IconCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />最后对照原文查漏补缺</li>
          </ul>
          <div className="mt-6 pt-5 border-t border-ink-100">
            <div className="text-xs text-ink-500 mb-2">本轮得分</div>
            <div className="font-display text-3xl font-extrabold text-amber-600">{correct * 15}</div>
            <div className="text-[11px] text-ink-400">XP · 答对 {correct} 题</div>
          </div>
          <Link to="/app/learn/word/en" className="mt-5 btn-secondary w-full text-sm justify-between">
            词汇记忆 <IconChevronRight size={14} />
          </Link>
        </aside>
      </div>
    </LearnShell>
  )
}
