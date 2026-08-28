import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function ProtectedRoute({ children }) {
  const { authed } = useApp()
  if (!authed) return <Navigate to="/login" replace />
  return children
}
