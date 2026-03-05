import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Subscription } from '../types/db'

const PAGE_SIZE = 20
const STATUSES = ['active', 'expired', 'canceled']
const CHANNELS = ['EVC', 'ZAAD', 'SAHAL', 'CARD', 'BANK']

export function Subscriptions() {
  const [list, setList] = useState<Subscription[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [planFilter, setPlanFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        let q = supabase.from('subscriptions').select('*', { count: 'exact' })
        if (statusFilter) q = q.eq('status', statusFilter)
        if (planFilter) q = q.eq('plan_type', planFilter)
        if (channelFilter) q = q.eq('payment_channel', channelFilter)
        if (search.trim()) q = q.or(`user_id.ilike.%${search.trim()}%,payment_reference.ilike.%${search.trim()}%`)
        const { data, error: e, count } = await q
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (cancelled) return
        if (e) throw e
        setList((data ?? []) as Subscription[])
        setTotal(count ?? 0)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, statusFilter, planFilter, channelFilter, search])

  useEffect(() => { setPage(0) }, [statusFilter, planFilter, channelFilter, search])

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Subscriptions</h1>

      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="search"
          placeholder="User ID or payment ref"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All plans</option>
          <option value="monthly">monthly</option>
          <option value="yearly">yearly</option>
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All channels</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No subscriptions found.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start – End</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {list.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono text-gray-700 truncate max-w-[140px]">{s.user_id}</td>
                    <td className="px-4 py-2 text-sm">{s.plan_type}</td>
                    <td className="px-4 py-2 text-sm">{s.status}</td>
                    <td className="px-4 py-2 text-sm">{s.payment_channel ?? '—'}</td>
                    <td className="px-4 py-2 text-sm">{s.amount != null ? `${s.currency ?? 'USD'} ${Number(s.amount).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(s.start_date).toLocaleDateString()} – {new Date(s.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <Link to={`/subscriptions/${s.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">Page {page + 1} of {totalPages} ({total} total)</span>
              <div className="flex gap-2">
                <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50">Previous</button>
                <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
