import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PATH_QUIZ, LANGUAGES } from '../data/content'
import { ProgressBar } from '../components/Primitives'
import {
  IconPath, IconSparkle, IconCheck, IconArrowRight, IconTarget,
  IconClock, IconBook, IconMic, IconChart, IconRefresh,
} from '../components/Icons'

function buildPlan(answers) {
  // simple recommendation logic
  const goal = answers[0]?.path
  const time = answers[1]?.path
  const skill = answers[2]?.path
  const style = answers[3]?.path

  const focus = skill === 'speaking' ? '口语' : skill === 'listening' ? '听力' : skill === 'word' ? '词汇' : '语法'
  const daily = time === 'light' ? '15-30 分钟' : time === 'medium' ? '30-60 分钟' : '1-2 小时'
  const weeks = time === 'heavy' ? 8 : time === 'medium' ? 12 : 16

  const stages = [
    { week: '第 1-2 周', title: '基础夯基', focus: '发音与核心词汇', items: ['音标/假名/字母发音规则', '高频 500 词记忆', '基础句型结构'], type: 'word' },
    { week: '第 3-4 周', title: '场景输入', focus: `${focus}场景训练`, items: ['日常生活场景对话', '高频语法点精讲', '听力精听 + 跟读'], type: 'speaking' },
    { week: '第 5-8 周', title: '能力提升', focus: '中级表达与流利度', items: ['中级语法体系建立', '长文本听力训练', '口语流利度专项'], type: 'listening' },
    { week: '第 9-12 周', title: '实战冲刺', focus: '综合应用与考试', items: ['真题模拟训练', '弱点针对性突破', '模拟测试与复盘'], type: 'grammar' },
  ].slice(0, weeks > 8 ? 4 : 3)

  return { focus, daily, weeks, stages, goal, style }
}

const goalLabels = { travel: '旅行交流', exam: '考试认证', work: '职场提升', media: '追剧看番' }

export default function LearningPath() {
  const { user, setPlan } = useApp()
  const [step, setStep] = useState(0) // 0..quiz.length, then -1 for result
  const [answers, setAnswers] = useState([])
  const [plan, setPlanState] = useState(user?.plan || null)
  const [showResult, setShowResult] = useState(!!user?.plan)

  const choose = (i) => {
    const opt = PATH_QUIZ[step].options[i]
    const next = [...answers, { path: opt.path, weight: opt.weight }]
    setAnswers(next)
    if (step + 1 < PATH_QUIZ.length) {
      setStep(step + 1)
    } else {
      const p = buildPlan(next)
      setPlanState(p)
      setPlan(p)
      setShowResult(true)
    }
  }

  const restart = () => {
    setStep(0); setAnswers([]); setShowResult(false); setPlanState(null)
  }

  if (showResult && plan) {
    const l = LANGUAGES.find((x) => x.code === user?.targetLang) || LANGUAGES[0]
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <div className="mb-6">
          <span className="chip bg-violet-50 text-violet-700 border border-violet-100"><IconPath size={13} /> 个性化学习路径</span>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-900">你的专属学习计划</h1>
          <p className="text-sm text-ink-500 mt-1">基于你的目标与水平智能生成，可随时调整</p>
        </div>

        {/* Plan summary */}
        <div className="card p-6 mb-6 bg-gradient-to-br from-white to-violet-50/40">
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-ink-500">目标语言</div>
              <div className="mt-1 font-display text-lg font-bold text-ink-900">{l.flag} {l.name}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">学习目标</div>
              <div className="mt-1 font-display text-lg font-bold text-ink-900">{goalLabels[plan.goal] || '综合提升'}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">每日时长</div>
              <div className="mt-1 font-display text-lg font-bold text-violet-600">{plan.daily}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">预计周期</div>
              <div className="mt-1 font-display text-lg font-bold text-brand-600">{plan.weeks} 周</div>
            </div>
          </div>
        </div>

        {/* Path timeline */}
        <div className="mb-6">
          <h2 className="font-display text-lg font-bold text-ink-900 mb-4">学习阶段</h2>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-ink-100 hidden sm:block" />
            <div className="space-y-4">
              {plan.stages.map((s, i) => {
                const typeIcon = { word: IconBook, speaking: IconMic, listening: IconChart, grammar: IconTarget }[s.type] || IconBook
                const TypeIcon = typeIcon
                return (
                  <div key={i} className="relative sm:pl-16">
                    <div className="absolute left-0 top-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 grid place-items-center text-white font-display font-bold text-lg hidden sm:grid">{i + 1}</div>
                    <div className="card p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="chip bg-violet-50 text-violet-700 text-[10px]">{s.week}</span>
                        <h3 className="font-display text-base font-bold text-ink-900">{s.title}</h3>
                      </div>
                      <p className="text-xs text-ink-500 mb-3">重点：{s.focus}</p>
                      <div className="space-y-1.5">
                        {s.items.map((it) => (
                          <div key={it} className="flex items-center gap-2 text-sm text-ink-700">
                            <TypeIcon size={15} className="text-violet-500 shrink-0" />{it}
                          </div>
                        ))}
                      </div>
                      <Link to="/app/courses" className="mt-4 btn-secondary btn-sm">
                        进入此阶段课程 <IconArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* AI insight */}
        <div className="card p-6 bg-gradient-to-br from-brand-600 to-violet-600 text-white mb-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 grid place-items-center shrink-0"><IconSparkle size={22} /></div>
            <div>
              <h3 className="font-display text-base font-bold">AI 学习建议</h3>
              <p className="mt-1.5 text-sm text-brand-100 leading-relaxed">
                根据你的选择，建议优先强化 <b className="text-white">{plan.focus}</b> 能力。坚持每日 {plan.daily} 的学习，约 {plan.weeks} 周可见显著进步。每周我们会根据你的完成情况自动调整计划。
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={restart} className="btn-secondary"><IconRefresh size={16} /> 重新生成路径</button>
          <Link to="/app" className="btn-primary">返回首页 <IconArrowRight size={16} /></Link>
        </div>
      </div>
    )
  }

  // Quiz state
  const q = PATH_QUIZ[step]
  const total = PATH_QUIZ.length

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 grid place-items-center text-white mb-4">
          <IconPath size={28} />
        </div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">生成你的学习路径</h1>
        <p className="mt-2 text-sm text-ink-500">回答 4 个问题，AI 为你定制专属学习计划</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-ink-500 mb-2">
          <span>问题 {step + 1} / {total}</span>
          <span>{Math.round(((step) / total) * 100)}% 完成</span>
        </div>
        <ProgressBar value={step} max={total} height="h-2" barClass="bg-gradient-to-r from-violet-500 to-purple-600" />
      </div>

      <div className="card p-6 sm:p-8 animate-fade-up" key={step}>
        <h2 className="font-display text-lg font-bold text-ink-900 mb-5">{q.q}</h2>
        <div className="grid gap-3" style={{ gridTemplateColumns: q.options.length === 4 ? 'repeat(2, 1fr)' : '1fr' }}>
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => choose(i)}
              className="rounded-xl border-2 border-ink-200 p-4 text-left hover:border-violet-400 hover:bg-violet-50/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink-900">{opt.label}</span>
                <IconArrowRight size={18} className="text-ink-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
