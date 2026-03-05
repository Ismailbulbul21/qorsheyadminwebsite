import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Plan } from '../types/db'

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
      const { data, error: e } = await supabase.from('plans').select('*').order('plan_type')
      if (cancelled) return
      if (e) setError(e.message)
      else setPlans((data ?? []) as Plan[])
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
  }

  async function saveEdit() {
    const id = editingId
    if (!id) return
    const amount = parseFloat(editAmount)
    if (Number.isNaN(amount) || amount < 0) {
      setError('Enter a valid positive amount')
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
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500">Loading…</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Pricing & Plans</h1>
      <p className="text-sm text-gray-500">Plans and prices the app uses. Edit amount and save (audit logged).</p>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plan type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount (USD)</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Interval (days)</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {plans.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{p.plan_type}</td>
                <td className="px-4 py-2">
                  {editingId === p.id ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  ) : (
                    <span className="text-sm">${Number(p.amount_usd).toFixed(2)}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">{p.currency}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{p.billing_interval_days ?? '—'}</td>
                <td className="px-4 py-2 text-sm">{p.is_active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2">
                  {editingId === p.id ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={saving}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button type="button" onClick={cancelEdit} className="text-sm text-gray-600 hover:text-gray-800">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startEdit(p)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {plans.length === 0 && (
          <p className="p-4 text-gray-500 text-sm">No plans defined. Add them in Supabase or run the migration seed.</p>
        )}
      </div>
    </div>
  )
}
