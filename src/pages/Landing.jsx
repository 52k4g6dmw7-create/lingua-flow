import { Link } from 'react-router-dom'
import { LANGUAGES, LEVELS } from '../data/content'
import {
  IconArrowRight, IconCheck, IconBook, IconSpeaker, IconMic, IconChart,
  IconPath, IconUsers, IconTrophy, IconStar, IconFlame, IconSparkle, IconPlay,
} from '../components/Icons'

const modules = [
  { icon: IconBook, color: 'from-brand-500 to-brand-600', title: '单词记忆', desc: '基于艾宾浩斯遗忘曲线的间隔重复，卡片式记忆配合例句语境，记得牢用得来。', tags: ['间隔重复', '例句语境', '发音'] },
  { icon: IconPath, color: 'from-violet-500 to-purple-600', title: '语法练习', desc: '分题型精讲精练，即时反馈与解析，错误自动归入复习池，吃透每一个语法点。', tags: ['即时反馈', '错题本', '精讲解析'] },
  { icon: IconMic, color: 'from-rose-500 to-red-600', title: '口语跟读', desc: '逐句跟读训练，AI 发音评分与连读标注，从开口难到流利表达。', tags: ['AI 评分', '连读标注', '逐句训练'] },
  { icon: IconSpeaker, color: 'from-amber-500 to-orange-600', title: '听力训练', desc: '真实场景音频片段，可调语速与逐句精听，配套理解测验，听懂每一个细节。', tags: ['真实场景', '变速精听', '理解测验'] },
]

const features = [
  { icon: IconSparkle, title: '智能学习路径', text: '根据目标、水平与节奏，自动生成个性化课程序列与每日计划。' },
  { icon: IconChart, title: '进度可视化', text: '学习时长、掌握词汇、正确率与连续打卡，一目了然的数据看板。' },
  { icon: IconUsers, title: '社区交流', text: '与全球语友打卡互动，分享学习心得，组队挑战让坚持不再孤单。' },
  { icon: IconTrophy, title: '成就激励', text: '等级、徽章与连击系统，把枯燥的学习变成有成就感的小目标。' },
]

export default function Landing() {
  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative pt-28 pb-20 lg:pt-36 mesh-hero">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="max-w-7xl mx-auto px-4 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-ink-200 px-3.5 py-1.5 text-xs font-medium text-ink-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                38 万 + 学习者的共同选择
              </div>
              <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink-900 leading-[1.05]">
                学一门新语言<br />
                <span className="bg-gradient-to-r from-brand-600 via-violet-600 to-rose-600 bg-clip-text text-transparent">开启世界对话</span>
              </h1>
              <p className="mt-5 text-lg text-ink-600 max-w-xl leading-relaxed">
                沉浸式多语种学习平台，覆盖英语、日语、韩语。分级课程体系 + 互动式学习模块 + 智能路径推荐，让语言学习更高效、更持久。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary btn-lg">
                  免费开始学习 <IconArrowRight size={18} />
                </Link>
                <a href="#modules" className="btn-secondary btn-lg">
                  <IconPlay size={16} /> 了解学习模块
                </a>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-ink-500">
                <div className="flex -space-x-2">
                  {['🦊', '🐼', '🐰', '🐯', '🐱'].map((a, i) => (
                    <div key={i} className="h-9 w-9 rounded-full bg-white border-2 border-white grid place-items-center shadow-sm" style={{ zIndex: 10 - i }}>{a}</div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => <IconStar key={i} size={14} className="fill-amber-400 text-amber-400" />)}
                  </div>
                  <div className="mt-0.5">4.9 / 5 平均评分</div>
                </div>
              </div>
            </div>

            <div className="relative animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <div className="relative rounded-[2rem] overflow-hidden shadow-pop border border-ink-100">
                <img src="/hero-study.jpg" alt="专注学习的语言学习者" className="w-full h-[420px] sm:h-[480px] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/20 to-transparent" />
              </div>
              {/* Floating cards */}
              <div className="absolute -left-4 sm:-left-8 top-10 card p-3.5 w-44 animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-brand-600 grid place-items-center text-white"><IconFlame size={18} /></div>
                  <div>
                    <div className="text-xs text-ink-500">连续学习</div>
                    <div className="font-display text-sm font-bold text-ink-900">12 天 🔥</div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 sm:-right-6 bottom-12 card p-3.5 w-48 animate-fade-up" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
                  <span>本周学习</span><span>142 分钟</span>
                </div>
                <div className="flex items-end gap-1 h-10">
                  {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand-200 to-brand-500" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-ink-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: '3', l: '主流语种', s: '英语 · 日语 · 韩语' },
            { n: '200+', l: '精品课程', s: '分级课程体系' },
            { n: '4 大', l: '学习模块', s: '听说读写全覆盖' },
            { n: '38 万+', l: '活跃学习者', s: '社区每日打卡' },
          ].map((s) => (
            <div key={s.l} className="text-center md:text-left">
              <div className="font-display text-3xl font-extrabold text-brand-600">{s.n}</div>
              <div className="mt-1 text-sm font-semibold text-ink-900">{s.l}</div>
              <div className="text-xs text-ink-500">{s.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Languages */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="section-title text-3xl">三大学主流语种 · 任你选择</h2>
            <p className="mt-3 text-ink-600">从入门到精通，覆盖国际通用能力等级标准，每个语种都有完整的分级课程体系。</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {LANGUAGES.map((l, i) => (
              <div key={l.code} className="card-hover p-7 group" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-start justify-between">
                  <div className="h-14 w-14 rounded-2xl grid place-items-center text-3xl" style={{ background: `${l.color}15` }}>{l.flag}</div>
                  <span className="chip border border-ink-200 text-ink-500">{l.cefr.length} 个等级</span>
                </div>
                <h3 className="mt-5 font-display text-xl font-bold text-ink-900">{l.name} <span className="text-ink-400 font-normal text-sm">{l.englishName}</span></h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.cefr.map((c) => (
                    <span key={c} className="chip bg-ink-50 text-ink-600 text-[11px]">{c}</span>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm text-ink-500">64 门课程</span>
                  <span className="text-sm font-semibold group-hover:text-brand-600 transition-colors" style={{ color: l.color }}>查看课程 →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Graded course system */}
      <section id="courses" className="py-20 lg:py-28 bg-white border-y border-ink-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="chip bg-brand-50 text-brand-700 border border-brand-100">能力 1 · 分级课程体系</span>
              <h2 className="mt-4 section-title text-3xl">与国际标准对齐的分级课程</h2>
              <p className="mt-4 text-ink-600 leading-relaxed">
                英语对接 CEFR（A1-C1），日语对接 JLPT（N5-N1），韩语对接 TOPIK（1-5 级）。每门课程由资深教研团队设计，从发音、词汇、语法到场景应用，循序渐进，让每一级都有明确的能力目标。
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  '清晰的等级划分，精准匹配你的当前水平',
                  '每节课含目标、讲解、练习与小结四段式结构',
                  '课程间能力衔接，告别"学完不知道下一步"',
                  '真实场景语料，学以致用而非死记硬背',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm text-ink-700">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-brand-100 grid place-items-center shrink-0"><IconCheck size={13} className="text-brand-600" /></span>
                    {t}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="mt-8 btn-primary">浏览全部课程 <IconArrowRight size={16} /></Link>
            </div>
            <div>
              <div className="card p-6">
                <div className="text-xs font-semibold text-ink-400 mb-4">CEFR · 国际语言能力等级标准</div>
                <div className="space-y-2.5">
                  {LEVELS.map((lv, i) => (
                    <div key={lv} className="flex items-center gap-4">
                      <div className="w-16 shrink-0 text-sm font-bold" style={{ color: ['#16a34a', '#65a30d', '#ca8a04', '#ea580c', '#dc2626'][i] }}>{lv.split(' ')[0]}</div>
                      <div className="flex-1">
                        <div className="h-9 rounded-lg bg-ink-50 overflow-hidden relative">
                          <div className="h-full rounded-lg flex items-center px-3 text-xs font-medium text-white" style={{ width: `${20 + i * 18}%`, background: ['#16a34a', '#65a30d', '#ca8a04', '#ea580c', '#dc2626'][i] }}>{lv.split(' ')[1]}</div>
                        </div>
                      </div>
                      <div className="w-20 text-right text-xs text-ink-500">{[48, 56, 42, 38, 32][i]} 门</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-5 border-t border-ink-100 grid grid-cols-3 gap-3 text-center">
                  {[{ n: '248', l: '总课程' }, { n: '3.2万', l: '视频时长' }, { n: '4.9', l: '平均评分' }].map((s) => (
                    <div key={s.l}>
                      <div className="font-display text-lg font-bold text-ink-900">{s.n}</div>
                      <div className="text-[11px] text-ink-500">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive learning modules */}
      <section id="modules" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="chip bg-violet-50 text-violet-700 border border-violet-100">能力 2 · 互动式学习模块</span>
            <h2 className="mt-4 section-title text-3xl">听说读写 · 四大互动学习模块</h2>
            <p className="mt-3 text-ink-600">每个模块都基于学习科学设计，让知识从"记住"到"会用"，告别被动观看的视频课。</p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {modules.map((m, i) => (
              <div key={m.title} className="card-hover p-7 animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${m.color} grid place-items-center text-white shrink-0`}>
                    <m.icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-bold text-ink-900">{m.title}</h3>
                    <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">{m.desc}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.tags.map((t) => (
                        <span key={t} className="chip bg-ink-50 text-ink-600 text-[11px]">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Progress + Personalized path */}
      <section id="path" className="py-20 lg:py-28 bg-gradient-to-b from-brand-50/40 to-white border-y border-ink-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="chip bg-emerald-50 text-emerald-700 border border-emerald-100">能力 3 · 4 · 学习进度追踪与个性化路径</span>
            <h2 className="mt-4 section-title text-3xl">看得见的进步，走得准的路径</h2>
            <p className="mt-4 text-ink-600 leading-relaxed">
              从注册那一刻起，平台就开始为你建模。学习时长、掌握词汇、答题正确率自动汇总成可视化看板；AI 根据你的目标、水平与每日时间，生成专属学习路径并动态调整。
            </p>
            <div className="mt-7 grid sm:grid-cols-2 gap-4">
              {features.map((f) => (
                <div key={f.title} className="flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white border border-ink-200 grid place-items-center text-brand-600 shrink-0"><f.icon size={20} /></div>
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{f.title}</div>
                    <div className="text-xs text-ink-500 mt-0.5 leading-relaxed">{f.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-xs text-ink-500">早上好，林同学</div>
                  <div className="font-display text-lg font-bold text-ink-900">今日学习概览</div>
                </div>
                <div className="chip bg-rose-50 text-rose-600 border border-rose-100"><IconFlame size={13} /> 连续 12 天</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ n: '142', l: '今日分钟', c: 'text-brand-600' }, { n: '38', l: '今日单词', c: 'text-violet-600' }, { n: '92%', l: '正确率', c: 'text-emerald-600' }].map((s) => (
                  <div key={s.l} className="rounded-xl bg-ink-50 p-3 text-center">
                    <div className={`font-display text-xl font-bold ${s.c}`}>{s.n}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <div className="text-xs font-medium text-ink-500 mb-2">本周学习时长</div>
                <div className="flex items-end gap-2 h-24">
                  {[
                    { d: '一', m: 40 }, { d: '二', m: 65 }, { d: '三', m: 30 }, { d: '四', m: 80 },
                    { d: '五', m: 55 }, { d: '六', m: 90 }, { d: '日', m: 70 },
                  ].map((b, i) => (
                    <div key={b.d} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full rounded-t-md bg-gradient-to-t from-brand-200 to-brand-500 relative group" style={{ height: `${b.m}%` }}>
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-ink-600 opacity-0 group-hover:opacity-100 transition-opacity">{b.m}</span>
                      </div>
                      <span className="text-[10px] text-ink-400">{b.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -right-3 -bottom-3 card p-3.5 w-44 animate-pop-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 mb-2"><IconSparkle size={14} /> 个性化路径</div>
              <div className="text-[11px] text-ink-500 mb-2">今日推荐</div>
              <div className="space-y-1.5">
                {['口语跟读 · 餐厅点餐', '词汇复习 · 8 个待复习', '语法练习 · 虚拟语气'].map((t, i) => (
                  <div key={t} className="flex items-center gap-2 text-xs text-ink-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />{t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community + Achievements */}
      <section id="community" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="chip bg-amber-50 text-amber-700 border border-amber-100">能力 5 · 6 · 社区与成就</span>
            <h2 className="mt-4 section-title text-3xl">一个人走得快，一群人走得远</h2>
            <p className="mt-3 text-ink-600">加入活跃的学习社区，每日打卡、组队挑战；用等级、徽章与连击系统，把坚持变成习惯。</p>
          </div>
          <div className="mt-12 grid lg:grid-cols-2 gap-6">
            {/* Community preview */}
            <div className="card p-7">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-lg font-bold text-ink-900 flex items-center gap-2"><IconUsers size={20} className="text-brand-600" /> 学习社区</h3>
                <span className="chip bg-emerald-50 text-emerald-600 border border-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 2,340 在线</span>
              </div>
              <div className="space-y-4">
                {[
                  { a: '🦊', n: '林小染', b: '日语', t: '分享 N2 备考心得，每天听写 30 分钟 NHK，三个月听力提升超明显！', l: 248, c: 32 },
                  { a: '🐼', n: 'Alex', b: '韩语', t: 'Day 30 韩语打卡 🎉 从零基础到能看懂韩剧台词了！', l: 512, c: 67 },
                ].map((p) => (
                  <div key={p.n} className="flex gap-3 p-3 rounded-xl hover:bg-ink-50 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-ink-100 grid place-items-center text-lg shrink-0">{p.a}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm"><span className="font-semibold text-ink-900">{p.n}</span><span className="chip bg-ink-50 text-ink-500 text-[10px] py-0.5">{p.b}</span></div>
                      <p className="mt-1 text-sm text-ink-600 line-clamp-2">{p.t}</p>
                      <div className="mt-1.5 flex items-center gap-4 text-xs text-ink-400">
                        <span className="flex items-center gap-1">❤ {p.l}</span>
                        <span className="flex items-center gap-1">💬 {p.c}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/register" className="mt-5 btn-secondary w-full">加入社区讨论</Link>
            </div>

            {/* Achievements preview */}
            <div className="card p-7 bg-gradient-to-br from-white to-brand-50/40">
              <h3 className="font-display text-lg font-bold text-ink-900 flex items-center gap-2 mb-5"><IconTrophy size={20} className="text-amber-500" /> 成就激励系统</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { i: '🔥', t: '一周坚持', on: true }, { i: '📚', t: '词汇达人', on: true },
                  { i: '🎤', t: '口语新秀', on: true }, { i: '🌍', t: '多语学者', on: true },
                  { i: '🏆', t: '词汇大师', on: false }, { i: '⚡', t: '月度学霸', on: false },
                  { i: '💬', t: '社区活跃', on: false }, { i: '🎓', t: '课程毕业', on: true },
                ].map((b) => (
                  <div key={b.t} className={`rounded-2xl p-3 text-center border ${b.on ? 'border-amber-200 bg-amber-50' : 'border-ink-100 bg-ink-50 opacity-50'}`}>
                    <div className="text-2xl">{b.on ? b.i : '🔒'}</div>
                    <div className="mt-1 text-[10px] font-medium text-ink-700 leading-tight">{b.t}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-white border border-ink-100 p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-semibold text-ink-900">Lv.12 · 学者</span>
                  <span className="text-ink-500">2,450 / 3,000 XP</span>
                </div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full" style={{ width: '82%' }} />
                </div>
                <div className="mt-1.5 text-xs text-ink-400">距离下一等级还差 550 XP</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 lg:px-8">
          <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 px-8 py-16 text-center text-white">
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="relative">
              <div className="text-5xl">🌍</div>
              <h2 className="mt-5 font-display text-3xl sm:text-4xl font-extrabold">现在就开始你的第一节课</h2>
              <p className="mt-3 text-brand-100 max-w-xl mx-auto">注册即送 7 天体验会员，全平台课程任你畅学。零基础也能上手，每天 15 分钟，遇见更好的自己。</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/register" className="btn btn-lg bg-white text-brand-700 hover:bg-brand-50">免费注册 <IconArrowRight size={18} /></Link>
                <Link to="/login" className="btn btn-lg bg-white/10 text-white border border-white/30 hover:bg-white/20">登录账号</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="font-display text-xl font-extrabold text-ink-900">Lingua<span className="text-brand-600">Flow</span></div>
              <p className="mt-3 text-sm text-ink-500 max-w-sm">沉浸式多语种在线学习平台，让每个人都能轻松掌握一门新语言。</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-900 mb-3">产品</div>
              <ul className="space-y-2 text-sm text-ink-500">
                <li><a href="#courses" className="hover:text-brand-600">课程体系</a></li>
                <li><a href="#modules" className="hover:text-brand-600">学习模块</a></li>
                <li><a href="#path" className="hover:text-brand-600">学习路径</a></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-900 mb-3">关于</div>
              <ul className="space-y-2 text-sm text-ink-500">
                <li><a href="#community" className="hover:text-brand-600">学习社区</a></li>
                <li><a href="#" className="hover:text-brand-600">帮助中心</a></li>
                <li><a href="#" className="hover:text-brand-600">联系我们</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-ink-100 flex flex-col sm:flex-row justify-between gap-3 text-xs text-ink-400">
            <span>© 2026 LinguaFlow. 让语言学习更高效。</span>
            <span>用 ❤️ 为语言学习者打造</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
