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

const TRANSPORT_TYPES = ['Airplane', 'Boat', 'Bus', 'Car', 'Jeep', 'Motorcycle', 'Train', 'Tricycle', 'UV']

export default function FieldArea() {
  const { id } = useParams()
  const [field, setField] = useState(null)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showDeleteFieldModal, setShowDeleteFieldModal] = useState(false)
  const [showAddAllowanceModal, setShowAddAllowanceModal] = useState(false)
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false)
  const [selectedAllowance, setSelectedAllowance] = useState(null)
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', transportType: '' })
  const [expenses, setExpenses] = useState({})
  const [newAllowance, setNewAllowance] = useState({ name: '', category: 'other', amount: '' })
  const [excludedAllowances, setExcludedAllowances] = useState({})
  const navigate = useNavigate()
  const { addToast } = useToast()

  const color = FIELD_COLORS[field?.color] || FIELD_COLORS.red

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount || 0)
  }

  const fetchField = async () => {
    const { data } = await supabase.from('field_areas').select('*, field_allowances(*)').eq('id', id).order('created_at', { referencedTable: 'field_allowances', ascending: true }).single()
    setField(data)
    if (data?.field_allowances) {
      const ids = data.field_allowances.map(a => a.id)
      const { data: allExp } = await supabase.from('expenses').select('*').in('field_allowance_id', ids).order('created_at', { ascending: false })
      const grouped = {}
      ids.forEach(i => { grouped[i] = (allExp || []).filter(e => e.field_allowance_id === i) })
      setExpenses(grouped)
      const excludedState = {}
      data.field_allowances.forEach(a => { excludedState[a.id] = a.excluded || false })
      setExcludedAllowances(excludedState)
    }
  }

  useEffect(() => { fetchField() }, [id])

  const toggleExclude = async (allowanceId) => {
    const newValue = !excludedAllowances[allowanceId]
    setExcludedAllowances(prev => ({ ...prev, [allowanceId]: newValue }))
    await supabase.from('field_allowances').update({ excluded: newValue }).eq('id', allowanceId)
  }

  const toggleStatus = async () => {
    const statuses = ['active', 'completed', 'cancelled']
    const currentIndex = statuses.indexOf(field.status)
    const newStatus = statuses[(currentIndex + 1) % 3]
    const { error } = await supabase.from('field_areas').update({ status: newStatus }).eq('id', id)
    if (error) { addToast(error.message, 'error') }
    else { setField(prev => ({ ...prev, status: newStatus })) }
  }

  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (!selectedAllowance) return
    const amount = parseFloat(expenseForm.amount)
    const description = expenseForm.transportType 
      ? `${expenseForm.transportType} - ${expenseForm.description}` 
      : expenseForm.description

    const { data, error } = await supabase.from('expenses').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      field_allowance_id: selectedAllowance.id,
      field_area_id: id,
      category: selectedAllowance.category,
      amount,
      description
    }).select().single()
    if (error) { addToast(error.message, 'error'); return }
    
    await supabase.from('field_allowances').update({ spent_amount: (parseFloat(selectedAllowance.spent_amount) || 0) + amount }).eq('id', selectedAllowance.id)
    
    setField(prev => ({
      ...prev,
      field_allowances: prev.field_allowances.map(a => 
        a.id === selectedAllowance.id 
          ? { ...a, spent_amount: (parseFloat(a.spent_amount) || 0) + amount }
          : a
      )
    }))
    
    setExpenses(prev => ({
      ...prev,
      [selectedAllowance.id]: [data, ...(prev[selectedAllowance.id] || [])]
    }))
    
    addToast('Expense recorded!', 'success')
    setShowExpenseModal(false)
    setExpenseForm({ amount: '', description: '', transportType: '' })
  }

  const handleEditExpense = async (e) => {
    e.preventDefault()
    if (!selectedExpense || !selectedAllowance) return
    const oldAmount = parseFloat(selectedExpense.amount)
    const newAmount = parseFloat(expenseForm.amount)
    const description = expenseForm.transportType 
      ? `${expenseForm.transportType} - ${expenseForm.description}` 
      : expenseForm.description

    const { error } = await supabase.from('expenses').update({
      amount: newAmount,
      description
    }).eq('id', selectedExpense.id)
    if (error) { addToast(error.message, 'error'); return }

    const amountDiff = newAmount - oldAmount
    await supabase.from('field_allowances').update({ spent_amount: (parseFloat(selectedAllowance.spent_amount) || 0) + amountDiff }).eq('id', selectedAllowance.id)

    setField(prev => ({
      ...prev,
      field_allowances: prev.field_allowances.map(a => 
        a.id === selectedAllowance.id 
          ? { ...a, spent_amount: (parseFloat(a.spent_amount) || 0) + amountDiff }
          : a
      )
    }))

    setExpenses(prev => ({
      ...prev,
      [selectedAllowance.id]: prev[selectedAllowance.id].map(exp => 
        exp.id === selectedExpense.id ? { ...exp, amount: newAmount, description } : exp
      )
    }))

    addToast('Expense updated!', 'success')
    setShowEditExpenseModal(false)
    setSelectedExpense(null)
    setExpenseForm({ amount: '', description: '', transportType: '' })
  }

  const handleDeleteExpense = async (expenseId, allowanceId) => {
    const expToDelete = (expenses[allowanceId] || []).find(e => e.id === expenseId)
    if (!expToDelete) return

    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
    if (error) { addToast(error.message, 'error'); return }

    await supabase.from('field_allowances').update({ spent_amount: (parseFloat(field.field_allowances.find(a => a.id === allowanceId)?.spent_amount) || 0) - parseFloat(expToDelete.amount) }).eq('id', allowanceId)

    setField(prev => ({
      ...prev,
      field_allowances: prev.field_allowances.map(a => 
        a.id === allowanceId 
          ? { ...a, spent_amount: (parseFloat(a.spent_amount) || 0) - parseFloat(expToDelete.amount) }
          : a
      )
    }))

    setExpenses(prev => ({
      ...prev,
      [allowanceId]: prev[allowanceId].filter(e => e.id !== expenseId)
    }))

    addToast('Expense deleted', 'success')
  }

  const handleUpdateBudget = async (allowanceId, newAmount) => {
    await supabase.from('field_allowances').update({ total_amount: parseFloat(newAmount) || 0 }).eq('id', allowanceId)
    setField(prev => ({
      ...prev,
      field_allowances: prev.field_allowances.map(a => 
        a.id === allowanceId ? { ...a, total_amount: parseFloat(newAmount) || 0 } : a
      )
    }))
  }

  const handleDeleteAllowance = async (allowanceId) => {
    const { error } = await supabase.from('field_allowances').delete().eq('id', allowanceId)
    if (error) { addToast(error.message, 'error') }
    else { 
      setField(prev => ({
        ...prev,
        field_allowances: prev.field_allowances.filter(a => a.id !== allowanceId)
      }))
      addToast('Allowance deleted', 'success')
    }
  }

  const handleAddAllowance = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.from('field_allowances').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      field_area_id: id,
      name: newAllowance.name,
      category: newAllowance.category,
      total_amount: parseFloat(newAllowance.amount) || 0,
      spent_amount: 0,
      excluded: false
    }).select().single()
    if (error) { addToast(error.message, 'error') }
    else { 
      setField(prev => ({
        ...prev,
        field_allowances: [...(prev.field_allowances || []), data]
      }))
      setExcludedAllowances(prev => ({ ...prev, [data.id]: false }))
      addToast('Allowance added!', 'success')
      setShowAddAllowanceModal(false)
      setNewAllowance({ name: '', category: 'other', amount: '' })
    }
  }

  const handleDeleteField = async () => {
    const { error } = await supabase.from('field_areas').delete().eq('id', id)
    if (error) { addToast(error.message, 'error') }
    else { addToast('Field area deleted', 'success'); navigate('/dashboard') }
  }

  const handlePrintPDF = () => {
    const includedAllowances = (field?.field_allowances || []).filter(a => !excludedAllowances[a.id])
    const totalBudget = includedAllowances.reduce((s, a) => s + (parseFloat(a.total_amount) || 0), 0)
    const totalSpent = includedAllowances.reduce((s, a) => s + (parseFloat(a.spent_amount) || 0), 0)
    const excludedList = (field?.field_allowances || []).filter(a => excludedAllowances[a.id])

    const printWindow = window.open('', '_blank')
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${field?.name} - Expense Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
          .header { border: 2px solid #1e293b; padding: 20px; margin-bottom: 20px; text-align: center; }
          .header h1 { font-size: 22px; margin-bottom: 4px; }
          .header p { font-size: 13px; color: #64748b; }
          .summary { display: flex; gap: 0; margin-bottom: 20px; }
          .summary-box { flex: 1; border: 2px solid #e2e8f0; padding: 14px; text-align: center; }
          .summary-box p { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .summary-box strong { font-size: 20px; }
          .section { margin-bottom: 20px; border: 2px solid #e2e8f0; }
          .section-title { font-size: 15px; font-weight: bold; padding: 10px 14px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
          .section-footer { font-size: 13px; padding: 10px 14px; background: #f1f5f9; border-top: 2px solid #1e293b; font-weight: bold; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          tr:last-child td { border-bottom: none; }
          .amount-col { text-align: right; font-weight: 600; width: 120px; }
          .negative { color: #ef4444; }
          .empty { text-align: center; color: #94a3b8; padding: 20px; font-style: italic; }
          .excluded-section { margin-top: 20px; padding-top: 15px; border-top: 1px dashed #94a3b8; }
          .excluded-section h3 { font-size: 13px; color: #94a3b8; margin-bottom: 8px; }
          .excluded-item { font-size: 12px; color: #94a3b8; padding: 2px 0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${field?.name}</h1>
          <p>${field?.location || 'No location'} • Status: ${field?.status}</p>
        </div>
        
        <div class="summary">
          <div class="summary-box"><p>Total Budget</p><strong>${formatCurrency(totalBudget)}</strong></div>
          <div class="summary-box"><p>Total Spent</p><strong style="color:#ef4444">${formatCurrency(totalSpent)}</strong></div>
          <div class="summary-box"><p>Remaining</p><strong style="color:#22c55e">${formatCurrency(totalBudget - totalSpent)}</strong></div>
        </div>

        ${includedAllowances.map(allowance => {
          const allowanceExpenses = expenses[allowance.id] || []
          return `
            <div class="section">
              <div class="section-title">
                ${allowance.category === 'transport' ? '🚗' : allowance.category === 'meal' ? '🍽️' : allowance.category === 'hotel' ? '🏨' : '📋'} 
                ${allowance.name}
              </div>
              <table>
                <thead><tr><th>Description</th><th class="amount-col">Amount</th></tr></thead>
                <tbody>
                  ${allowanceExpenses.length === 0 ? '<tr><td colspan="2" class="empty">No expenses recorded</td></tr>' : 
                    allowanceExpenses.map(exp => `
                      <tr><td>${exp.description}</td><td class="amount-col negative">-${formatCurrency(exp.amount)}</td></tr>
                    `).join('')
                  }
                </tbody>
              </table>
              <div class="section-footer">
                Budget: <span style="color:#1e293b">${formatCurrency(allowance.total_amount)}</span> | Spent: <span style="color:#ef4444">${formatCurrency(allowance.spent_amount || 0)}</span> | Left: <span style="color:#22c55e">${formatCurrency((parseFloat(allowance.total_amount) || 0) - (parseFloat(allowance.spent_amount) || 0))}</span>
              </div>
            </div>
          `
        }).join('')}

        ${excludedList.length > 0 ? `
          <div class="excluded-section">
            <h3>Excluded from computation:</h3>
            ${excludedList.map(a => `<p class="excluded-item">• ${a.name} (${formatCurrency(a.total_amount)})</p>`).join('')}
          </div>
        ` : ''}

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `
    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  const openEditExpense = (expense, allowance) => {
    setSelectedExpense(expense)
    setSelectedAllowance(allowance)
    const parts = expense.description.split(' - ')
    if (parts.length > 1) {
      setExpenseForm({ amount: expense.amount, description: parts[1], transportType: parts[0] })
    } else {
      setExpenseForm({ amount: expense.amount, description: expense.description, transportType: '' })
    }
    setShowEditExpenseModal(true)
  }

  if (!field) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const includedAllowances = (field.field_allowances || []).filter(a => !excludedAllowances[a.id])
  const totalBudget = includedAllowances.reduce((s, a) => s + (parseFloat(a.total_amount) || 0), 0)
  const totalSpent = includedAllowances.reduce((s, a) => s + (parseFloat(a.spent_amount) || 0), 0)

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
            <button onClick={handlePrintPDF} className="text-slate-300 hover:text-blue-400 transition" title="Print Report">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            </button>
            <button onClick={toggleStatus} className={`px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 transition ${field.status === 'active' ? 'bg-green-100 text-green-600' : field.status === 'completed' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{field.status}</button>
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
          {Object.values(excludedAllowances).some(v => v) && (
            <p className="text-white/60 text-xs mt-2">* Some allowances excluded from total</p>
          )}
        </div>

        <div className="space-y-4">
          {(field.field_allowances || []).map((allowance) => {
            const remaining = (parseFloat(allowance.total_amount) || 0) - (parseFloat(allowance.spent_amount) || 0)
            const percent = allowance.total_amount > 0 ? ((allowance.spent_amount || 0) / allowance.total_amount) * 100 : 0
            const allowanceExpenses = expenses[allowance.id] || []
            const isExcluded = excludedAllowances[allowance.id]

            return (
              <div key={allowance.id} className={`rounded-2xl shadow-sm border p-5 animate-slide-up transition-all ${isExcluded ? 'opacity-50 grayscale' : ''} ${color.bg} ${color.border}`}>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button onClick={() => toggleExclude(allowance.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 mt-1 ${
                        isExcluded ? 'border-slate-300 bg-slate-100 text-slate-400' : 'border-green-400 bg-green-50 text-green-500'
                      }`}>
                      {!isExcluded && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      )}
                    </button>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 ${color.light}`}>
                      {allowance.category === 'transport' ? '🚗' : allowance.category === 'meal' ? '🍽️' : allowance.category === 'hotel' ? '🏨' : '📋'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-slate-800 font-semibold text-sm sm:text-base truncate">{allowance.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className={`text-xs ${color.text} font-medium`}>{formatCurrency(remaining)} remaining</p>
                        {isExcluded && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">Excluded</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleDeleteAllowance(allowance.id)} className="text-slate-300 hover:text-red-400 transition p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                    <button onClick={() => { setSelectedAllowance(allowance); setExpenseForm({ amount: '', description: '', transportType: '' }); setShowExpenseModal(true); }}
                      className={`px-3 py-2 sm:px-4 sm:py-2 text-white rounded-xl text-xs sm:text-sm font-medium hover:opacity-90 transition bg-gradient-to-r ${color.from} ${color.to}`}>
                      Spend
                    </button>
                  </div>
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
                        <div key={exp.id} className="flex justify-between items-center bg-white/80 rounded-lg p-2.5 text-xs group">
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-600 font-medium truncate">{exp.description}</p>
                            <p className="text-slate-400">{new Date(exp.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <span className="text-red-500 font-semibold">-{formatCurrency(exp.amount)}</span>
                            <button onClick={() => openEditExpense(exp, allowance)} className="text-blue-400 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg p-1.5 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button onClick={() => handleDeleteExpense(exp.id, allowance.id)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-lg p-1.5 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={() => setShowAddAllowanceModal(true)}
          className={`w-full mt-4 py-3 rounded-xl font-medium transition border-2 border-dashed ${color.border} ${color.text} hover:bg-white`}>
          + Add Allowance
        </button>
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && selectedAllowance && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowExpenseModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-slate-800 font-bold mb-1">Record Expense</h3>
            <p className="text-slate-500 text-sm mb-4">{selectedAllowance.name} • {formatCurrency((parseFloat(selectedAllowance.total_amount) || 0) - (parseFloat(selectedAllowance.spent_amount) || 0))} left</p>
            <form onSubmit={handleAddExpense} className="space-y-3">
              {selectedAllowance.category === 'transport' && (
                <div>
                  <label className="text-slate-600 text-sm mb-1 block">Transport Type</label>
                  <select value={expenseForm.transportType} onChange={(e) => setExpenseForm({...expenseForm, transportType: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-red-400 text-sm">
                    <option value="">Select transport type</option>
                    {TRANSPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              <div><label className="text-slate-600 text-sm mb-1 block">Amount (₱) *</label><input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" required /></div>
              <div><label className="text-slate-600 text-sm mb-1 block">Description *</label><input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" required /></div>
              <button type="submit" className={`w-full text-white p-3 rounded-xl font-semibold transition bg-gradient-to-r ${color.from} ${color.to}`}>Record Expense</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditExpenseModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowEditExpenseModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-slate-800 font-bold mb-1">Edit Expense</h3>
            <p className="text-slate-500 text-sm mb-4">{selectedAllowance?.name}</p>
            <form onSubmit={handleEditExpense} className="space-y-3">
              {selectedAllowance?.category === 'transport' && (
                <div>
                  <label className="text-slate-600 text-sm mb-1 block">Transport Type</label>
                  <select value={expenseForm.transportType} onChange={(e) => setExpenseForm({...expenseForm, transportType: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-red-400 text-sm">
                    <option value="">Select transport type</option>
                    {TRANSPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              <div><label className="text-slate-600 text-sm mb-1 block">Amount (₱) *</label><input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" required /></div>
              <div><label className="text-slate-600 text-sm mb-1 block">Description *</label><input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" required /></div>
              <button type="submit" className={`w-full text-white p-3 rounded-xl font-semibold transition bg-gradient-to-r ${color.from} ${color.to}`}>Update Expense</button>
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

      {showAddAllowanceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowAddAllowanceModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-slate-800 font-bold text-lg mb-4">Add Allowance</h3>
            <form onSubmit={handleAddAllowance} className="space-y-3">
              <div><label className="text-slate-600 text-sm mb-1 block">Name *</label><input type="text" value={newAllowance.name} onChange={(e) => setNewAllowance({...newAllowance, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" placeholder="e.g., Laundry Allowance" required /></div>
              <div>
                <label className="text-slate-600 text-sm mb-1 block">Category</label>
                <select value={newAllowance.category} onChange={(e) => setNewAllowance({...newAllowance, category: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400 text-sm">
                  <option value="transport">🚗 Transport</option>
                  <option value="meal">🍽️ Meal</option>
                  <option value="hotel">🏨 Hotel</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div><label className="text-slate-600 text-sm mb-1 block">Budget (₱)</label><input type="number" step="0.01" value={newAllowance.amount} onChange={(e) => setNewAllowance({...newAllowance, amount: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" placeholder="0.00" /></div>
              <button type="submit" className={`w-full text-white p-3 rounded-xl font-semibold transition bg-gradient-to-r ${color.from} ${color.to}`}>Add Allowance</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}