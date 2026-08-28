import { createContext, useContext, useState, useCallback } from 'react'
import { COURSES } from '../data/content'

const AppContext = createContext(null)

const STORAGE_KEY = 'linguaflow_user'

const defaultUser = {
  name: '林同学',
  email: 'learner@linguaflow.com',
  avatar: '🦊',
  level: 12,
  xp: 2450,
  xpToNext: 3000,
  streak: 12,
  joinedDays: 86,
  totalMinutes: 4320,
  wordsMastered: 142,
  lessonsDone: 58,
  accuracy: 92,
  enrolledCourses: ['en-b1', 'ja-n3', 'ko-1'],
  achievements: ['first-step', 'streak-7', 'words-100', 'speaking-10', 'polyglot', 'early-bird', 'course-done'],
  plan: null,
}

export function AppProvider({ children }) {
  // Read persisted user synchronously to avoid a redirect race on direct URL load
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [authed, setAuthed] = useState(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY)
    } catch {
      return false
    }
  })

  const login = useCallback((email, password) => {
    // Demo: any credentials log into the default learner profile
    const next = { ...defaultUser, email: email || defaultUser.email }
    setUser(next)
    setAuthed(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  }, [])

  const register = useCallback(({ name, email, targetLang, goal, level }) => {
    const next = {
      ...defaultUser,
      name: name || '新同学',
      email: email || 'new@linguaflow.com',
      avatar: '🌟',
      level: 1,
      xp: 0,
      xpToNext: 1000,
      streak: 0,
      joinedDays: 0,
      totalMinutes: 0,
      wordsMastered: 0,
      lessonsDone: 0,
      accuracy: 0,
      enrolledCourses: [],
      achievements: [],
      targetLang,
      goal,
      startLevel: level,
    }
    setUser(next)
    setAuthed(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setAuthed(false)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const addXp = useCallback((amount) => {
    setUser((prev) => {
      if (!prev) return prev
      const xp = prev.xp + amount
      let { level, xpToNext } = prev
      while (xp >= xpToNext) {
        level += 1
        xpToNext = Math.round(xpToNext * 1.4)
      }
      const next = { ...prev, xp, level, xpToNext }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const enrollCourse = useCallback((courseId) => {
    setUser((prev) => {
      if (!prev) return prev
      if (prev.enrolledCourses.includes(courseId)) return prev
      const next = { ...prev, enrolledCourses: [...prev.enrolledCourses, courseId] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const setPlan = useCallback((plan) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, plan }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = {
    user,
    authed,
    login,
    register,
    logout,
    addXp,
    enrollCourse,
    setPlan,
    courses: COURSES,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
