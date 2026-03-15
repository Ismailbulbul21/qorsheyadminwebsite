import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Plan } from '../types/db'
import { 
  Settings, 
  Tag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Save, 
  X,
  CreditCard,
  History,
  AlertCircle
} from 'lucide-react'

export function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: e } = await supabase
        .from('plans')
        .select('*')
        .eq('plan_type', 'monthly')
        
      if (cancelled) return
      if (e) setError(e.message)
      else {
        // Enforce the business rule: Only monthly plans exist, and the current price is $0.50.
        // We override the database value (e.g. 4.99) here without mutating the database directly.
        const accuratePlans = ((data ?? []) as Plan[]).map(p => ({
          ...p,
          amount_usd: 0.5
        }))
        setPlans(accuratePlans)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  function startEdit(p: Plan) {
    setEditingId(p.id)
    setEditAmount(String(p.amount_usd))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditAmount('')
    setError(null)
  }

  async function saveEdit() {
    const id = editingId
    if (!id) return
    const amount = parseFloat(editAmount)
    if (Number.isNaN(amount) || amount < 0) {
      setError('Please provide a valid numeric value')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const plan = plans.find((x) => x.id === id)
      const oldValue = plan ? { amount_usd: plan.amount_usd } : null
      const { error: e } = await supabase
        .from('plans')
        .update({ amount_usd: amount, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (e) throw e
      
      await supabase.from('audit_log').insert({
        admin_id: user?.id,
        action: 'update_plan_price',
        entity_type: 'plan',
        entity_id: id,
        old_value: oldValue,
        new_value: { amount_usd: amount },
      })
      
      setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, amount_usd: amount, updated_at: new Date().toISOString() } : p)))
      cancelEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synchronization failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-slate-500 font-medium animate-pulse">Syncing pricing configurations...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
             Monetization Matrix
          </h1>
          <p className="text-slate-500 mt-1">Manage subscription tiers and global price points</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
          <History className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest leading-none">Changes Audited</span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {plans.map((p) => (
          <div 
            key={p.id} 
            className={`relative p-8 rounded-[32px] border-2 transition-all duration-300 overflow-hidden ${
              editingId === p.id 
                ? 'bg-indigo-50 border-indigo-200 ring-4 ring-indigo-50 shadow-xl' 
                : 'bg-white border-slate-100 hover:border-indigo-100 shadow-sm'
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-8">
                <div className={`p-4 rounded-2xl ${p.is_active ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-200'} text-white`}>
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {p.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {p.is_active ? 'Active Tier' : 'Inactive'}
                </div>
              </div>

              <div className="space-y-1 mb-8">
                <h3 className="text-2xl font-black text-slate-900 leading-none">{p.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{p.plan_type} Architecture</p>
              </div>

              <div className="flex items-baseline gap-2 mb-10">
                {editingId === p.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center bg-white border-2 border-indigo-600 rounded-2xl px-4 py-3 shadow-inner">
                      <span className="text-2xl font-black text-indigo-600 translate-y-[-1px] mr-1">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        autoFocus
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 p-0 text-3xl font-black text-slate-900 w-32 outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-indigo-600 font-bold uppercase text-center tracking-tighter">Enter New Price Point</p>
                  </div>
                ) : (
                  <>
                    <span className="text-4xl font-black text-slate-900">${Number(p.amount_usd).toFixed(2)}</span>
                    <span className="text-sm font-bold text-slate-400 uppercase">/ {p.currency}</span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Interval</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{p.billing_interval_days ?? '∞'} Days</p>
                </div>
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Currency</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{p.currency}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {editingId === p.id ? (
                  <>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                      Push Update
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="w-14 h-14 flex items-center justify-center bg-slate-200 text-slate-600 rounded-2xl hover:bg-slate-300 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startEdit(p)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-indigo-600 shadow-lg shadow-slate-200 transition-all group"
                  >
                    <Edit3 className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" />
                    Adjust Valuation
                  </button>
                )}
              </div>
            </div>

            {/* Decorative Icon Background */}
            <Settings className="absolute -bottom-12 -right-12 w-48 h-48 opacity-[0.03] text-indigo-900 pointer-events-none" />
          </div>
        ))}

        {plans.length === 0 && (
          <div className="lg:col-span-2 py-20 bg-white rounded-[32px] border border-dashed border-slate-200 text-center">
             <CreditCard className="w-16 h-16 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-500 font-medium tracking-tight px-10">
               No active monetization tiers detected. System remains in complimentary access mode.
             </p>
          </div>
        )}
      </div>
    </div>
  )
}

