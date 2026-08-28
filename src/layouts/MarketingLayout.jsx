import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Logo from '../components/Logo'
import { useApp } from '../context/AppContext'

export default function MarketingLayout({ children, transparent = false }) {
  const { authed } = useApp()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = scrolled || !transparent

  return (
    <div className="min-h-screen">
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${solid ? 'bg-white/85 backdrop-blur-md border-b border-ink-100 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-600">
            <a href="#courses" className="hover:text-brand-600 transition-colors">课程体系</a>
            <a href="#modules" className="hover:text-brand-600 transition-colors">学习模块</a>
            <a href="#path" className="hover:text-brand-600 transition-colors">学习路径</a>
            <a href="#community" className="hover:text-brand-600 transition-colors">学习社区</a>
          </nav>
          <div className="flex items-center gap-2">
            {authed ? (
              <Link to="/app" className="btn-primary btn-sm">进入学习</Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost btn-sm hidden sm:inline-flex">登录</Link>
                <Link to="/register" className="btn-primary btn-sm">免费注册</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
