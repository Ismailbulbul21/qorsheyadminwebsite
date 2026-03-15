import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Subscription } from '../types/db'
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight,
  RefreshCcw,
  User,
  CreditCard,
  Target,
  History,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react'

const PAGE_SIZE = 12
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
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
        if (!cancelled) console.error(e instanceof Error ? e.message : 'Database link interrupted')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, statusFilter, planFilter, channelFilter, search])

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  useEffect(() => { setPage(0) }, [statusFilter, planFilter, channelFilter, search])

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto animate-in fade-in duration-700">
      {/* Header Section with Glassmorphism Title */}
      <div className="relative p-6 rounded-[32px] bg-white border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <History className="w-5 h-5" />
               </div>
               <div className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                 Global Ledger
               </div>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Subscription Lifecycle</h1>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">Tracking {total} transactional events</p>
          </div>

          {/* Quick Metrics Bento */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 flex flex-col justify-between min-w-[120px]">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">In Register</span>
               <span className="text-lg font-black text-slate-900 leading-none mt-1">{total.toLocaleString()}</span>
            </div>
            <div className="bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-100 flex flex-col justify-between min-w-[120px]">
               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Now</span>
               <span className="text-lg font-black text-emerald-700 leading-none mt-1">
                 {list.filter(s => s.status === 'active').length}+
               </span>
            </div>
            <div className="bg-indigo-50 px-4 py-3 rounded-2xl border border-indigo-100 hidden sm:flex flex-col justify-between min-w-[120px]">
               <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Sync Health</span>
               <span className="text-lg font-black text-indigo-700 leading-none mt-1 flex items-center gap-2">
                 100% <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
               </span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER DOCK */}
      <div className="flex flex-wrap gap-3 items-center bg-slate-900 p-3 rounded-3xl shadow-xl shadow-slate-900/10 ring-4 ring-slate-100">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            placeholder="Search Reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800 border-none rounded-2xl text-sm text-white placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-[10px] font-black uppercase tracking-widest focus:ring-0 outline-none cursor-pointer p-0"
            >
              <option value="" className="bg-slate-800">Status: All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-slate-800">{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
            <Target className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-[10px] font-black uppercase tracking-widest focus:ring-0 outline-none cursor-pointer p-0"
            >
              <option value="" className="bg-slate-800">Plan: All</option>
              <option value="monthly" className="bg-slate-800">Monthly</option>
              <option value="yearly" className="bg-slate-800">Yearly</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2 text-slate-300">
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-[10px] font-black uppercase tracking-widest focus:ring-0 outline-none cursor-pointer p-0"
            >
              <option value="" className="bg-slate-800">Source: All</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c} className="bg-slate-800">{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DATA GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading && list.length === 0 ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-50 rounded-3xl animate-pulse"></div>
          ))
        ) : list.length === 0 ? (
          <div className="col-span-full py-32 text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-slate-200" />
             </div>
             <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No entries found</h3>
          </div>
        ) : (
          list.map((s) => (
            <div key={s.id} className="group relative bg-white p-5 rounded-[28px] border border-slate-200/60 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
               <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                     <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        <User className="w-4 h-4" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subscriber ID</span>
                        <div className="flex items-center gap-1.5">
                           <span className="text-xs font-black text-slate-700">{s.user_id.slice(0, 6)}...{s.user_id.slice(-4)}</span>
                           <button onClick={() => copyToClipboard(s.user_id)} className="p-0.5 hover:bg-slate-100 rounded-md transition-colors">
                              {copiedId === s.user_id ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 text-slate-400" />}
                           </button>
                        </div>
                     </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    s.status === 'active' 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-50' 
                      : 'bg-slate-900 text-white'
                  }`}>
                    {s.status}
                  </span>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Service Tier</span>
                     <p className="text-xs font-black text-slate-900 uppercase">{s.plan_type}</p>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Payment Node</span>
                     <p className="text-xs font-black text-slate-900 uppercase truncate">{s.payment_channel || 'DIRECT'}</p>
                  </div>
               </div>

               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Settled Amount</span>
                     <span className="text-lg font-black text-slate-900 leading-none mt-0.5">
                       {s.currency ?? '$'}{Number(s.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                     </span>
                  </div>
                  <Link 
                    to={`/subscriptions/${s.id}`} 
                    className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-200"
                  >
                     <ArrowUpRight className="w-4 h-4" />
                  </Link>
               </div>
            </div>
          ))
        )}
      </div>

      {/* MODERN PAGINATION CONTROL */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-[32px] border border-slate-200 shadow-lg">
           <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Lifecycle Phase</span>
              <div className="flex items-center gap-1">
                 {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all duration-500 ${page === i ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-100'}`}></div>
                 ))}
              </div>
           </div>

           <div className="flex items-center gap-4">
              <span className="text-xs font-black text-slate-900 uppercase">
                PAGE {page + 1} <span className="mx-1.5 text-slate-200">/</span> {totalPages}
              </span>
              <div className="flex gap-2">
                <button 
                   disabled={page === 0} 
                   onClick={() => setPage((p) => p - 1)} 
                   className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white disabled:opacity-20 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  disabled={page >= totalPages - 1} 
                  onClick={() => setPage((p) => p + 1)} 
                  className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white disabled:opacity-20 transition-all shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}


