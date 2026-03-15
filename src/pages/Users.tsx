import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/db'
import { 
  Users as UsersIcon, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  Filter,
  Mail,
  Fingerprint
} from 'lucide-react'

const PAGE_SIZE = 10

export function Users() {
  const [list, setList] = useState<Profile[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        let q = supabase.from('profiles').select('*', { count: 'exact' })
        if (search.trim()) {
          q = q.or(`email.ilike.%${search.trim()}%,id.ilike.%${search.trim()}%`)
        }
        const { data, error: e, count } = await q
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (cancelled) return
        if (e) throw e
        setList((data ?? []) as Profile[])
        setTotal(count ?? (data ?? []).length)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load user records')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, search])

  useEffect(() => {
    setPage(0)
  }, [search])

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
             User Registry
          </h1>
          <p className="text-slate-500 mt-1">Manage and monitor all platform accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4 text-slate-400" />
            Filters
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search registry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full md:w-64 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">!</div>
          {error}
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">User Profile</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden lg:table-cell">Identity ID</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Focus Path</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Joined Date</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                    <td className="px-6 py-6 hidden lg:table-cell"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <UsersIcon className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No accounts matched your search criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((u) => (
                  <tr key={u.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm ring-2 ring-white">
                          {u.email?.[0].toUpperCase() || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 leading-none mb-1">{u.email || 'Anonymous'}</span>
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 uppercase">
                            <Mail className="w-2.5 h-2.5" /> Platform Member
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 group-hover:text-slate-600 transition-colors">
                        <Fingerprint className="w-3.3 h-3.3 opa" />
                        <span className="truncate max-w-[120px]">{u.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.focus_type ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {u.focus_type || 'Unspecified'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-600">{u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Registration Timestamp</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        to={`/users/${u.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-900 hover:text-white transition-all transform active:scale-95"
                      >
                        View Profile
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && totalPages > 1 && (
          <div className="px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30">
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pagination Control</span>
              <p className="text-sm text-slate-600 font-medium">
                Showing <span className="text-indigo-600">{page * PAGE_SIZE + 1}</span> to <span className="text-indigo-600">{Math.min((page + 1) * PAGE_SIZE, total)}</span> of <span className="font-bold">{total}</span> accounts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                      page === i 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

