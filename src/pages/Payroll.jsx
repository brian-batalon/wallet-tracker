import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast.jsx'

export default function Payroll() {
  const [user, setUser] = useState(null)
  const [payrollHistory, setPayrollHistory] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingPayroll, setEditingPayroll] = useState(null)
  const [form, setForm] = useState({
    basic_salary: '', allowances_total: '', deductions: '', date_received: ''
  })
  const navigate = useNavigate()
  const { addToast } = useToast()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount || 0)
  }

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/'); return }
      setUser(user)
      const { data } = await supabase.from('payroll').select('*').eq('user_id', user.id).order('date_received', { ascending: false })
      setPayrollHistory(data || [])
    }
    fetchData()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const basic = parseFloat(form.basic_salary) || 0
    const allowances = parseFloat(form.allowances_total) || 0
    const deductions = parseFloat(form.deductions) || 0
    const net = basic + allowances - deductions

    if (editingPayroll) {
      const { error } = await supabase.from('payroll').update({
        basic_salary: basic, allowances_total: allowances, deductions, net_pay: net,
        date_received: form.date_received
      }).eq('id', editingPayroll.id)

      if (error) { addToast(error.message, 'error') }
      else {
        setPayrollHistory(prev => prev.map(p => p.id === editingPayroll.id ? { ...p, basic_salary: basic, allowances_total: allowances, deductions, net_pay: net, date_received: form.date_received } : p))
        addToast('Payroll updated!', 'success')
      }
    } else {
      const { error } = await supabase.from('payroll').insert({
        user_id: user.id, basic_salary: basic, allowances_total: allowances, deductions, net_pay: net,
        date_received: form.date_received || new Date().toISOString().split('T')[0]
      })

      if (error) { addToast(error.message, 'error') }
      else {
        const { data } = await supabase.from('payroll').select('*').eq('user_id', user.id).order('date_received', { ascending: false })
        setPayrollHistory(data || [])
        addToast('Payroll added!', 'success')
      }
    }

    setShowForm(false)
    setEditingPayroll(null)
    setForm({ basic_salary: '', allowances_total: '', deductions: '', date_received: '' })
  }

  const handleEdit = (payroll) => {
    setEditingPayroll(payroll)
    setForm({
      basic_salary: payroll.basic_salary,
      allowances_total: payroll.allowances_total,
      deductions: payroll.deductions,
      date_received: payroll.date_received
    })
    setShowForm(true)
  }

  const handleDelete = async (payrollId) => {
    const { error } = await supabase.from('payroll').delete().eq('id', payrollId)
    if (error) { addToast(error.message, 'error') }
    else {
      setPayrollHistory(prev => prev.filter(p => p.id !== payrollId))
      addToast('Payroll deleted', 'success')
    }
  }

  const totalReceived = payrollHistory.reduce((sum, p) => sum + (parseFloat(p.net_pay) || 0), 0)
  const totalGross = payrollHistory.reduce((sum, p) => sum + (parseFloat(p.basic_salary) || 0) + (parseFloat(p.allowances_total) || 0), 0)

  const latest = payrollHistory[0]

  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <span className="absolute text-4xl" style={{top: '10%', right: '10%', animation: 'float-slow 6s ease-in-out infinite'}}>💼</span>
        <span className="absolute text-3xl" style={{bottom: '20%', left: '10%', animation: 'float-medium 5s ease-in-out infinite'}}>💰</span>
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-r from-red-200 to-red-300 rounded-full opacity-20 blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite'}}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6 animate-slide-up">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200 hover:bg-slate-50 transition">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="text-slate-800 font-bold text-lg">💼 Payroll</h1>
        </div>

        {latest && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6 animate-slide-up">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-sm">Latest Payroll</p>
                <p className="text-slate-800 text-3xl font-bold mt-1">{formatCurrency(latest.net_pay)}</p>
              </div>
              <span className="text-xs text-slate-400">{new Date(latest.date_received).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-slate-500">Gross Pay:</span>
              <span className="text-slate-700 font-medium text-right">{formatCurrency((parseFloat(latest.basic_salary) || 0) + (parseFloat(latest.allowances_total) || 0))}</span>
              <span className="text-slate-500">Deductions:</span>
              <span className="text-red-500 font-medium text-right">-{formatCurrency(latest.deductions)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
            <p className="text-slate-500 text-xs">Total Received</p>
            <p className="text-green-600 font-bold text-lg mt-1">{formatCurrency(totalReceived)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
            <p className="text-slate-500 text-xs">Gross Total</p>
            <p className="text-slate-800 font-bold text-lg mt-1">{formatCurrency(totalGross)}</p>
          </div>
        </div>

        <button onClick={() => { setEditingPayroll(null); setForm({ basic_salary: '', allowances_total: '', deductions: '', date_received: '' }); setShowForm(true); }} className="w-full bg-red-800 text-white py-3 rounded-xl font-medium hover:bg-red-900 transition shadow-sm mb-6 animate-slide-up">
          + Add Payroll Entry
        </button>

        <div className="space-y-3">
          <h2 className="text-slate-800 font-semibold animate-slide-up">Transaction History</h2>
          {payrollHistory.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200 animate-slide-up">
              <p className="text-slate-400">No payroll records yet</p>
            </div>
          ) : (
            payrollHistory.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 animate-slide-up">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-800 font-semibold">{formatCurrency(p.net_pay)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{new Date(p.date_received).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <button onClick={() => handleEdit(p)} className="text-blue-400 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg p-1.5 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-lg p-1.5 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-slate-500">Gross:</span>
                  <span className="text-slate-600 text-right">{formatCurrency((parseFloat(p.basic_salary) || 0) + (parseFloat(p.allowances_total) || 0))}</span>
                  <span className="text-slate-500">Deductions:</span>
                  <span className="text-red-500 text-right">-{formatCurrency(p.deductions)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => { setShowForm(false); setEditingPayroll(null); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-slate-800 font-bold text-lg mb-4">{editingPayroll ? 'Edit Payroll Entry' : 'Add Payroll Entry'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="text-slate-600 text-xs mb-1 block">Date Received</label><input type="date" value={form.date_received} onChange={(e) => setForm({...form, date_received: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400" required /></div>
              <div><label className="text-slate-600 text-xs mb-1 block">Basic Salary (₱)</label><input type="number" step="0.01" value={form.basic_salary} onChange={(e) => setForm({...form, basic_salary: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400" placeholder="0.00" /></div>
              <div><label className="text-slate-600 text-xs mb-1 block">Company Allowances (₱)</label><input type="number" step="0.01" value={form.allowances_total} onChange={(e) => setForm({...form, allowances_total: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400" placeholder="0.00" /></div>
              <div><label className="text-slate-600 text-xs mb-1 block">Deductions (₱)</label><input type="number" step="0.01" value={form.deductions} onChange={(e) => setForm({...form, deductions: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400" placeholder="0.00" /></div>
              <button type="submit" className="w-full bg-red-800 text-white p-3 rounded-xl font-semibold hover:bg-red-900 transition">{editingPayroll ? 'Update Payroll' : 'Save Payroll'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}