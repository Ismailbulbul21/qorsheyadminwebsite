import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Users, CreditCard, BarChart3, LogOut } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type RawStats = {
  totalCustomers: number
  activeSubscriptions: number
  dailyPlanCounts: { day: string; plan_type: string; count: number }[]
}

const PLAN_ORDER = ['monthly', '3month', '6month', 'week', 'yearly']
const PLAN_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  '3month': '3 Month',
  '6month': '6 Month',
  week: 'Weekly',
  yearly: 'Yearly',
}
const PLAN_COLORS: Record<string, string> = {
  monthly: '#6366f1',
  '3month': '#10b981',
  '6month': '#f59e0b',
  week: '#94a3b8',
  yearly: '#ef4444',
}

const WINDOWS = [
  { label: '1 Month', months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
]

export function ViewerDashboard() {
  const { user, signOut } = useAuth()
  const [raw, setRaw] = useState<RawStats | null>(null)
  const [windowMonths, setWindowMonths] = useState(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, error: e } = await supabase.rpc('get_viewer_dashboard_stats', { days_back: 180 })
        if (cancelled) return
        if (e) throw e
        setRaw(data as RawStats)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load stats')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const { chartData, planTotals, monthKeys } = useMemo(() => {
    if (!raw) return { chartData: [], planTotals: {} as Record<string, number>, monthKeys: [] as string[] }

    const byMonth = new Map<string, Record<string, number>>()
    for (const row of raw.dailyPlanCounts) {
      const month = row.day.slice(0, 7)
      const entry = byMonth.get(month) ?? {}
      entry[row.plan_type] = (entry[row.plan_type] ?? 0) + row.count
      byMonth.set(month, entry)
    }

    const sortedMonths = Array.from(byMonth.keys()).sort()
    const lastN = sortedMonths.slice(-windowMonths)

    const data = lastN.map((month) => {
      const entry = byMonth.get(month) ?? {}
      const [y, m] = month.split('-')
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      return { month: label, ...entry }
    })

    const totals: Record<string, number> = {}
    for (const month of lastN) {
      const entry = byMonth.get(month) ?? {}
      for (const [plan, count] of Object.entries(entry)) {
        totals[plan] = (totals[plan] ?? 0) + count
      }
    }

    return { chartData: data, planTotals: totals, monthKeys: lastN }
  }, [raw, windowMonths])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-slate-500 font-medium animate-pulse">Loading stats...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-red-700">
        <h3 className="font-bold text-lg">Failed to load</h3>
        <p className="text-red-600/80">{error}</p>
      </div>
    )
  }

  if (!raw) return null

  const plansPresent = PLAN_ORDER.filter((p) => chartData.some((d) => p in d))

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">Qorsheyn</span>
          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest ml-2">Viewer</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 hidden sm:inline">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 mt-1">Customers, subscriptions, and plan activity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Customers</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{raw.totalCustomers.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Subscriptions</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{raw.activeSubscriptions.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Subscriptions by Plan</h3>
              <p className="text-sm text-slate-500">Monthly, 3-month, and 6-month plan activity</p>
            </div>
            <div className="flex gap-2">
              {WINDOWS.map((w) => (
                <button
                  key={w.months}
                  onClick={() => setWindowMonths(w.months)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    windowMonths === w.months
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value, name) => [value, PLAN_LABELS[String(name)] ?? String(name)]}
                />
                <Legend formatter={(name) => PLAN_LABELS[String(name)] ?? String(name)} />
                {plansPresent.map((plan) => (
                  <Bar key={plan} dataKey={plan} stackId="plans" fill={PLAN_COLORS[plan]} radius={plan === plansPresent[plansPresent.length - 1] ? [6, 6, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Plan Totals — Last {windowMonths} Month{windowMonths > 1 ? 's' : ''}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Subscribers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PLAN_ORDER.filter((p) => planTotals[p] > 0).map((plan) => (
                  <tr key={plan} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS[plan] }}></div>
                        <span className="text-sm font-semibold text-slate-700">{PLAN_LABELS[plan]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{planTotals[plan].toLocaleString()}</td>
                  </tr>
                ))}
                {monthKeys.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-10 text-center text-slate-400 font-medium">No subscription activity in this window.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
