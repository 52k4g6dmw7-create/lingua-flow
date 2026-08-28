import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { SPEAKING, LANGUAGES } from '../data/content'
import LearnShell from '../components/LearnShell'
import { useApp } from '../context/AppContext'
import {
  IconMic, IconSpeaker, IconArrowRight, IconRefresh, IconCheck,
  IconChevronRight, IconSparkle,
} from '../components/Icons'

function langOf(code) {
  return LANGUAGES.find((l) => l.code === code)
}

function Waveform({ active, color = '#4f46e5' }) {
  const bars = 40
  const [heights, setHeights] = useState(() => Array.from({ length: bars }, () => 20))
  useEffect(() => {
    if (!active) {
      setHeights(Array.from({ length: bars }, () => 15))
      return
    }
    const t = setInterval(() => {
      setHeights(Array.from({ length: bars }, () => 15 + Math.random() * 85))
    }, 90)
    return () => clearInterval(t)
  }, [active])
  return (
    <div className="flex items-center justify-center gap-px h-16">
      {heights.map((h, i) => (
        <div
          key={i}
          className="wf-bar transition-all duration-100"
          style={{ height: `${h}%`, background: color, opacity: active ? 1 : 0.35 }}
        />
      ))}
    </div>
  )
}

export default function LearnSpeaking() {
  const { lang } = useParams()
  const { addXp } = useApp()
  const list = SPEAKING[lang] || SPEAKING.en
  const l = langOf(lang)

  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState('idle') // idle | playing | recording | scored
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [played, setPlayed] = useState(false)
  const timerRef = useRef(null)

  const sentence = list[idx]
  const total = list.length

  const playNative = () => {
    setPhase('playing')
    setPlayed(true)
    try {
      const u = new SpeechSynthesisUtterance(sentence.text)
      u.lang = lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : 'en-US'
      u.rate = 0.85
      u.onend = () => setPhase('idle')
      window.speechSynthesis.speak(u)
      setTimeout(() => setPhase('idle'), 3500)
    } catch {
      setTimeout(() => setPhase('idle'), 2500)
    }
  }

  const record = () => {
    if (phase === 'recording') return
    setPhase('recording')
    setScore(0)
    timerRef.current = setTimeout(() => {
      const s = 72 + Math.floor(Math.random() * 26)
      setScore(s)
      setPhase('scored')
      addXp(s >= 85 ? 20 : 10)
    }, 2800)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const next = () => {
    if (idx + 1 < total) {
      setIdx(idx + 1); setPhase('idle'); setScore(0); setPlayed(false)
    } else {
      setDone(true)
    }
  }

  const restart = () => {
    setIdx(0); setPhase('idle'); setScore(0); setDone(false); setPlayed(false)
  }

  if (done) {
    return (
      <LearnShell title="口语跟读" lang={lang} total={total} current={total} xp={total * 15} onClose="/app/courses">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card p-10 max-w-md w-full text-center animate-pop-in">
            <div className="text-6xl">🎤</div>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-ink-900">跟读训练完成！</h2>
            <p className="mt-2 text-ink-500">坚持开口练习，发音会越来越地道！</p>
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 p-5">
              <div className="text-xs text-ink-500">累计获得</div>
              <div className="font-display text-3xl font-extrabold text-rose-600 mt-1">{total * 15} XP</div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={restart} className="btn-secondary flex-1"><IconRefresh size={16} /> 再练一组</button>
              <Link to="/app/learn/listening/en" className="btn-primary flex-1">听力训练 <IconArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </LearnShell>
    )
  }

  const scoreColor = score >= 85 ? '#16a34a' : score >= 70 ? '#ca8a04' : '#dc2626'
  const scoreLabel = score >= 85 ? '太棒了！' : score >= 70 ? '不错！' : '继续努力'

  return (
    <LearnShell title="口语跟读" lang={lang} total={total} current={idx + 1} xp={idx * 15} onClose="/app/courses">
      <div className="flex-1 grid lg:grid-cols-[1fr_300px] gap-0">
        <div className="flex flex-col items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="chip bg-rose-50 text-rose-700 border border-rose-100"><IconMic size={13} /> 口语 · {l.name}</span>
              <span className="text-xs text-ink-400">跟读第 {idx + 1} / {total} 句</span>
            </div>

            {/* Sentence card */}
            <div className="card p-7 mb-5">
              <div className="text-xs text-ink-400 mb-2">请跟读以下句子</div>
              <p className="font-display text-2xl font-bold text-ink-900 leading-snug">{sentence.text}</p>
              <p className="mt-3 text-ink-500">{sentence.trans}</p>
              <div className="mt-4 pt-4 border-t border-ink-100 flex items-center gap-2 text-xs text-ink-500">
                <IconSparkle size={13} className="text-rose-500" />
                <span>重点：{sentence.focus}</span>
              </div>
            </div>

            {/* Waveform / score area */}
            <div className="card p-6 mb-5">
              {phase === 'scored' ? (
                <div className="text-center animate-pop-in">
                  <div className="text-xs text-ink-400 mb-2">AI 发音评分</div>
                  <div className="font-display text-5xl font-extrabold" style={{ color: scoreColor }}>{score}</div>
                  <div className="text-sm font-medium mt-1" style={{ color: scoreColor }}>{scoreLabel}</div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg bg-ink-50 p-2.5"><div className="font-bold text-ink-900">{score + 3}</div><div className="text-ink-500">流利度</div></div>
                    <div className="rounded-lg bg-ink-50 p-2.5"><div className="font-bold text-ink-900">{Math.max(60, score - 5)}</div><div className="text-ink-500">发音</div></div>
                    <div className="rounded-lg bg-ink-50 p-2.5"><div className="font-bold text-ink-900">{score + 2}</div><div className="text-ink-500">语调</div></div>
                  </div>
                </div>
              ) : (
                <>
                  <Waveform active={phase === 'recording' || phase === 'playing'} color={l.color} />
                  <div className="text-center mt-3 text-sm text-ink-500">
                    {phase === 'playing' ? '🎧 播放标准发音中…' :
                     phase === 'recording' ? '🔴 录音中，请大声跟读…' :
                     '点击下方按钮开始'}
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={playNative}
                disabled={phase === 'recording'}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="h-14 w-14 rounded-full bg-white border-2 border-ink-200 grid place-items-center text-ink-600 hover:border-brand-300 hover:text-brand-600 transition-all disabled:opacity-50">
                  <IconSpeaker size={22} />
                </div>
                <span className="text-[11px] text-ink-500">听发音</span>
              </button>

              {phase === 'scored' ? (
                <button onClick={next} className="flex flex-col items-center gap-1.5">
                  <div className="h-16 w-16 rounded-full bg-brand-600 grid place-items-center text-white shadow-card-hover hover:bg-brand-700 transition-all">
                    <IconArrowRight size={26} />
                  </div>
                  <span className="text-[11px] font-medium text-brand-600">下一句</span>
                </button>
              ) : phase === 'recording' ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-16 w-16 rounded-full bg-rose-500 grid place-items-center text-white animate-pulse">
                    <div className="h-4 w-4 rounded-sm bg-white" />
                  </div>
                  <span className="text-[11px] font-medium text-rose-500">录音中</span>
                </div>
              ) : (
                <button onClick={record} className="flex flex-col items-center gap-1.5">
                  <div className="h-16 w-16 rounded-full bg-rose-500 grid place-items-center text-white shadow-card-hover hover:bg-rose-600 transition-all scale-100 hover:scale-105">
                    <IconMic size={28} />
                  </div>
                  <span className="text-[11px] font-medium text-rose-600">{played ? '重新录制' : '开始录音'}</span>
                </button>
              )}

              <button
                onClick={() => { setPhase('idle'); setScore(0) }}
                disabled={phase === 'recording'}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="h-14 w-14 rounded-full bg-white border-2 border-ink-200 grid place-items-center text-ink-600 hover:border-brand-300 hover:text-brand-600 transition-all disabled:opacity-50">
                  <IconRefresh size={20} />
                </div>
                <span className="text-[11px] text-ink-500">重置</span>
              </button>
            </div>
          </div>
        </div>

        <aside className="border-l border-ink-100 bg-white p-6 hidden lg:block">
          <h3 className="font-display text-sm font-bold text-ink-900 mb-4">跟读技巧</h3>
          <ul className="space-y-3 text-xs text-ink-600 leading-relaxed">
            <li className="flex gap-2"><IconCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />先听 2-3 遍标准发音，注意连读与语调</li>
            <li className="flex gap-2"><IconCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />模仿母语者的节奏，不要逐字朗读</li>
            <li className="flex gap-2"><IconCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />重点练习标注的连读与弱读</li>
            <li className="flex gap-2"><IconCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />得分 85+ 表示发音良好</li>
          </ul>
          <div className="mt-6 pt-5 border-t border-ink-100">
            <div className="text-xs text-ink-500 mb-2">本轮进度</div>
            <div className="flex gap-1.5">
              {list.map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full ${i < idx ? 'bg-emerald-400' : i === idx ? 'bg-rose-400' : 'bg-ink-100'}`} />
              ))}
            </div>
            <div className="mt-2 text-[11px] text-ink-400">已完成 {idx} / {total} 句</div>
          </div>
          <Link to="/app/learn/listening/en" className="mt-5 btn-secondary w-full text-sm justify-between">
            听力训练 <IconChevronRight size={14} />
          </Link>
        </aside>
      </div>
    </LearnShell>
  )
}
