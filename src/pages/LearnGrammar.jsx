import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GRAMMAR, LANGUAGES } from '../data/content'
import LearnShell from '../components/LearnShell'
import { useApp } from '../context/AppContext'
import {
  IconCheck, IconX, IconArrowRight, IconRefresh, IconSparkle,
  IconTarget, IconChevronRight, IconBook,
} from '../components/Icons'

function langOf(code) {
  return LANGUAGES.find((l) => l.code === code)
}

export default function LearnGrammar() {
  const { lang } = useParams()
  const { addXp } = useApp()
  const list = GRAMMAR[lang] || GRAMMAR.en
  const l = langOf(lang)

  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)

  const q = list[idx]
  const total = list.length

  const choose = (i) => {
    if (answered) return
    setSelected(i)
    setAnswered(true)
    if (i === q.answer) {
      setCorrect((c) => c + 1)
      addXp(15)
    } else {
      addXp(5)
    }
  }

  const next = () => {
    if (idx + 1 < total) {
      setIdx(idx + 1); setSelected(null); setAnswered(false)
    } else {
      setDone(true)
    }
  }

  const restart = () => {
    setIdx(0); setSelected(null); setAnswered(false); setCorrect(0); setDone(false)
  }

  if (done) {
    const acc = Math.round((correct / total) * 100)
    return (
      <LearnShell title="语法练习" lang={lang} total={total} current={total} xp={correct * 15} onClose="/app/courses">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card p-10 max-w-md w-full text-center animate-pop-in">
            <div className="text-6xl">{acc >= 80 ? '🏆' : '💪'}</div>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-ink-900">练习完成！</h2>
            <p className="mt-2 text-ink-500">正确率 {acc}%，答对 {correct} / {total} 题</p>
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-brand-50 to-violet-50 p-5">
              <div className="text-xs text-ink-500">本组获得</div>
              <div className="font-display text-3xl font-extrabold text-brand-600 mt-1">{correct * 15 + (total - correct) * 5} XP</div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={restart} className="btn-secondary flex-1"><IconRefresh size={16} /> 再练一组</button>
              <Link to="/app/learn/speaking/en" className="btn-primary flex-1">口语训练 <IconArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </LearnShell>
    )
  }

  return (
    <LearnShell title="语法练习" lang={lang} total={total} current={idx + 1} xp={correct * 15} onClose="/app/courses">
      <div className="flex-1 grid lg:grid-cols-[1fr_300px] gap-0">
        <div className="flex flex-col items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="chip bg-violet-50 text-violet-700 border border-violet-100"><IconTarget size={13} /> 语法 · {l.name}</span>
              <span className="text-xs text-ink-400">第 {idx + 1} 题 / 共 {total} 题</span>
            </div>

            <div className="card p-7 mb-5">
              <p className="text-lg font-medium text-ink-900 leading-relaxed">{q.q}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.answer
                const isSel = i === selected
                let cls = 'border-ink-200 bg-white hover:border-violet-300 hover:bg-violet-50/40'
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
                    className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${cls}`}
                  >
                    <span className="font-medium text-ink-900">{opt}</span>
                    {answered && isCorrect && <IconCheck size={18} className="text-emerald-600" />}
                    {answered && isSel && !isCorrect && <IconX size={18} className="text-rose-600" />}
                  </button>
                )
              })}
            </div>

            {answered && (
              <div className="mt-5 animate-fade-up">
                <div className={`rounded-xl p-4 ${selected === q.answer ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                    {selected === q.answer ? (
                      <><IconCheck size={16} className="text-emerald-600" /><span className="text-emerald-700">回答正确！+15 XP</span></>
                    ) : (
                      <><IconX size={16} className="text-rose-600" /><span className="text-rose-700">答错了，正确答案：{q.options[q.answer]}</span></>
                    )}
                  </div>
                  <p className="text-sm text-ink-600 leading-relaxed">💡 {q.explain}</p>
                </div>
                <button onClick={next} className="mt-4 btn-primary w-full">
                  {idx + 1 < total ? '下一题' : '完成练习'} <IconArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="border-l border-ink-100 bg-white p-6 hidden lg:block">
          <h3 className="font-display text-sm font-bold text-ink-900 mb-4">答题进度</h3>
          <div className="space-y-2.5">
            {list.map((_, i) => (
              <div key={i} className={`flex items-center gap-2.5 p-2 rounded-lg text-sm ${i === idx ? 'bg-brand-50' : i < idx ? 'opacity-60' : ''}`}>
                <div className={`h-7 w-7 rounded-full grid place-items-center text-xs font-bold ${i < idx ? 'bg-emerald-100 text-emerald-600' : i === idx ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'}`}>
                  {i < idx ? <IconCheck size={13} /> : i + 1}
                </div>
                <span className="text-ink-600 truncate">第 {i + 1} 题</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-5 border-t border-ink-100">
            <div className="rounded-xl bg-ink-50 p-3.5">
              <div className="flex items-center gap-2 text-ink-500 text-xs font-medium"><IconSparkle size={14} /> 正确率</div>
              <div className="font-display text-2xl font-extrabold text-violet-600 mt-1">
                {idx === 0 && !answered ? '—' : `${Math.round((correct / (answered ? idx + 1 : idx)) * 100)}%`}
              </div>
            </div>
          </div>
          <Link to="/app/learn/word/en" className="mt-5 btn-secondary w-full text-sm justify-between">
            词汇记忆 <IconChevronRight size={14} />
          </Link>
        </aside>
      </div>
    </LearnShell>
  )
}
