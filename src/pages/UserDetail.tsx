import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/db'
import type { Subscription } from '../types/db'

export function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      try {
        const [profileRes, subsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', id).single(),
          supabase.from('subscriptions').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        ])
        if (cancelled) return
        if (profileRes.error) throw profileRes.error
        setProfile(profileRes.data as Profile)
        setSubscriptions((subsRes.data ?? []) as Subscription[])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <div className="text-gray-500">Loading…</div>
  if (error) return <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
  if (!profile) return <div className="text-gray-500">User not found.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/users" className="text-gray-500 hover:text-gray-700 text-sm">← Users</Link>
        <h1 className="text-2xl font-semibold text-gray-900">User detail</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <p><span className="text-gray-500">ID:</span> <span className="font-mono text-sm">{profile.id}</span></p>
        <p><span className="text-gray-500">Email:</span> {profile.email ?? '—'}</p>
        <p><span className="text-gray-500">Focus type:</span> {profile.focus_type ?? '—'}</p>
        <p><span className="text-gray-500">Created:</span> {profile.created_at ? new Date(profile.created_at).toLocaleString() : '—'}</p>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <p className="text-gray-500 text-sm">No subscriptions.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{s.plan_type}</td>
                    <td className="px-4 py-2 text-sm">{s.status}</td>
                    <td className="px-4 py-2 text-sm">{s.payment_channel ?? '—'}</td>
                    <td className="px-4 py-2 text-sm">{s.amount != null ? `${s.currency ?? 'USD'} ${s.amount}` : '—'}</td>
                    <td className="px-4 py-2 text-sm">
                      {new Date(s.start_date).toLocaleDateString()} – {new Date(s.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <Link to={`/subscriptions/${s.id}`} className="text-blue-600 hover:text-blue-800 text-sm">View</Link>
                    </td>
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
