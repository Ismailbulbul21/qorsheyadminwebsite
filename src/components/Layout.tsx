import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const nav = [
    { path: '/', label: 'Dashboard' },
    { path: '/users', label: 'Users' },
    { path: '/subscriptions', label: 'Subscriptions' },
    { path: '/revenue', label: 'Revenue' },
    { path: '/pricing', label: 'Pricing' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-semibold text-lg text-gray-900">
            Qorsheyn Admin
          </Link>
          <nav className="hidden md:flex gap-1">
            {nav.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === path
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 truncate max-w-[180px]" title={user?.email ?? ''}>
            {user?.email ?? ''}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="md:hidden border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto">
        {nav.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              location.pathname === path ? 'bg-gray-100' : 'text-gray-600'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
