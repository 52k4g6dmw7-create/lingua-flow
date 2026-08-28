import { useState } from 'react'
import { COMMUNITY_POSTS, TRENDING_TOPICS, ACTIVE_LEARNERS, LANGUAGES } from '../data/content'
import { useApp } from '../context/AppContext'
import { LangBadge } from '../components/Primitives'
import {
  IconHeart, IconMessage, IconShare, IconPlus, IconUsers, IconSearch,
  IconFlame, IconArrowRight, IconX,
} from '../components/Icons'

function langOf(code) {
  return LANGUAGES.find((l) => l.code === code)
}

const tagColors = {
  hot: 'bg-rose-50 text-rose-600 border-rose-100',
  up: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  new: 'bg-brand-50 text-brand-600 border-brand-100',
}
const trendIcon = { hot: '🔥', up: '📈', new: '✨' }

function PostCard({ post, onLike }) {
  const l = langOf(post.badge)
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(post.likes)
  const [showImg, setShowImg] = useState(false)
  const toggle = () => {
    setLiked((v) => !v)
    setCount((c) => (liked ? c - 1 : c + 1))
    onLike?.()
  }
  return (
    <div className="card p-5 animate-fade-up">
      <div className="flex gap-3">
        <div className="h-11 w-11 rounded-full bg-ink-100 grid place-items-center text-xl shrink-0">{post.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-ink-900">{post.author}</span>
            <LangBadge code={post.badge} />
            <span className="text-xs text-ink-400">· {post.time}</span>
          </div>
          <p className="mt-2 text-sm text-ink-700 leading-relaxed">{post.content}</p>

          {post.image && (
            <button onClick={() => setShowImg(true)} className="mt-3 block rounded-xl overflow-hidden border border-ink-100 h-40 w-full bg-gradient-to-br from-brand-100 via-violet-100 to-rose-100 relative">
              <div className="absolute inset-0 grid place-items-center text-4xl opacity-60">{post.image === 'study-desk' ? '📚' : '🏅'}</div>
              <div className="absolute bottom-2 left-2 chip bg-white/90 text-ink-700 text-[10px]">点击查看</div>
            </button>
          )}

          <div className="mt-2"><span className="chip bg-ink-50 text-ink-500 text-[11px]">#{post.tag}</span></div>

          <div className="mt-3 flex items-center gap-5 text-sm text-ink-500">
            <button onClick={toggle} className={`flex items-center gap-1.5 hover:text-rose-500 transition-colors ${liked ? 'text-rose-500' : ''}`}>
              <IconHeart size={16} className={liked ? 'fill-rose-500' : ''} /> {count}
            </button>
            <button className="flex items-center gap-1.5 hover:text-brand-600 transition-colors"><IconMessage size={16} /> {post.comments}</button>
            <button className="flex items-center gap-1.5 hover:text-brand-600 transition-colors"><IconShare size={16} /> {post.shares}</button>
          </div>
        </div>
      </div>
      {showImg && (
        <div className="fixed inset-0 bg-ink-900/60 z-50 grid place-items-center p-6 animate-fade-in" onClick={() => setShowImg(false)}>
          <div className="card max-w-lg w-full p-2 relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/80 grid place-items-center z-10"><IconX size={16} /></button>
            <div className="rounded-xl h-64 w-full bg-gradient-to-br from-brand-100 via-violet-100 to-rose-100 grid place-items-center text-6xl">{post.image === 'study-desk' ? '📚' : '🏅'}</div>
            <p className="p-4 text-sm text-ink-700">{post.content}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Community() {
  const { user, addXp } = useApp()
  const [posts, setPosts] = useState(COMMUNITY_POSTS)
  const [filter, setFilter] = useState('all')
  const [compose, setCompose] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [composeLang, setComposeLang] = useState('en')
  const [toast, setToast] = useState('')

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.badge === filter)

  const publish = () => {
    if (!compose.trim()) return
    const newPost = {
      id: Date.now(),
      author: user.name,
      avatar: user.avatar,
      badge: composeLang,
      time: '刚刚',
      content: compose,
      likes: 0,
      comments: 0,
      shares: 0,
      tag: '我的分享',
    }
    setPosts([newPost, ...posts])
    setCompose('')
    setShowCompose(false)
    addXp(10)
    setToast('发布成功！+10 XP')
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">学习社区</h1>
          <p className="text-sm text-ink-500 mt-1">与全球语友交流心得、组队打卡，让坚持不再孤单</p>
        </div>
        <button onClick={() => setShowCompose(true)} className="btn-primary btn-sm"><IconPlus size={16} /> 发布动态</button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Feed */}
        <div>
          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            <button onClick={() => setFilter('all')} className={`chip border cursor-pointer shrink-0 ${filter === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-600 border-ink-200 hover:border-brand-300'}`}>全部</button>
            {LANGUAGES.map((l) => (
              <button key={l.code} onClick={() => setFilter(l.code)} className={`chip border cursor-pointer shrink-0 ${filter === l.code ? 'text-white border-transparent' : 'bg-white text-ink-600 border-ink-200 hover:border-brand-300'}`} style={filter === l.code ? { background: l.color } : {}}>
                {l.flag} {l.name}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filtered.map((p) => <PostCard key={p.id} post={p} />)}
          </div>

          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <div className="text-4xl">💬</div>
              <p className="mt-3 text-ink-500">还没有相关动态，快来发布第一条吧！</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Compose mini */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-10 w-10 rounded-full bg-ink-100 grid place-items-center text-lg">{user.avatar}</div>
              <button onClick={() => setShowCompose(true)} className="flex-1 text-left text-sm text-ink-400 rounded-full bg-ink-50 px-4 py-2.5 hover:bg-ink-100 transition-colors">
                分享你的学习心得…
              </button>
            </div>
          </div>

          {/* Trending */}
          <div className="card p-5">
            <h3 className="font-display text-sm font-bold text-ink-900 mb-3 flex items-center gap-2"><IconFlame size={16} className="text-rose-500" /> 热门话题</h3>
            <div className="space-y-3">
              {TRENDING_TOPICS.map((t, i) => (
                <div key={t.name} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-ink-400 w-4">{i + 1}</span>
                    <div>
                      <div className="text-sm font-medium text-ink-900 group-hover:text-brand-600 transition-colors">#{t.name}</div>
                      <div className="text-[11px] text-ink-400">{t.posts} 讨论</div>
                    </div>
                  </div>
                  <span className={`chip border text-[10px] py-0.5 ${tagColors[t.trend]}`}>{trendIcon[t.trend]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active learners */}
          <div className="card p-5">
            <h3 className="font-display text-sm font-bold text-ink-900 mb-3 flex items-center gap-2"><IconUsers size={16} className="text-brand-600" /> 活跃学友</h3>
            <div className="space-y-3">
              {ACTIVE_LEARNERS.map((a) => {
                const l = langOf(a.badge)
                return (
                  <div key={a.name} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-ink-100 grid place-items-center text-base shrink-0">{a.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-900 truncate">{a.name}</div>
                      <div className="text-[11px] text-ink-500">{l.flag} {l.name} · Lv.{a.level}</div>
                    </div>
                    <button className="text-xs text-brand-600 font-medium hover:underline">关注</button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Challenge card */}
          <div className="card p-5 bg-gradient-to-br from-brand-600 to-violet-600 text-white">
            <div className="text-xs text-brand-100 mb-1">组队挑战</div>
            <h3 className="font-display text-base font-bold">21 天日语打卡</h3>
            <p className="mt-1 text-xs text-brand-100">已有 1,280 人加入，坚持就是胜利</p>
            <button className="mt-3 btn btn-sm bg-white text-brand-700 w-full">立即加入 <IconArrowRight size={14} /></button>
          </div>
        </aside>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-ink-900/50 z-50 grid place-items-center p-4 animate-fade-in" onClick={() => setShowCompose(false)}>
          <div className="card max-w-lg w-full p-6 animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-ink-900">发布动态</h3>
              <button onClick={() => setShowCompose(false)} className="h-8 w-8 rounded-lg grid place-items-center text-ink-400 hover:bg-ink-100"><IconX size={18} /></button>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-ink-100 grid place-items-center text-lg shrink-0">{user.avatar}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink-900">{user.name}</div>
                <div className="flex gap-1.5 mt-1.5">
                  {LANGUAGES.map((l) => (
                    <button key={l.code} onClick={() => setComposeLang(l.code)} className={`chip border text-[10px] ${composeLang === l.code ? 'text-white border-transparent' : 'bg-white text-ink-600 border-ink-200'}`} style={composeLang === l.code ? { background: l.color } : {}}>
                      {l.flag} {l.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <textarea
              value={compose}
              onChange={(e) => setCompose(e.target.value)}
              rows={4}
              className="input resize-none"
              placeholder="分享你的学习心得、打卡记录或提问…"
              autoFocus
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-ink-400">发布可得 +10 XP</span>
              <button onClick={publish} disabled={!compose.trim()} className="btn-primary btn-sm">发布</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 card px-5 py-3 text-sm font-medium text-ink-900 shadow-pop animate-pop-in flex items-center gap-2">
          <span className="h-5 w-5 rounded-full bg-emerald-100 grid place-items-center text-emerald-600 text-xs">✓</span>
          {toast}
        </div>
      )}
    </div>
  )
}
