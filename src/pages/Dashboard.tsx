import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Stats = {
  totalUsers: number
  activeSubscriptions: number
  totalRevenue: number
  recentSubscriptions: { id: string; user_id: string; plan_type: string; created_at: string }[]
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [profilesRes, subsRes, revenueRes, recentRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('subscriptions').select('amount').in('status', ['active', 'expired', 'canceled']).not('amount', 'is', null),
          supabase.from('subscriptions').select('id, user_id, plan_type, created_at').order('created_at', { ascending: false }).limit(10),
        ])

        if (cancelled) return

        const totalUsers = profilesRes.count ?? 0
        const activeSubscriptions = subsRes.count ?? 0
        const totalRevenue = (revenueRes.data ?? []).reduce((sum, r) => sum + Number(r.amount || 0), 0)
        const recentSubscriptions = (recentRes.data ?? []).map((s) => ({
          id: s.id,
          user_id: s.user_id,
          plan_type: s.plan_type,
          created_at: s.created_at ?? '',
        }))

        setStats({ totalUsers, activeSubscriptions, totalRevenue, recentSubscriptions })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
        {error}
      </div>
    )
  }
  if (!stats) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Subscriptions</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.activeSubscriptions}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-semibold text-gray-900">
            ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <h2 className="px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
          Recent subscriptions
        </h2>
        {stats.recentSubscriptions.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">No subscriptions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.recentSubscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono text-gray-700 truncate max-w-[200px]">{s.user_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{s.plan_type}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
