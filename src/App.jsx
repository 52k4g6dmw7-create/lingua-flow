import { Routes, Route, Navigate } from 'react-router-dom'
import MarketingLayout from './layouts/MarketingLayout'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import LearnWord from './pages/LearnWord'
import LearnGrammar from './pages/LearnGrammar'
import LearnSpeaking from './pages/LearnSpeaking'
import LearnListening from './pages/LearnListening'
import LearningPath from './pages/LearningPath'
import Community from './pages/Community'
import Achievements from './pages/Achievements'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketingLayout><Landing /></MarketingLayout>} />
      <Route path="/login" element={<MarketingLayout><Login /></MarketingLayout>} />
      <Route path="/register" element={<MarketingLayout><Register /></MarketingLayout>} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/courses"
        element={
          <ProtectedRoute>
            <AppLayout><Courses /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/courses/:id"
        element={
          <ProtectedRoute>
            <AppLayout><CourseDetail /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/learn/word/:lang"
        element={
          <ProtectedRoute>
            <AppLayout><LearnWord /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/learn/grammar/:lang"
        element={
          <ProtectedRoute>
            <AppLayout><LearnGrammar /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/learn/speaking/:lang"
        element={
          <ProtectedRoute>
            <AppLayout><LearnSpeaking /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/learn/listening/:lang"
        element={
          <ProtectedRoute>
            <AppLayout><LearnListening /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/path"
        element={
          <ProtectedRoute>
            <AppLayout><LearningPath /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/community"
        element={
          <ProtectedRoute>
            <AppLayout><Community /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/achievements"
        element={
          <ProtectedRoute>
            <AppLayout><Achievements /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
