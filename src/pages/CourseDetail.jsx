import { useParams, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { LANGUAGES } from '../data/content'
import { ProgressBar, LangBadge, CircularProgress } from '../components/Primitives'
import {
  IconStar, IconUsers, IconClock, IconBook, IconCheck, IconChevronRight,
  IconMic, IconTarget, IconChart, IconArrowRight, IconLock, IconBook as IconWord,
} from '../components/Icons'

function langOf(code) {
  return LANGUAGES.find((l) => l.code === code)
}

const typeMeta = {
  word: { label: '词汇', icon: IconWord, color: 'text-brand-600 bg-brand-50', to: 'word' },
  grammar: { label: '语法', icon: IconTarget, color: 'text-violet-600 bg-violet-50', to: 'grammar' },
  speaking: { label: '口语', icon: IconMic, color: 'text-rose-600 bg-rose-50', to: 'speaking' },
  listening: { label: '听力', icon: IconChart, color: 'text-amber-600 bg-amber-50', to: 'listening' },
}

export default function CourseDetail() {
  const { id } = useParams()
  const { courses, user, enrollCourse } = useApp()
  const course = courses.find((c) => c.id === id)

  if (!course) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-4 font-display text-xl font-bold text-ink-900">课程不存在</h1>
        <Link to="/app/courses" className="mt-4 btn-primary btn-sm">返回课程中心</Link>
      </div>
    )
  }

  const l = langOf(course.language)
  const enrolled = user.enrolledCourses.includes(course.id)
  const lessons = course.lessonsData.length ? course.lessonsData : []
  const doneCount = lessons.filter((x) => x.done).length

  return (
    <div>
      {/* Hero banner */}
      <div className="relative" style={{ background: `linear-gradient(135deg, ${l.color}, ${l.color}dd)` }}>
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 lg:py-14 relative">
          <Link to="/app/courses" className="inline-flex items-center gap-1.5 text-white/80 text-sm hover:text-white mb-6">
            <IconChevronRight size={14} className="rotate-180" /> 课程中心
          </Link>
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <LangBadge code={course.language} />
                <span className="chip bg-white/20 text-white text-[11px]">{course.level}</span>
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-white">{course.title}</h1>
              <p className="mt-2 text-white/90 text-lg">{course.subtitle}</p>
              <p className="mt-4 text-white/80 leading-relaxed max-w-2xl">{course.description}</p>

              <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-white/90">
                <span className="flex items-center gap-1.5"><IconBook size={16} />{course.lessons} 课时</span>
                <span className="flex items-center gap-1.5"><IconClock size={16} />{course.hours} 小时</span>
                <span className="flex items-center gap-1.5"><IconUsers size={16} />{(course.students / 10000).toFixed(1)}万人在学</span>
                <span className="flex items-center gap-1.5"><IconStar size={16} className="fill-white" />{course.rating} 评分</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {enrolled ? (
                  <Link to={`/app/learn/${lessons.find((x) => !x.done)?.to || 'word'}/${course.language}`} className="btn btn-lg bg-white" style={{ color: l.color }}>
                    {doneCount > 0 ? '继续学习' : '开始学习'} <IconArrowRight size={18} />
                  </Link>
                ) : (
                  <button onClick={() => enrollCourse(course.id)} className="btn btn-lg bg-white" style={{ color: l.color }}>
                    加入课程 <IconArrowRight size={18} />
                  </button>
                )}
                <button className="btn btn-lg bg-white/10 text-white border border-white/30 hover:bg-white/20">收藏课程</button>
              </div>
            </div>

            {/* Progress ring */}
            <div className="card p-6 w-full lg:w-72 shrink-0 bg-white/95 backdrop-blur">
              <div className="text-center">
                <CircularProgress value={course.progress} size={120} stroke={10} color={l.color} />
                <div className="mt-3 text-sm font-semibold text-ink-900">学习进度</div>
                <div className="text-xs text-ink-500">{lessons.length ? `${doneCount}/${lessons.length} 节完成` : '尚未开始'}</div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-ink-50 p-3">
                  <div className="font-display text-lg font-bold text-ink-900">{course.skills.length}</div>
                  <div className="text-[11px] text-ink-500">技能覆盖</div>
                </div>
                <div className="rounded-xl bg-ink-50 p-3">
                  <div className="font-display text-lg font-bold text-ink-900">{course.hours}h</div>
                  <div className="text-[11px] text-ink-500">预计时长</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-ink-900">课程目录</h2>
              <span className="text-sm text-ink-500">{lessons.length} 节 · {doneCount} 已完成</span>
            </div>
            <div className="card divide-y divide-ink-100 overflow-hidden">
              {lessons.length === 0 ? (
                <div className="p-10 text-center text-sm text-ink-500">课程内容整理中，敬请期待 ✨</div>
              ) : (
                lessons.map((lesson, i) => {
                  const tm = typeMeta[lesson.type]
                  const locked = i > 0 && !lessons[i - 1].done && !lesson.done
                  return (
                    <Link
                      key={lesson.id}
                      to={locked ? '#' : `/app/learn/${tm.to}/${course.language}`}
                      className={`flex items-center gap-4 p-4 transition-colors ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-ink-50'}`}
                    >
                      <div className="text-sm font-bold text-ink-400 w-6 shrink-0">{String(i + 1).padStart(2, '0')}</div>
                      <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${tm.color}`}>
                        <tm.icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${tm.color}`}>{tm.label}</span>
                          <span className="text-xs text-ink-500">+{lesson.xp} XP</span>
                        </div>
                        <div className="text-sm font-medium text-ink-900 mt-0.5 truncate">{lesson.title}</div>
                      </div>
                      <div className="shrink-0">
                        {lesson.done ? (
                          <span className="h-7 w-7 rounded-full bg-emerald-100 grid place-items-center"><IconCheck size={14} className="text-emerald-600" /></span>
                        ) : locked ? (
                          <span className="h-7 w-7 rounded-full bg-ink-100 grid place-items-center"><IconLock size={13} className="text-ink-400" /></span>
                        ) : (
                          <span className="h-7 w-7 rounded-full bg-brand-50 grid place-items-center"><IconChevronRight size={14} className="text-brand-600" /></span>
                        )}
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          {/* Side */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-display text-base font-bold text-ink-900 mb-4">课程亮点</h3>
              <ul className="space-y-3">
                {[
                  '场景化教学，学完即用',
                  'AI 发音评分，告别哑巴外语',
                  '间隔重复，记忆更牢固',
                  '配套真题模拟，应试无忧',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-brand-100 grid place-items-center shrink-0"><IconCheck size={12} className="text-brand-600" /></span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6">
              <h3 className="font-display text-base font-bold text-ink-900 mb-4">你将掌握</h3>
              <div className="flex flex-wrap gap-2">
                {course.skills.map((s) => (
                  <span key={s} className="chip bg-ink-50 text-ink-700">{s}</span>
                ))}
              </div>
              <div className="mt-5 pt-5 border-t border-ink-100">
                <div className="text-xs text-ink-500 mb-2">适合人群</div>
                <p className="text-sm text-ink-700">{course.level}学习者，希望系统提升{course.skills.join('、')}能力。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
