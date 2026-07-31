import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

const FIELD_COLORS = {
  red: { from: 'from-red-500', to: 'to-red-600', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', accent: 'bg-red-500', light: 'bg-red-50' },
  blue: { from: 'from-blue-500', to: 'to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', accent: 'bg-blue-500', light: 'bg-blue-50' },
  green: { from: 'from-green-500', to: 'to-green-600', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', accent: 'bg-green-500', light: 'bg-green-50' },
  purple: { from: 'from-purple-500', to: 'to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', accent: 'bg-purple-500', light: 'bg-purple-50' },
  orange: { from: 'from-orange-500', to: 'to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', accent: 'bg-orange-500', light: 'bg-orange-50' },
  teal: { from: 'from-teal-500', to: 'to-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', accent: 'bg-teal-500', light: 'bg-teal-50' },
  pink: { from: 'from-pink-500', to: 'to-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600', accent: 'bg-pink-500', light: 'bg-pink-50' },
  slate: { from: 'from-slate-600', to: 'to-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', accent: 'bg-slate-600', light: 'bg-slate-50' },
}

export default function FieldArea() {
  const { id } = useParams()
  const [field, setField] = useState(null)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showDeleteFieldModal, setShowDeleteFieldModal] = useState(false)
  const [selectedAllowance, setSelectedAllowance] = useState(null)
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '' })
  const [expenses, setExpenses] = useState({})
  const navigate = useNavigate()
  const { addToast } = useToast()

  const color = FIELD_COLORS[field?.color] || FIELD_COLORS.red

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount || 0)
  }

  const fetchField = async () => {
    const { data } = await supabase.from('field_areas').select('*, field_allowances(*)').eq('id', id).single()
    setField(data)
    if (data?.field_allowances) {
      const ids = data.field_allowances.map(a => a.id)
      const { data: allExp } = await supabase.from('expenses').select('*').in('field_allowance_id', ids).order('created_at', { ascending: false })
      const grouped = {}
      ids.forEach(i => { grouped[i] = (allExp || []).filter(e => e.field_allowance_id === i) })
      setExpenses(grouped)
    }
  }

  useEffect(() => { fetchField() }, [id])

  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (!selectedAllowance) return
    const amount = parseFloat(expenseForm.amount)
    const { error } = await supabase.from('expenses').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      field_allowance_id: selectedAllowance.id,
      field_area_id: id,
      category: selectedAllowance.category,
      amount,
      description: expenseForm.description
    })
    if (error) { addToast(error.message, 'error'); return }
    await supabase.from('field_allowances').update({ spent_amount: (parseFloat(selectedAllowance.spent_amount) || 0) + amount }).eq('id', selectedAllowance.id)
    addToast('Expense recorded!', 'success')
    setShowExpenseModal(false)
    setExpenseForm({ amount: '', description: '' })
    fetchField()
  }

  const handleUpdateBudget = async (allowanceId, newAmount) => {
    await supabase.from('field_allowances').update({ total_amount: parseFloat(newAmount) || 0 }).eq('id', allowanceId)
    fetchField()
  }

  const handleDeleteAllowance = async (allowanceId) => {
    const { error } = await supabase.from('field_allowances').delete().eq('id', allowanceId)
    if (error) { addToast(error.message, 'error') }
    else { addToast('Allowance deleted', 'success'); fetchField() }
  }

  const handleDeleteField = async () => {
    const { error } = await supabase.from('field_areas').delete().eq('id', id)
    if (error) { addToast(error.message, 'error') }
    else { addToast('Field area deleted', 'success'); navigate('/dashboard') }
  }

  if (!field) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const totalBudget = (field.field_allowances || []).reduce((s, a) => s + (parseFloat(a.total_amount) || 0), 0)
  const totalSpent = (field.field_allowances || []).reduce((s, a) => s + (parseFloat(a.spent_amount) || 0), 0)

  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <span className="absolute text-3xl" style={{top: '10%', right: '10%', animation: 'float-slow 6s ease-in-out infinite'}}>📍</span>
        <span className="absolute text-4xl" style={{bottom: '20%', left: '10%', animation: 'float-medium 5s ease-in-out infinite'}}>📋</span>
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-gradient-to-r from-red-200 to-red-300 rounded-full opacity-20 blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite'}}></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6 animate-slide-up">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200 hover:bg-slate-50 transition">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div>
            <h1 className="text-slate-800 font-bold text-lg">{field.name}</h1>
            <p className="text-slate-400 text-xs">{field.location || 'No location'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs ${field.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>{field.status}</span>
            <button onClick={() => setShowDeleteFieldModal(true)} className="text-slate-300 hover:text-red-400 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>

        <div className={`rounded-2xl p-5 shadow-sm border mb-6 animate-slide-up bg-gradient-to-r ${color.from} ${color.to} text-white`}>
          <p className="text-white/80 text-sm">Total Remaining Budget</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalBudget - totalSpent)}</p>
          <div className="flex gap-4 mt-3 text-sm text-white/80">
            <span>Budget: {formatCurrency(totalBudget)}</span>
            <span>Spent: {formatCurrency(totalSpent)}</span>
          </div>
        </div>

        <div className="space-y-4">
          {(field.field_allowances || []).map((allowance) => {
            const remaining = (parseFloat(allowance.total_amount) || 0) - (parseFloat(allowance.spent_amount) || 0)
            const percent = allowance.total_amount > 0 ? ((allowance.spent_amount || 0) / allowance.total_amount) * 100 : 0
            const allowanceExpenses = expenses[allowance.id] || []

            return (
              <div key={allowance.id} className={`rounded-2xl shadow-sm border p-5 animate-slide-up ${color.bg} ${color.border}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color.light}`}>
                      {allowance.category === 'transport' ? '🚗' : allowance.category === 'meal' ? '🍽️' : allowance.category === 'hotel' ? '🏨' : '📋'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-slate-800 font-semibold">{allowance.name}</h3>
                        <button onClick={() => handleDeleteAllowance(allowance.id)} className="text-slate-300 hover:text-red-400 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                      <p className={`text-xs ${color.text} font-medium`}>{formatCurrency(remaining)} remaining</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedAllowance(allowance); setShowExpenseModal(true); }}
                    className={`px-4 py-2 text-white rounded-xl text-sm font-medium hover:opacity-90 transition bg-gradient-to-r ${color.from} ${color.to}`}>
                    - Spend
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-slate-500 text-sm">Budget:</span>
                  <input type="number" defaultValue={allowance.total_amount}
                    onBlur={(e) => handleUpdateBudget(allowance.id, e.target.value)}
                    className="w-36 bg-white border border-slate-200 rounded-lg p-2 text-slate-700 text-sm focus:outline-none" />
                </div>

                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-500">Spent: {formatCurrency(allowance.spent_amount || 0)}</span>
                  <span className="text-slate-500">{Math.round(percent)}% used</span>
                </div>
                <div className="h-2.5 bg-white rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${color.accent}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200/50">
                  <p className="text-slate-500 text-xs font-medium mb-2">Spending History</p>
                  {allowanceExpenses.length === 0 ? (
                    <p className="text-slate-400 text-xs italic">No expenses yet</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {allowanceExpenses.map((exp) => (
                        <div key={exp.id} className="flex justify-between items-center bg-white/80 rounded-lg p-2.5 text-xs">
                          <div>
                            <p className="text-slate-600 font-medium">{exp.description}</p>
                            <p className="text-slate-400">{new Date(exp.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                          <span className="text-red-500 font-semibold">-{formatCurrency(exp.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showExpenseModal && selectedAllowance && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowExpenseModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-slate-800 font-bold mb-1">Record Expense</h3>
            <p className="text-slate-500 text-sm mb-4">{selectedAllowance.name} • {formatCurrency((parseFloat(selectedAllowance.total_amount) || 0) - (parseFloat(selectedAllowance.spent_amount) || 0))} left</p>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div><label className="text-slate-600 text-sm mb-1 block">Amount (₱) *</label><input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" required /></div>
              <div><label className="text-slate-600 text-sm mb-1 block">Description *</label><input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" required /></div>
              <button type="submit" className={`w-full text-white p-3 rounded-xl font-semibold transition bg-gradient-to-r ${color.from} ${color.to}`}>Record Expense</button>
            </form>
          </div>
        </div>
      )}

      {showDeleteFieldModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowDeleteFieldModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-4xl mb-3">⚠️</p>
            <h3 className="text-slate-800 font-bold text-lg mb-2">Delete Field Area?</h3>
            <p className="text-slate-500 text-sm mb-6">This will delete "{field?.name}" and all its data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteFieldModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition">Cancel</button>
              <button onClick={handleDeleteField} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}