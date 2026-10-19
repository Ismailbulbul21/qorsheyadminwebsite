import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Users, CreditCard, BarChart3, LogOut, ShoppingBag, CalendarRange } from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from 'recharts'

type RawStats = {
  totalCustomers: number
  activeSubscriptions: number
  dailyPlanCounts: { day: string; plan_type: string; count: number }[]
}

const PLAN_ORDER = ['week', 'monthly', '3month', '6month', 'yearly']
const PLAN_LABELS: Record<string, string> = {
  week: 'Weekly',
  monthly: 'Monthly',
  '3month': '3 Month',
  '6month': '6 Month',
  yearly: 'Yearly',
}
const PLAN_COLORS: Record<string, string> = {
  week: '#94a3b8',
  monthly: '#6366f1',
  '3month': '#10b981',
  '6month': '#f59e0b',
  yearly: '#ef4444',
}

function toUTCDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatDisplayDate(dayStr: string) {
  return new Date(`${dayStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function buildPeriods() {
  const now = new Date()
  const todayStr = toUTCDateStr(now)

  const yesterdayDate = new Date(now)
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterdayStr = toUTCDateStr(yesterdayDate)

  const thisMonthPrefix = todayStr.slice(0, 7)
  const thisMonthLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })

  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const lastMonthPrefix = toUTCDateStr(lastMonthDate).slice(0, 7)
  const lastMonthLabel = lastMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return [
    {
      key: 'yesterday',
      label: 'Yesterday',
      description: new Date(yesterdayStr).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
      matches: (day: string) => day === yesterdayStr,
    },
    {
      key: 'today',
      label: 'Today',
      description: new Date(todayStr).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
      matches: (day: string) => day === todayStr,
    },
    {
      key: 'thisMonth',
      label: 'This Month',
      description: thisMonthLabel,
      matches: (day: string) => day.startsWith(thisMonthPrefix),
    },
    {
      key: 'lastMonth',
      label: 'Last Month',
      description: lastMonthLabel,
      matches: (day: string) => day.startsWith(lastMonthPrefix),
    },
  ]
}

const TODAY_STR = toUTCDateStr(new Date())

export function ViewerDashboard() {
  const { user, signOut } = useAuth()
  const [raw, setRaw] = useState<RawStats | null>(null)
  const [periodKey, setPeriodKey] = useState('thisMonth')
  const [customStart, setCustomStart] = useState(TODAY_STR)
  const [customEnd, setCustomEnd] = useState(TODAY_STR)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fixedPeriods = useMemo(buildPeriods, [])

  const activePeriod = useMemo(() => {
    if (periodKey === 'custom') {
      const valid = Boolean(customStart) && Boolean(customEnd) && customStart <= customEnd
      return {
        key: 'custom',
        label: 'Custom Range',
        description: valid
          ? `${formatDisplayDate(customStart)} – ${formatDisplayDate(customEnd)}`
          : 'Pick a start and end date',
        matches: (day: string) => valid && day >= customStart && day <= customEnd,
      }
    }
    return fixedPeriods.find((p) => p.key === periodKey) ?? fixedPeriods[2]
  }, [periodKey, customStart, customEnd, fixedPeriods])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, error: e } = await supabase.rpc('get_viewer_dashboard_stats', { days_back: 400 })
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

  const { chartData, planTotals, totalPurchases } = useMemo(() => {
    if (!raw) return { chartData: [], planTotals: {} as Record<string, number>, totalPurchases: 0 }

    const totals: Record<string, number> = {}
    for (const row of raw.dailyPlanCounts) {
      if (!activePeriod.matches(row.day)) continue
      totals[row.plan_type] = (totals[row.plan_type] ?? 0) + row.count
    }

    const data = PLAN_ORDER.map((plan) => ({
      plan,
      label: PLAN_LABELS[plan],
      count: totals[plan] ?? 0,
      fill: PLAN_COLORS[plan],
    }))

    const total = Object.values(totals).reduce((sum, v) => sum + v, 0)

    return { chartData: data, planTotals: totals, totalPurchases: total }
  }, [raw, activePeriod])

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

        {/* Period Selector */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Plan Purchases</h3>
              <p className="text-sm text-slate-500">{activePeriod.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {fixedPeriods.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriodKey(p.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    periodKey === p.key
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setPeriodKey('custom')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  periodKey === 'custom'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                Custom Range
              </button>
            </div>
          </div>

          {periodKey === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-3">
              <div className="flex items-center gap-2">
                <label htmlFor="custom-start" className="text-xs font-bold text-slate-500 uppercase tracking-wider">From</label>
                <input
                  id="custom-start"
                  type="date"
                  value={customStart}
                  max={customEnd || TODAY_STR}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="custom-end" className="text-xs font-bold text-slate-500 uppercase tracking-wider">To</label>
                <input
                  id="custom-end"
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={TODAY_STR}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 mb-2">
            <ShoppingBag className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">
              <span className="font-bold text-slate-900">{totalPurchases.toLocaleString()}</span> total purchases
            </span>
          </div>

          <div className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [value, 'Subscribers']}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} maxBarSize={72}>
                  {chartData.map((d) => (
                    <Cell key={d.plan} fill={d.fill} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fill: '#0f172a', fontWeight: 700, fontSize: 14 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {PLAN_ORDER.map((plan) => (
            <div key={plan} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: `${PLAN_COLORS[plan]}1a` }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAN_COLORS[plan] }}></div>
              </div>
              <p className="text-2xl font-black text-slate-900">{(planTotals[plan] ?? 0).toLocaleString()}</p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{PLAN_LABELS[plan]}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
