import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical,
  Calendar
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'

type Stats = {
  totalUsers: number
  activeSubscriptions: number
  totalRevenue: number
  recentSubscriptions: { id: string; user_id: string; plan_type: string; created_at: string }[]
  revenueChartData: { name: string; value: number }[]
  userGrowthData: { name: string; users: number }[]
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [profilesCountRes, profilesDataRes, subsRes, revenueRes, recentRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('created_at').order('created_at', { ascending: true }).range(0, 2000),
          supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('subscriptions').select('amount, created_at').in('status', ['active', 'expired', 'canceled']),
          supabase.from('subscriptions').select('id, user_id, plan_type, created_at, profiles(email)').order('created_at', { ascending: false }).limit(6),
        ])

        if (cancelled) return

        const totalUsers = profilesCountRes.count ?? 0
        const activeSubscriptions = subsRes.count ?? 0
        // Use 0.5 as fallback price if amount is null
        const totalRevenue = (revenueRes.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0.5), 0)
        
        // Process Chart Data
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        // Revenue by month
        const revMap = new Map<string, number>()
        ;(revenueRes.data ?? []).forEach(r => {
           if (!r.created_at) return
           const d = new Date(r.created_at)
           const m = months[d.getMonth()]
           revMap.set(m, (revMap.get(m) || 0) + Number(r.amount ?? 0.5))
        })
        const revenueChartData = months.filter(m => revMap.has(m)).map(m => ({ name: m, value: revMap.get(m) || 0 }))
        if (revenueChartData.length === 0) revenueChartData.push({ name: 'No Data', value: 0 })

        // User Growth by month (all profiles)
        const userMap = new Map<string, number>()
        ;(profilesDataRes.data ?? []).forEach(p => {
           if (!p.created_at) return
           const d = new Date(p.created_at)
           const m = months[d.getMonth()]
           userMap.set(m, (userMap.get(m) || 0) + 1)
        })
        const userGrowthData = months.filter(m => userMap.has(m)).map(m => ({ name: m, users: userMap.get(m) || 0 }))
        if (userGrowthData.length === 0) userGrowthData.push({ name: 'Jan', users: totalUsers }) // Fallback fix

        const recentSubscriptions = (recentRes.data ?? []).map((s: any) => ({
          id: s.id,
          user_id: s.profiles?.email || s.user_id,
          plan_type: s.plan_type === 'yearly' ? 'monthly' : s.plan_type, // Enforce monthly
          created_at: s.created_at ?? '',
        }))

        setStats({ 
          totalUsers, 
          activeSubscriptions, 
          totalRevenue, 
          recentSubscriptions,
          revenueChartData,
          userGrowthData
        })
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
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-slate-500 font-medium animate-pulse">Syncing dashboard data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-red-700 flex items-center gap-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0 text-red-600">
          <TrendingUp className="w-6 h-6 rotate-180" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Failed to sync data</h3>
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back. Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <Calendar className="w-4 h-4 text-slate-400" />
            Last 30 Days
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-sm font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
            Generate Report
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Total Customers" 
          value={stats.totalUsers.toLocaleString()} 
          icon={Users} 
          trend="+12.5%" 
          color="indigo" 
        />
        <MetricCard 
          title="Active Subscriptions" 
          value={stats.activeSubscriptions.toLocaleString()} 
          icon={CreditCard} 
          trend="+8.2%" 
          color="emerald" 
        />
        <MetricCard 
          title="Total Gross Revenue" 
          value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={DollarSign} 
          trend="+23.1%" 
          color="blue" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue Analytics</h3>
              <p className="text-sm text-slate-500">Weekly performance tracking</p>
            </div>
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueChartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">User Growth</h3>
              <p className="text-sm text-slate-500">New members per month</p>
            </div>
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}}
                  dy={10}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="users" radius={[6, 6, 0, 0]}>
                  {stats.userGrowthData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 2 ? '#6366f1' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Subscriptions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Subscriber</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentSubscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {s.user_id[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{s.user_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {s.plan_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      Successful
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

function MetricCard({ title, value, icon: Icon, trend, color }: any) {
  const colorMap: any = {
    indigo: 'bg-indigo-600 text-indigo-600',
    emerald: 'bg-emerald-600 text-emerald-600',
    blue: 'bg-blue-600 text-blue-600',
  }
  
  const bgMap: any = {
    indigo: 'bg-indigo-50',
    emerald: 'bg-emerald-50',
    blue: 'bg-blue-50',
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 ${bgMap[color]} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300`}>
          <Icon className={`w-6 h-6 ${colorMap[color].split(' ')[1]}`} />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${trend.startsWith('+') ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'} text-xs font-bold`}>
          {trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      </div>
      <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
    </div>
  )
}

