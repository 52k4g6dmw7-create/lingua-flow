import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { IconMail, IconLock, IconUser } from '../components/Icons'

export default function Login() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [err, setErr] = useState('')

  const DEMO_EMAIL = 'learner@linguaflow.com'
  const DEMO_PASSWORD = 'demo1234'

  const doLogin = (nextEmail, nextPassword, setBusy) => {
    setErr('')
    if (!nextEmail || !nextPassword) {
      setErr('请输入邮箱和密码')
      return false
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)
    if (!emailOk) {
      setErr('请输入有效的邮箱地址')
      return false
    }
    if (nextPassword.length < 6) {
      setErr('密码长度至少为 6 位')
      return false
    }
    if (setBusy) setBusy(true)
    setTimeout(() => {
      login(nextEmail, nextPassword)
      navigate('/app')
    }, 500)
    return true
  }

  const submit = (e) => {
    e.preventDefault()
    doLogin(email, password, setLoading)
  }

  const demoLogin = (e) => {
    e.preventDefault()
    setEmail(DEMO_EMAIL)
    setPassword(DEMO_PASSWORD)
    const ok = doLogin(DEMO_EMAIL, DEMO_PASSWORD, setDemoLoading)
    if (!ok) setDemoLoading(false)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual side */}
      <div className="hidden lg:flex relative mesh-hero flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="relative">
          <div className="text-4xl">🗣️</div>
          <h1 className="mt-6 font-display text-4xl font-extrabold text-ink-900 leading-tight">
            学一门新语言<br />开启世界对话
          </h1>
          <p className="mt-4 text-ink-600 max-w-md">沉浸式多语种学习平台，覆盖英语、日语、韩语，从分级课程到智能学习路径，让语言学习更高效。</p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 max-w-md">
          {[
            { n: '3', l: '主流语种' },
            { n: '200+', l: '精品课程' },
            { n: '38万', l: '学习者' },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-white/70 backdrop-blur border border-ink-100 p-4">
              <div className="font-display text-2xl font-extrabold text-brand-600">{s.n}</div>
              <div className="text-xs text-ink-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <div className="text-4xl">🌐</div>
            <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-900">LinguaFlow</h1>
          </div>
          <h2 className="font-display text-2xl font-extrabold text-ink-900">欢迎回来</h2>
          <p className="text-sm text-ink-500 mt-1.5">登录账号，继续你的语言学习之旅</p>

          <form onSubmit={submit} noValidate className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">邮箱</label>
              <div className="relative">
                <IconMail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-11"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">密码</label>
              <div className="relative">
                <IconLock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-11"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {err && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{err}</div>}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-ink-600">
                <input type="checkbox" defaultChecked className="rounded border-ink-300 text-brand-600 focus:ring-brand-400" />
                记住我
              </label>
              <a href="#" className="text-brand-600 font-medium hover:underline">忘记密码？</a>
            </div>

            <button type="submit" disabled={loading || demoLoading} className="btn-primary btn-lg w-full">
              {loading ? '登录中…' : '登录'}
            </button>

            <button
              type="button"
              onClick={demoLogin}
              disabled={loading || demoLoading}
              className="btn-secondary btn-lg w-full mt-2"
            >
              {demoLoading ? '登录中…' : '使用演示账号登录'}
            </button>
          </form>

          <div className="mt-4 rounded-xl bg-brand-50 border border-brand-100 px-3.5 py-2.5 text-xs text-ink-600">
            <div className="font-medium text-brand-700 mb-0.5">演示账号</div>
            <div>邮箱：learner@linguaflow.com　密码：demo1234</div>
          </div>

          <div className="relative my-6 text-center">
            <span className="text-xs text-ink-400 bg-white px-3 relative z-10">其他登录方式</span>
            <div className="absolute top-1/2 inset-x-0 h-px bg-ink-100" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['微信', 'Google', 'Apple'].map((p) => (
              <button key={p} type="button" className="btn-secondary btn-sm">{p}</button>
            ))}
          </div>

          <p className="text-center text-sm text-ink-500 mt-6">
            还没有账号？<Link to="/register" className="text-brand-600 font-semibold hover:underline">立即注册</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
