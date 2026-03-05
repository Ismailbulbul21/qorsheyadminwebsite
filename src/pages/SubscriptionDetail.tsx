import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Subscription } from '../types/db'

export function SubscriptionDetail() {
  const { id } = useParams<{ id: string }>()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      const { data, error: e } = await supabase.from('subscriptions').select('*').eq('id', id).single()
      if (cancelled) return
      if (e) setError(e.message)
      else setSub(data as Subscription)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  async function updateStatus(newStatus: 'active' | 'expired' | 'canceled') {
    if (!id || !sub) return
    setUpdating(true)
    setError(null)
    try {
      const oldValue = { status: sub.status, end_date: sub.end_date }
      const { error: e } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', id)
      if (e) throw e
      await supabase.from('audit_log').insert({
        admin_id: user?.id,
        action: 'update_subscription_status',
        entity_type: 'subscription',
        entity_id: id,
        old_value: oldValue,
        new_value: { status: newStatus },
      })
      setSub((prev) => prev ? { ...prev, status: newStatus } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="text-gray-500">Loading…</div>
  if (error && !sub) return <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
  if (!sub) return <div className="text-gray-500">Subscription not found.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/subscriptions" className="text-gray-500 hover:text-gray-700 text-sm">← Subscriptions</Link>
        <h1 className="text-2xl font-semibold text-gray-900">Subscription</h1>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <p><span className="text-gray-500">ID:</span> <span className="font-mono text-sm">{sub.id}</span></p>
        <p><span className="text-gray-500">User ID:</span> <Link to={`/users/${sub.user_id}`} className="font-mono text-sm text-blue-600 hover:underline">{sub.user_id}</Link></p>
        <p><span className="text-gray-500">Plan:</span> {sub.plan_type}</p>
        <p><span className="text-gray-500">Status:</span> {sub.status}</p>
        <p><span className="text-gray-500">Payment channel:</span> {sub.payment_channel ?? '—'}</p>
        <p><span className="text-gray-500">Amount:</span> {sub.amount != null ? `${sub.currency ?? 'USD'} ${Number(sub.amount).toFixed(2)}` : '—'}</p>
        <p><span className="text-gray-500">Payment reference:</span> {sub.payment_reference ?? '—'}</p>
        <p><span className="text-gray-500">Start:</span> {new Date(sub.start_date).toLocaleString()}</p>
        <p><span className="text-gray-500">End:</span> {new Date(sub.end_date).toLocaleString()}</p>
        <p><span className="text-gray-500">Created:</span> {sub.created_at ? new Date(sub.created_at).toLocaleString() : '—'}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-500">Change status (support):</span>
        {(['active', 'expired', 'canceled'] as const).map((s) => (
          <button
            key={s}
            type="button"
            disabled={updating || sub.status === s}
            onClick={() => updateStatus(s)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
