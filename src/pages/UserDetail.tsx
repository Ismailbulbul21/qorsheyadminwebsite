import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile, Subscription } from '../types/db'
import { 
  ChevronLeft, 
  Mail, 
  Calendar, 
  Target, 
  User as UserIcon,
  CreditCard,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react'

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
        if (!cancelled) setError(e instanceof Error ? e.message : 'Registry retrieval failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-slate-500 font-medium animate-pulse">Accessing secure records...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-red-700 flex items-center gap-4 animate-shake">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Identity Search Failed</h3>
          <p className="text-red-600/80">{error}</p>
        </div>
      </div>
    )
  }

  if (!profile) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
        <UserIcon className="w-10 h-10 text-slate-200" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">Identity Not Found</h2>
      <p className="text-slate-500 mt-2">The requested ID does not exist in our registry.</p>
      <Link to="/users" className="mt-8 text-indigo-600 font-bold hover:underline">Return to Registry</Link>
    </div>
  )

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link 
          to="/users" 
          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-500 transition-all shadow-sm group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Profile Intelligence</h1>
          <p className="text-sm text-slate-500">Comprehensive overview of subscriber state</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm relative overflow-hidden group">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center text-indigo-600 font-black text-3xl mb-6 ring-4 ring-white shadow-xl group-hover:scale-105 transition-transform duration-500">
                {profile.email?.[0].toUpperCase() || '?'}
              </div>
              <h2 className="text-xl font-black text-slate-900 break-all px-2">{profile.email || 'Anonymous User'}</h2>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                <ShieldCheck className="w-3 h-3" />
                Verified Member
              </div>

              <div className="w-full h-[1px] bg-slate-100 my-8"></div>

              <div className="w-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-tighter">Communications</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{profile.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-tighter">Focus Vector</span>
                  </div>
                  <span className="inline-flex px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-600 uppercase">
                    {profile.focus_type || 'General'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-tighter">Onboarding</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-[32px] p-6 text-indigo-200">
             <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                   <UserIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Registry ID</p>
                  <p className="text-xs font-mono text-white break-all leading-tight mt-1">{profile.id}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Subscriptions Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Transactional Ledger</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Subscription Cycle Logs</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-black uppercase shadow-sm">
                {subscriptions.length} Entries
              </span>
            </div>

            <div className="overflow-x-auto">
              {subscriptions.length === 0 ? (
                <div className="py-20 text-center">
                   <CreditCard className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                   <p className="text-slate-400 font-bold uppercase tracking-tighter">No active subscription vectors documented</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Service Tier</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Status Vector</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Settled Amount</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Lifecycle Period</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscriptions.map((s) => (
                      <tr key={s.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{s.plan_type}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                                {s.payment_channel || 'System Allocation'}
                              </span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                             s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'
                           }`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
                             {s.status}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900">{s.amount != null ? `${s.currency ?? '$'} ${s.amount}` : '$0.00'}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Gross Payment</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                              <Calendar className="w-3.5 h-3.5 text-slate-300" />
                              {new Date(s.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                              <span className="text-slate-300 mx-1">—</span>
                              {new Date(s.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <Link 
                            to={`/subscriptions/${s.id}`} 
                            className="bg-slate-100 p-2 rounded-xl text-slate-400 hover:bg-indigo-600 hover:text-white transition-all inline-flex"
                          >
                            <ArrowUpRight className="w-5 h-5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

