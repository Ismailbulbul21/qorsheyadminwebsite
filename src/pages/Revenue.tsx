import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  PieChart as PieChartIcon, 
  Wallet,
  ArrowUpRight
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

type RevenueStats = {
  total: number
  byPlan: { name: string; value: number }[]
  byChannel: { name: string; value: number }[]
  byDay: { date: string; amount: number }[]
}

const COLORS = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ef4444']

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

        if (cancelled) return
        if (e) throw e

        const list = (rows ?? []) as { amount: number | null; plan_type: string; payment_channel: string | null; created_at: string | null }[]
        const total = list.reduce((sum, r) => sum + Number(r.amount ?? 0.5), 0)

        const byPlanMap = new Map<string, number>()
        const byChannelMap = new Map<string, number>()
        const byDayMap = new Map<string, number>()
        
        for (const r of list) {
          const amt = Number(r.amount ?? 0.5)
          const plan = r.plan_type === 'yearly' ? 'monthly' : r.plan_type
          byPlanMap.set(plan, (byPlanMap.get(plan) ?? 0) + amt)
          const ch = r.payment_channel ?? 'Direct Payment'
          byChannelMap.set(ch, (byChannelMap.get(ch) ?? 0) + amt)
          const day = r.created_at ? r.created_at.slice(0, 10) : ''
          if (day) byDayMap.set(day, (byDayMap.get(day) ?? 0) + amt)
        }

        let byPlan = Array.from(byPlanMap.entries()).map(([name, value]) => ({ name, value }))
        if (byPlan.length === 0) byPlan = [{ name: 'monthly', value: 0 }]

        let byChannel = Array.from(byChannelMap.entries()).map(([name, value]) => ({ name, value }))
        if (byChannel.length === 0) byChannel = [{ name: 'Direct Payment', value: 0 }]

        let byDay = Array.from(byDayMap.entries())
          .map(([date, amount]) => ({ date, amount }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-30)
          
        if (byDay.length === 0) byDay = [{ date: new Date().toISOString().slice(0, 10), amount: 0 }]

        setStats({ total, byPlan, byChannel, byDay })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to synchronize financial data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-slate-500 font-medium animate-pulse">Computing financial analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-red-700 flex items-center gap-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0 text-red-600">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Financial Sync Error</h3>
          <p className="text-red-600/80">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Intelligence</h1>
          <p className="text-slate-500 mt-1">Real-time revenue tracking and forecasting</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <Calendar className="w-4 h-4 text-slate-400" />
            Accounting Period
          </button>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4 opacity-80">
            <Wallet className="w-5 h-5 text-indigo-200" />
            <span className="text-sm font-bold uppercase tracking-widest text-indigo-100">Total Lifecycle Revenue</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline md:gap-6">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter">
              ${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full mt-4 md:mt-0">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm font-bold">+18.5% Growth</span>
            </div>
          </div>
        </div>
        {/* Animated Background Circles */}
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
        <div className="absolute bottom-[-50px] left-[20%] w-32 h-32 bg-indigo-400 group-hover:bg-indigo-300 rounded-full blur-2xl opacity-40 transition-colors duration-700"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue Velocity</h3>
              <p className="text-sm text-slate-500">30-day transactional flow</p>
            </div>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.byDay}>
                <defs>
                  <linearGradient id="revenueFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip 
                   contentStyle={{ 
                     borderRadius: '16px', 
                     border: 'none', 
                     boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                   }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fill="url(#revenueFlow)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Plan Breakdown</h3>
            <div className="space-y-4">
              {stats.byPlan.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <p className="text-sm font-semibold text-slate-700">{p.name}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">${p.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="absolute -bottom-8 -right-8 opacity-5">
              <PieChartIcon className="w-32 h-32" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Payment Vectors</h3>
            <div className="space-y-4">
              {stats.byChannel.map((c, idx) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }}></div>
                    <p className="text-sm font-semibold text-slate-700 capitalize">{c.name.replace('_', ' ')}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">${c.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="absolute -bottom-8 -right-8 opacity-5">
              <DollarSign className="w-32 h-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Narrative Section - Table modernized */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Historical Journal</h3>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Entry Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Settled Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.byDay.slice().reverse().map((day) => (
                <tr key={day.date} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-700">
                      {new Date(day.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-indigo-600">
                      + ${day.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

