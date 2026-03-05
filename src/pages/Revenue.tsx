import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type RevenueStats = {
  total: number
  byPlan: { plan_type: string; total: number }[]
  byChannel: { payment_channel: string | null; total: number }[]
  byDay: { date: string; total: number }[]
}

export function Revenue() {
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: rows, error: e } = await supabase
          .from('subscriptions')
          .select('amount, plan_type, payment_channel, created_at')
          .in('status', ['active', 'expired', 'canceled'])
          .not('amount', 'is', null)

        if (cancelled) return
        if (e) throw e

        const list = (rows ?? []) as { amount: number; plan_type: string; payment_channel: string | null; created_at: string | null }[]
        const total = list.reduce((sum, r) => sum + Number(r.amount), 0)

        const byPlanMap = new Map<string, number>()
        const byChannelMap = new Map<string, number>()
        const byDayMap = new Map<string, number>()
        for (const r of list) {
          const amt = Number(r.amount)
          byPlanMap.set(r.plan_type, (byPlanMap.get(r.plan_type) ?? 0) + amt)
          const ch = r.payment_channel ?? 'unknown'
          byChannelMap.set(ch, (byChannelMap.get(ch) ?? 0) + amt)
          const day = r.created_at ? r.created_at.slice(0, 10) : ''
          if (day) byDayMap.set(day, (byDayMap.get(day) ?? 0) + amt)
        }

        const byPlan = Array.from(byPlanMap.entries()).map(([plan_type, total]) => ({ plan_type, total }))
        const byChannel = Array.from(byChannelMap.entries()).map(([payment_channel, total]) => ({ payment_channel, total }))
        const byDay = Array.from(byDayMap.entries())
          .map(([date, total]) => ({ date, total }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-30)

        setStats({ total, byPlan, byChannel, byDay })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="text-gray-500">Loading…</div>
  if (error) return <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
  if (!stats) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Revenue</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Total revenue (all time, from subscriptions)</p>
        <p className="text-3xl font-semibold text-gray-900">
          ${stats.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">By plan</h2>
          {stats.byPlan.length === 0 ? (
            <p className="text-gray-500 text-sm">No data</p>
          ) : (
            <ul className="space-y-2">
              {stats.byPlan.map(({ plan_type, total }) => (
                <li key={plan_type} className="flex justify-between text-sm">
                  <span className="text-gray-700">{plan_type}</span>
                  <span className="font-medium">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">By payment channel</h2>
          {stats.byChannel.length === 0 ? (
            <p className="text-gray-500 text-sm">No data</p>
          ) : (
            <ul className="space-y-2">
              {stats.byChannel.map(({ payment_channel, total }) => (
                <li key={payment_channel ?? 'null'} className="flex justify-between text-sm">
                  <span className="text-gray-700">{payment_channel ?? '—'}</span>
                  <span className="font-medium">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Revenue over time (last 30 days with data)</h2>
        {stats.byDay.length === 0 ? (
          <p className="text-gray-500 text-sm">No data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">Date</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats.byDay.map(({ date, total }) => (
                  <tr key={date} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{date}</td>
                    <td className="py-2 text-right font-medium">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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
