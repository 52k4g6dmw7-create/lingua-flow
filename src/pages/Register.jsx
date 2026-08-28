import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { LANGUAGES } from '../data/content'
import { IconMail, IconLock, IconUser, IconCheck, IconSparkle } from '../components/Icons'

const goals = [
  { id: 'travel', label: '旅行交流', icon: '✈️' },
  { id: 'exam', label: '考试认证', icon: '🎓' },
  { id: 'work', label: '职场提升', icon: '💼' },
  { id: 'media', label: '追剧看番', icon: '🎬' },
]

const levels = [
  { id: 'zero', label: '零基础', desc: '从字母音标开始' },
  { id: 'basic', label: '初级', desc: '能进行简单对话' },
  { id: 'inter', label: '中级', desc: '能读懂日常文本' },
  { id: 'adv', label: '中高级', desc: '接近流利表达' },
]

export default function Register() {
  const { register } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    targetLang: 'en',
    goal: 'travel',
    level: 'zero',
  })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const next = () => {
    setErr('')
    if (step === 1) {
      if (!form.name.trim()) return setErr('请输入昵称')
      if (!form.email.trim()) return setErr('请输入邮箱')
      if (form.password.length < 6) return setErr('密码至少 6 位')
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const finish = () => {
    setLoading(true)
    setTimeout(() => {
      register(form)
      navigate('/app')
    }, 700)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 lg:p-12 mesh-hero">
      <div className="absolute inset-0 grid-bg opacity-50 -z-10" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl">🌟</div>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink-900">创建你的学习账号</h1>
          <p className="mt-2 text-ink-500">3 步开启沉浸式语言学习</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold transition-all ${step >= s ? 'bg-brand-600 text-white' : 'bg-white text-ink-400 border border-ink-200'}`}>
                {step > s ? <IconCheck size={16} /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-10 rounded-full transition-all ${step > s ? 'bg-brand-600' : 'bg-ink-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">昵称</label>
                <div className="relative">
                  <IconUser size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input pl-11" placeholder="如何称呼你？" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">邮箱</label>
                <div className="relative">
                  <IconMail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input pl-11" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">密码</label>
                <div className="relative">
                  <IconLock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="input pl-11" placeholder="至少 6 位" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-ink-700 mb-3">想学哪门语言？</div>
                <div className="grid grid-cols-3 gap-3">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => set('targetLang', l.code)}
                      className={`rounded-2xl border-2 p-4 text-center transition-all ${form.targetLang === l.code ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'}`}
                      style={form.targetLang === l.code ? { borderColor: l.color } : {}}
                    >
                      <div className="text-3xl">{l.flag}</div>
                      <div className="mt-1.5 text-sm font-semibold text-ink-900">{l.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-ink-700 mb-3">学习目标</div>
                <div className="grid grid-cols-2 gap-3">
                  {goals.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => set('goal', g.id)}
                      className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left transition-all ${form.goal === g.id ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'}`}
                    >
                      <span className="text-xl">{g.icon}</span>
                      <span className="text-sm font-medium text-ink-800">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-ink-700 mb-3">当前水平</div>
                <div className="grid grid-cols-2 gap-3">
                  {levels.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => set('level', l.id)}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${form.level === l.id ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'}`}
                    >
                      <div className="text-sm font-semibold text-ink-900">{l.label}</div>
                      <div className="text-xs text-ink-500 mt-0.5">{l.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-100 p-4 flex gap-3">
                <IconSparkle size={20} className="text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-ink-900">智能学习路径已就绪</div>
                  <div className="text-xs text-ink-600 mt-1">我们将根据你的选择，生成个性化课程推荐与每日学习计划。</div>
                </div>
              </div>
            </div>
          )}

          {err && <div className="mt-4 text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{err}</div>}

          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep((s) => s - 1)} className="btn-secondary flex-1">上一步</button>
            )}
            {step < 3 ? (
              <button onClick={next} className="btn-primary flex-1">继续</button>
            ) : (
              <button onClick={finish} disabled={loading} className="btn-primary flex-1">
                {loading ? '创建中…' : '开启学习之旅'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-ink-500 mt-6">
          已有账号？<Link to="/login" className="text-brand-600 font-semibold hover:underline">直接登录</Link>
        </p>
      </div>
    </div>
  )
}
