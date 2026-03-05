import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Users } from './pages/Users'
import { UserDetail } from './pages/UserDetail'
import { Subscriptions } from './pages/Subscriptions'
import { SubscriptionDetail } from './pages/SubscriptionDetail'
import { Revenue } from './pages/Revenue'
import { Pricing } from './pages/Pricing'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-red-200 p-6 max-w-md text-center">
          <h1 className="text-lg font-semibold text-red-700">Access denied</h1>
          <p className="text-gray-600 mt-2">You are not an admin. Only admins can access this dashboard.</p>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-4 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="pricing" element={<Pricing />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
