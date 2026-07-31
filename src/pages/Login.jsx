import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast.jsx'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    if (isSignUp) {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ 
        email, password,
        options: { data: { full_name: fullName } }
      })
      
      if (signUpError) {
        addToast(signUpError.message, 'error')
      } else if (authData.user) {
        await supabase.from('profiles').insert({ id: authData.user.id, full_name: fullName })
        addToast('Account created! You can now sign in.', 'success')
        setIsSignUp(false)
        setFullName('')
        setEmail('')
        setPassword('')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        addToast('Invalid email or password', 'error')
      } else {
        addToast('Welcome back!', 'success')
        setTimeout(() => navigate('/dashboard'), 800)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <span className="absolute text-3xl sm:text-4xl" style={{top: '8%', left: '5%', animation: 'float-slow 6s ease-in-out infinite'}}>💵</span>
        <span className="absolute text-2xl sm:text-3xl" style={{top: '15%', right: '8%', animation: 'float-medium 5s ease-in-out infinite', animationDelay: '0.5s'}}>💳</span>
        <span className="absolute text-4xl sm:text-5xl" style={{top: '45%', left: '10%', animation: 'float-fast 4s ease-in-out infinite', animationDelay: '1s'}}>🪙</span>
        <span className="absolute text-xl sm:text-2xl" style={{top: '65%', right: '15%', animation: 'float-slow 6s ease-in-out infinite', animationDelay: '1.5s'}}>💰</span>
        <span className="absolute text-3xl sm:text-4xl" style={{bottom: '20%', left: '25%', animation: 'float-medium 5s ease-in-out infinite', animationDelay: '2s'}}>💶</span>
        <span className="absolute text-2xl sm:text-3xl" style={{top: '30%', right: '5%', animation: 'float-fast 4s ease-in-out infinite', animationDelay: '2.5s'}}>🏦</span>
        <span className="absolute text-4xl sm:text-5xl" style={{top: '5%', right: '25%', animation: 'float-slow 6s ease-in-out infinite', animationDelay: '3s'}}>💷</span>
        <span className="absolute text-xl sm:text-2xl" style={{bottom: '35%', left: '5%', animation: 'float-medium 5s ease-in-out infinite', animationDelay: '3.5s'}}>📊</span>
        <div className="absolute -top-20 -left-20 w-60 sm:w-80 h-60 sm:h-80 bg-gradient-to-r from-red-200 to-red-300 rounded-full opacity-20 blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite'}}></div>
        <div className="absolute -bottom-20 -right-20 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-r from-blue-200 to-purple-300 rounded-full opacity-20 blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite', animationDelay: '2s'}}></div>
      </div>

      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-slate-900 via-red-950 to-black items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite'}}></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-700/10 rounded-full blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite', animationDelay: '2s'}}></div>
        </div>
        <div className="relative z-10 text-center">
          <div className="w-20 sm:w-24 h-20 sm:h-24 bg-gradient-to-br from-red-600 to-red-950 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl shadow-red-900/30">
            <svg className="w-10 sm:w-12 h-10 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">WalletTracker</h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-md">Track company allowances, field expenses, and payroll all in one place.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12">
        <div className="w-full max-w-sm mx-auto relative z-10">
          <div className="md:hidden flex flex-col items-center mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-red-600 to-red-950 rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/20 mb-3">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800">WalletTracker</h1>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-slate-500 text-sm mt-1">{isSignUp ? 'Fill in your details to get started' : 'Enter your credentials to continue'}</p>
          </div>

          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button onClick={() => setIsSignUp(false)} className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${!isSignUp ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sign In</button>
            <button onClick={() => setIsSignUp(true)} className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${isSignUp ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sign Up</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="animate-slide-up">
                <label className="block text-slate-600 text-sm font-medium mb-1.5 text-left">Full Name</label>
                <div className="relative">
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-3 sm:p-3.5 pl-10 sm:pl-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all text-sm sm:text-base"
                    placeholder="Juan Dela Cruz" required />
                  <svg className="absolute left-3 sm:left-3.5 top-3.5 sm:top-4 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-slate-600 text-sm font-medium mb-1.5 text-left">Email</label>
              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 sm:p-3.5 pl-10 sm:pl-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all text-sm sm:text-base"
                  placeholder="you@company.com" required />
                <svg className="absolute left-3 sm:left-3.5 top-3.5 sm:top-4 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 text-sm font-medium mb-1.5 text-left">Password</label>
              <div className="relative">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 sm:p-3.5 pl-10 sm:pl-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all text-sm sm:text-base"
                  placeholder="••••••••" required />
                <svg className="absolute left-3 sm:left-3.5 top-3.5 sm:top-4 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-red-800 to-red-950 text-white p-3 sm:p-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-red-900/25 disabled:opacity-60 transition-all text-sm sm:text-base">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  {isSignUp ? 'Creating...' : 'Signing in...'}
                </span>
              ) : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}