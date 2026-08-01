import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast.jsx'

const FIELD_COLORS = [
  { name: 'Red', from: 'from-red-500', to: 'to-red-700', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', light: 'bg-red-100' },
  { name: 'Blue', from: 'from-blue-500', to: 'to-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', light: 'bg-blue-100' },
  { name: 'Green', from: 'from-green-500', to: 'to-green-700', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', light: 'bg-green-100' },
  { name: 'Purple', from: 'from-purple-500', to: 'to-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', light: 'bg-purple-100' },
  { name: 'Orange', from: 'from-orange-500', to: 'to-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', light: 'bg-orange-100' },
  { name: 'Teal', from: 'from-teal-500', to: 'to-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', light: 'bg-teal-100' },
  { name: 'Pink', from: 'from-pink-500', to: 'to-pink-700', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600', light: 'bg-pink-100' },
  { name: 'Slate', from: 'from-slate-600', to: 'to-slate-800', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', light: 'bg-slate-100' },
]

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [fieldAreas, setFieldAreas] = useState([])
  const [payroll, setPayroll] = useState(null)
  const [showAddField, setShowAddField] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [cardMode, setCardMode] = useState('payroll')
  const [switching, setSwitching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarPosition, setAvatarPosition] = useState({ x: 50, y: 50 })
  const [avatarScale, setAvatarScale] = useState(1)
  const [showCropModal, setShowCropModal] = useState(false)
  const [tempAvatarFile, setTempAvatarFile] = useState(null)
  const [tempAvatarPreview, setTempAvatarPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const cropRef = useRef(null)
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [newField, setNewField] = useState({ name: '', location: '', transportAmount: '', mealAmount: '', hotelAmount: '', color: 'red' })
  const [profileForm, setProfileForm] = useState({ full_name: '', employee_id: '', department: '', position: '', contact_number: '', address: '', company_name: '' })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount || 0)
  }

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }
    setUser(user)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        employee_id: profile.employee_id || '',
        department: profile.department || '',
        position: profile.position || '',
        contact_number: profile.contact_number || '',
        address: profile.address || '',
        company_name: profile.company_name || ''
      })
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url)
      if (profile.avatar_position) setAvatarPosition(profile.avatar_position)
      if (profile.avatar_scale) setAvatarScale(profile.avatar_scale)
    }
    const { data: fields } = await supabase.from('field_areas').select('*, field_allowances(*)').eq('user_id', user.id).order('created_at', { ascending: false })
    setFieldAreas(fields || [])
    const { data: payrollData } = await supabase.from('payroll').select('*').eq('user_id', user.id).order('date_received', { ascending: false }).limit(1).maybeSingle()
    setPayroll(payrollData)
    setLoading(false)
  }, [navigate])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSwitchCard = () => {
    setSwitching(true)
    setCardFlipped(false)
    setTimeout(() => { setCardMode(prev => prev === 'payroll' ? 'field' : 'payroll'); setTimeout(() => setSwitching(false), 50) }, 200)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/') }

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setTempAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (event) => { setTempAvatarPreview(event.target.result); setShowCropModal(true) }
    reader.readAsDataURL(file)
  }

  const handleCropMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleCropMouseMove = (e) => {
    if (!isDragging || !cropRef.current) return
    const rect = cropRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setAvatarPosition({ x: Math.max(0, Math.min(100, Math.round(x))), y: Math.max(0, Math.min(100, Math.round(y))) })
  }

  const handleCropMouseUp = () => { setIsDragging(false) }

  const handleCropSave = async () => {
    if (!tempAvatarFile) return
    const fileExt = tempAvatarFile.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, tempAvatarFile)
    if (uploadError) { addToast(uploadError.message, 'error'); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
    await supabase.from('profiles').update({ avatar_url: publicUrl, avatar_position: avatarPosition, avatar_scale: avatarScale }).eq('id', user.id)
    setAvatarUrl(publicUrl)
    setShowCropModal(false)
    setTempAvatarFile(null)
    setTempAvatarPreview(null)
    setIsDragging(false)
    addToast('Profile picture updated!', 'success')
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setTempAvatarFile(null)
    setTempAvatarPreview(null)
    setAvatarPosition({ x: 50, y: 50 })
    setAvatarScale(1)
    setIsDragging(false)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profileForm })
    if (error) addToast(error.message, 'error')
    else { addToast('Profile updated!', 'success'); setShowProfileModal(false); fetchData() }
  }

  const handleAddField = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.from('field_areas').insert({ user_id: user.id, name: newField.name, location: newField.location, color: newField.color }).select().single()
    if (error) { addToast(error.message, 'error'); return }
    const allowances = []
    if (newField.transportAmount) allowances.push({ category: 'transport', name: 'Transport Allowance', total_amount: parseFloat(newField.transportAmount), spent_amount: 0, field_area_id: data.id, user_id: user.id, excluded: false })
    if (newField.mealAmount) allowances.push({ category: 'meal', name: 'Meal Subsidy', total_amount: parseFloat(newField.mealAmount), spent_amount: 0, field_area_id: data.id, user_id: user.id, excluded: false })
    if (newField.hotelAmount) allowances.push({ category: 'hotel', name: 'Hotel Accommodation', total_amount: parseFloat(newField.hotelAmount), spent_amount: 0, field_area_id: data.id, user_id: user.id, excluded: false })
    if (allowances.length > 0) await supabase.from('field_allowances').insert(allowances)
    addToast('Field area created!', 'success')
    setShowAddField(false)
    setNewField({ name: '', location: '', transportAmount: '', mealAmount: '', hotelAmount: '', color: 'red' })
    fetchData()
  }

  const totalFieldBudget = fieldAreas.reduce((s, f) => s + (f.field_allowances || []).filter(al => !al.excluded).reduce((a, al) => a + (parseFloat(al.total_amount) || 0), 0), 0)
  const totalFieldSpent = fieldAreas.reduce((s, f) => s + (f.field_allowances || []).filter(al => !al.excluded).reduce((a, al) => a + (parseFloat(al.spent_amount) || 0), 0), 0)
  const totalFieldRemaining = totalFieldBudget - totalFieldSpent

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <span className="absolute text-4xl" style={{top: '10%', left: '5%', animation: 'float-slow 6s ease-in-out infinite'}}>💵</span>
          <span className="absolute text-3xl" style={{top: '20%', right: '10%', animation: 'float-medium 5s ease-in-out infinite', animationDelay: '0.5s'}}>💳</span>
          <span className="absolute text-5xl" style={{top: '50%', left: '15%', animation: 'float-fast 4s ease-in-out infinite', animationDelay: '1s'}}>🪙</span>
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-gradient-to-r from-red-200 to-red-300 rounded-full opacity-20 blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite'}}></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gradient-to-r from-blue-200 to-purple-300 rounded-full opacity-20 blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite', animationDelay: '2s'}}></div>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <span className="absolute text-4xl" style={{top: '10%', left: '5%', animation: 'float-slow 6s ease-in-out infinite'}}>💵</span>
        <span className="absolute text-3xl" style={{top: '20%', right: '10%', animation: 'float-medium 5s ease-in-out infinite', animationDelay: '0.5s'}}>💳</span>
        <span className="absolute text-5xl" style={{top: '50%', left: '15%', animation: 'float-fast 4s ease-in-out infinite', animationDelay: '1s'}}>🪙</span>
        <span className="absolute text-2xl" style={{top: '70%', right: '20%', animation: 'float-slow 6s ease-in-out infinite', animationDelay: '1.5s'}}>💰</span>
        <span className="absolute text-4xl" style={{bottom: '15%', left: '30%', animation: 'float-medium 5s ease-in-out infinite', animationDelay: '2s'}}>💶</span>
        <span className="absolute text-3xl" style={{top: '35%', right: '5%', animation: 'float-fast 4s ease-in-out infinite', animationDelay: '2.5s'}}>🏦</span>
        <span className="absolute text-5xl" style={{top: '5%', right: '30%', animation: 'float-slow 6s ease-in-out infinite', animationDelay: '3s'}}>💷</span>
        <span className="absolute text-2xl" style={{bottom: '30%', left: '5%', animation: 'float-medium 5s ease-in-out infinite', animationDelay: '3.5s'}}>📊</span>
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-gradient-to-r from-red-200 to-red-300 rounded-full opacity-20 blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite'}}></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gradient-to-r from-blue-200 to-purple-300 rounded-full opacity-20 blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite', animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-slate-900/25 flex-shrink-0 overflow-hidden bg-slate-200">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" style={{ objectPosition: `${avatarPosition.x}% ${avatarPosition.y}%`, transform: `scale(${avatarScale})` }} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">W</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-slate-800 font-bold text-lg truncate">WalletTracker</h1>
              <p className="text-slate-500 text-xs truncate">{profile?.full_name || user.email}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setShowProfileModal(true)} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition text-xs shadow-sm whitespace-nowrap">Profile</button>
            <button onClick={handleLogout} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition text-xs shadow-sm whitespace-nowrap">Logout</button>
          </div>
        </div>

        {/* ATM Card Stack */}
        <div className="mb-6 animate-slide-up flex flex-col items-center">
          <div className="relative w-full max-w-[320px] sm:max-w-sm md:max-w-md h-48 sm:h-52 md:h-56">
            <div className="absolute inset-0 rounded-2xl md:rounded-3xl overflow-hidden shadow-lg opacity-75" style={{ transform: 'scale(0.90) translateY(25px)', zIndex: 0 }}>
              {cardMode === 'payroll' ? (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 via-gray-800 to-slate-900 p-4 sm:p-5">
                  <div className="flex justify-between items-start mb-4"><div className="w-8 sm:w-10 h-6 sm:h-7 bg-gradient-to-br from-gray-400 to-gray-500 rounded-md"></div><p className="text-white/50 text-[10px] sm:text-xs font-bold tracking-widest">FIELD</p></div>
                  <p className="text-white/30 text-[10px] sm:text-xs">REMAINING BUDGET</p><p className="text-white/70 text-lg sm:text-xl font-bold mt-1">{formatCurrency(totalFieldRemaining)}</p>
                  <div className="flex justify-between items-end mt-4"><div><p className="text-white/30 text-[10px] sm:text-xs">CARD HOLDER</p><p className="text-white/60 text-xs sm:text-sm uppercase truncate">{(profile?.full_name || 'USER')}</p></div></div>
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-950 via-red-900 to-slate-950 p-4 sm:p-5">
                  <div className="flex justify-between items-start mb-4"><div className="w-8 sm:w-10 h-6 sm:h-7 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md"></div><p className="text-white/50 text-[10px] sm:text-xs font-bold tracking-widest">PAYROLL</p></div>
                  <p className="text-white/30 text-[10px] sm:text-xs">NET PAY</p><p className="text-white/70 text-lg sm:text-xl font-bold mt-1">{formatCurrency(payroll?.net_pay || 0)}</p>
                  <div className="flex justify-between items-end mt-4"><div><p className="text-white/30 text-[10px] sm:text-xs">CARD HOLDER</p><p className="text-white/60 text-xs sm:text-sm uppercase truncate">{(profile?.full_name || 'USER')}</p></div></div>
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-2xl md:rounded-3xl overflow-hidden" style={{ zIndex: 1 }}>
              <div className={`w-full h-full transition-all duration-300 cursor-pointer ${switching ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} onClick={() => setCardFlipped(!cardFlipped)}>
                <div className={`relative w-full h-full transition-transform duration-300 transform-style-3d ${cardFlipped ? 'rotate-y-180' : ''}`}>
                  <div className="absolute inset-0 backface-hidden">
                    {cardMode === 'payroll' ? (
                      <div className="w-full h-full bg-gradient-to-br from-red-950 via-red-900 to-slate-950 p-4 sm:p-5 md:p-7 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"></div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-800/20 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4"><div className="w-8 sm:w-10 md:w-12 h-6 sm:h-7 md:h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md shadow-inner"></div><p className="text-white/80 text-[10px] sm:text-xs font-bold tracking-widest">PAYROLL</p></div>
                          <p className="text-white/60 text-[10px] sm:text-xs">NET PAY</p><p className="text-white text-lg sm:text-xl md:text-3xl font-bold mt-1 mb-4 sm:mb-6 truncate">{formatCurrency(payroll?.net_pay || 0)}</p>
                          <div className="flex justify-between items-end"><div className="min-w-0"><p className="text-white/40 text-[10px] sm:text-xs">CARD HOLDER</p><p className="text-white text-xs sm:text-sm uppercase truncate max-w-[120px] sm:max-w-[160px]">{(profile?.full_name || 'USER')}</p></div><div className="flex -space-x-2 flex-shrink-0"><div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-500/60"></div><div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-yellow-500/60"></div></div></div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 via-gray-800 to-slate-900 p-4 sm:p-5 md:p-7 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"></div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-600/20 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4"><div className="w-8 sm:w-10 md:w-12 h-6 sm:h-7 md:h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-md shadow-inner"></div><p className="text-white/80 text-[10px] sm:text-xs font-bold tracking-widest">FIELD</p></div>
                          <p className="text-white/60 text-[10px] sm:text-xs">REMAINING BUDGET</p><p className="text-white text-lg sm:text-xl md:text-3xl font-bold mt-1 mb-4 sm:mb-6 truncate">{formatCurrency(totalFieldRemaining)}</p>
                          <div className="flex justify-between items-end"><div className="min-w-0"><p className="text-white/40 text-[10px] sm:text-xs">CARD HOLDER</p><p className="text-white text-xs sm:text-sm uppercase truncate max-w-[120px] sm:max-w-[160px]">{(profile?.full_name || 'USER')}</p></div><div className="flex -space-x-2 flex-shrink-0"><div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-400/60"></div><div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-500/60"></div></div></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 backface-hidden rotate-y-180">
                    {cardMode === 'payroll' ? (
                      <div className="w-full h-full bg-gradient-to-br from-red-950 via-slate-900 to-black p-4 sm:p-5 md:p-7"><div className="absolute top-6 left-0 right-0 h-8 bg-gray-950"></div><div className="mt-12 sm:mt-14 space-y-1 sm:space-y-1.5 text-white/80 text-[10px] sm:text-xs"><p className="truncate">👤 {profile?.full_name || 'Not set'}</p><p className="truncate">🏢 {profile?.company_name || 'Company'}</p><p className="truncate">🆔 {profile?.employee_id || 'Not set'}</p><p className="truncate">📞 {profile?.contact_number || 'Not set'}</p><p className="truncate">📍 {profile?.address || 'Not set'}</p></div><div className="absolute bottom-4 right-4 text-white/30 text-[10px] sm:text-xs">PAYROLL CARD</div></div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 via-gray-900 to-black p-4 sm:p-5 md:p-7"><div className="absolute top-6 left-0 right-0 h-8 bg-gray-800"></div><div className="mt-12 sm:mt-14 space-y-1 sm:space-y-1.5 text-white/80 text-[10px] sm:text-xs"><p className="truncate">👤 {profile?.full_name || 'Not set'}</p><p className="truncate">🏢 {profile?.company_name || 'Company'}</p><p className="truncate">🆔 {profile?.employee_id || 'Not set'}</p><p className="truncate">📞 {profile?.contact_number || 'Not set'}</p><p className="truncate">📍 {profile?.address || 'Not set'}</p></div><div className="absolute bottom-4 right-4 text-white/30 text-[10px] sm:text-xs">FIELD CARD</div></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleSwitchCard} className="mt-10 mb-2 w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg" style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <span className={`transition-transform duration-300 ${switching ? 'rotate-180' : ''}`}><img width="20" height="20" src="https://img.icons8.com/plumpy/24/process.png" alt="switch"/></span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6 animate-slide-up">
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200"><p className="text-slate-500 text-[10px] sm:text-xs">Payroll</p><p className="text-slate-800 text-base sm:text-lg font-bold truncate">{formatCurrency(payroll?.net_pay || 0)}</p></div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200"><p className="text-slate-500 text-[10px] sm:text-xs">Field Budget</p><p className="text-slate-800 text-base sm:text-lg font-bold truncate">{formatCurrency(totalFieldBudget)}</p></div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200"><p className="text-slate-500 text-[10px] sm:text-xs">Spent</p><p className="text-red-500 text-base sm:text-lg font-bold truncate">{formatCurrency(totalFieldSpent)}</p></div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200"><p className="text-slate-500 text-[10px] sm:text-xs">Remaining</p><p className="text-green-500 text-base sm:text-lg font-bold truncate">{formatCurrency(totalFieldRemaining)}</p></div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 animate-slide-up">
          <button onClick={() => navigate('/payroll')} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition text-left"><span className="text-2xl sm:text-3xl">💼</span><h3 className="text-slate-800 font-semibold mt-2 text-sm sm:text-base">Payroll</h3><p className="text-slate-400 text-[10px] sm:text-xs mt-1">View salary & history</p>{payroll && <p className="text-green-600 font-bold text-xs sm:text-sm mt-2 truncate">{formatCurrency(payroll.net_pay)}</p>}</button>
          <button onClick={() => setShowAddField(true)} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition text-left"><span className="text-2xl sm:text-3xl">➕</span><h3 className="text-slate-800 font-semibold mt-2 text-sm sm:text-base">New Field</h3><p className="text-slate-400 text-[10px] sm:text-xs mt-1">Create field area</p></button>
        </div>

        <div className="space-y-3">
          <h2 className="text-slate-800 font-semibold animate-slide-up">Field Areas</h2>
          {fieldAreas.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200 animate-slide-up"><p className="text-4xl mb-2">📋</p><p className="text-slate-500">No field areas yet</p></div>
          ) : (
            fieldAreas.map((field) => {
              const budget = (field.field_allowances || []).filter(a => !a.excluded).reduce((s, a) => s + (parseFloat(a.total_amount) || 0), 0)
              const spent = (field.field_allowances || []).filter(a => !a.excluded).reduce((s, a) => s + (parseFloat(a.spent_amount) || 0), 0)
              const color = FIELD_COLORS.find(c => c.name.toLowerCase() === (field.color || 'red')) || FIELD_COLORS[0]
              return (
                <div key={field.id} onClick={() => navigate(`/field/${field.id}`)} className={`rounded-2xl p-4 sm:p-5 shadow-sm border cursor-pointer hover:shadow-md transition animate-slide-up ${color.bg} ${color.border}`}>
                  <div className="flex justify-between items-start"><div className="min-w-0"><h3 className="text-slate-800 font-semibold truncate">{field.name}</h3><p className="text-slate-400 text-xs truncate">{field.location || 'No location'}</p></div><span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ml-2 ${field.status === 'active' ? 'bg-green-100 text-green-600' : field.status === 'completed' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{field.status}</span></div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs sm:text-sm"><span className="text-slate-500">Budget: <span className="font-medium text-slate-700">{formatCurrency(budget)}</span></span><span className="text-slate-500">Spent: <span className="font-medium text-red-500">{formatCurrency(spent)}</span></span><span className="text-slate-500">Left: <span className="font-medium text-green-500">{formatCurrency(budget - spent)}</span></span></div>
                  <div className="flex gap-1 mt-2">{(field.field_allowances || []).map(a => (<span key={a.id} className="text-base sm:text-lg">{a.category === 'transport' ? '🚗' : a.category === 'meal' ? '🍽️' : a.category === 'hotel' ? '🏨' : '📋'}</span>))}</div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-slate-800 font-bold text-lg mb-4">Profile Details</h3>
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="text-slate-600 text-xs mb-2 block">Profile Picture</label>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border-2 border-slate-300">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" style={{ objectPosition: `${avatarPosition.x}% ${avatarPosition.y}%`, transform: `scale(${avatarScale})` }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
                    )}
                  </div>
                  <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-600 transition text-center">Choose Photo<input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" /></label>
                </div>
              </div>
              {['full_name','employee_id','company_name','department','position','contact_number','address'].map(f => (
                <div key={f}><label className="text-slate-600 text-xs mb-1 block capitalize">{f.replace('_',' ')}</label><input type="text" value={profileForm[f]} onChange={(e) => setProfileForm({...profileForm, [f]: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400" /></div>
              ))}
              <button type="submit" className="w-full bg-slate-800 text-white p-3 rounded-xl font-semibold hover:bg-slate-900 transition">Save Profile</button>
            </form>
          </div>
        </div>
      )}

      {/* Crop/Position Modal with Square container, Circle guide, and Gridlines */}
      {showCropModal && tempAvatarPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onMouseUp={handleCropMouseUp} onMouseLeave={handleCropMouseUp}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <h3 className="text-slate-800 font-bold text-lg mb-2">Position Photo</h3>
            <p className="text-slate-500 text-xs mb-4">Drag to reposition. Use slider to zoom.</p>
            
            {/* Square container with gridlines and circle guide */}
            <div className="flex justify-center mb-4">
              <div 
                ref={cropRef}
                className="w-64 h-64 relative cursor-grab active:cursor-grabbing overflow-hidden border-2 border-slate-300 rounded-lg"
                style={{ background: '#f1f5f9' }}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
              >
                {/* Gridlines */}
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '25% 25%' }}></div>
                
                {/* Image */}
                <img 
                  src={tempAvatarPreview} 
                  alt="Crop" 
                  className="w-full h-full object-cover absolute inset-0"
                  style={{ objectPosition: `${avatarPosition.x}% ${avatarPosition.y}%`, transform: `scale(${avatarScale})` }}
                  draggable={false}
                />
                
                {/* Circle guide overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-60 h-60 rounded-full border-2 border-white shadow-[0_0_0_1000px_rgba(0,0,0,0.3)]"></div>
                </div>
              </div>
            </div>

            {/* Zoom slider */}
            <div className="mb-4">
              <label className="text-slate-600 text-xs mb-1 block">Zoom: {avatarScale.toFixed(1)}x</label>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.1" 
                value={avatarScale} 
                onChange={(e) => setAvatarScale(parseFloat(e.target.value))}
                className="w-full accent-slate-800"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={handleCropCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition">Cancel</button>
              <button onClick={handleCropSave} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {showAddField && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowAddField(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h3 className="text-slate-800 font-bold">New Field Area</h3><button onClick={() => setShowAddField(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
            <form onSubmit={handleAddField} className="space-y-4">
              <div><label className="text-slate-600 text-sm mb-1 block">Field Name *</label><input type="text" value={newField.name} onChange={(e) => setNewField({...newField, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" required /></div>
              <div><label className="text-slate-600 text-sm mb-1 block">Location</label><input type="text" value={newField.location} onChange={(e) => setNewField({...newField, location: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" /></div>
              <div><label className="text-slate-600 text-sm mb-2 block">Color Theme</label><div className="grid grid-cols-4 gap-2">{FIELD_COLORS.map((c) => (<button key={c.name} type="button" onClick={() => setNewField({...newField, color: c.name.toLowerCase()})} className={`h-10 rounded-xl bg-gradient-to-r ${c.from} ${c.to} transition-all ${newField.color === c.name.toLowerCase() ? 'ring-2 ring-offset-2 ring-slate-400 scale-105' : 'hover:scale-105'}`}>{newField.color === c.name.toLowerCase() && <span className="text-white text-lg">✓</span>}</button>))}</div></div>
              <div className="border-t pt-4"><p className="text-slate-600 text-sm font-medium mb-3">Allowance Budgets</p><div className="space-y-3"><div><label className="text-slate-500 text-xs mb-1 block">🚗 Transport</label><input type="number" step="0.01" value={newField.transportAmount} onChange={(e) => setNewField({...newField, transportAmount: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" placeholder="0.00" /></div><div><label className="text-slate-500 text-xs mb-1 block">🍽️ Meal</label><input type="number" step="0.01" value={newField.mealAmount} onChange={(e) => setNewField({...newField, mealAmount: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" placeholder="0.00" /></div><div><label className="text-slate-500 text-xs mb-1 block">🏨 Hotel</label><input type="number" step="0.01" value={newField.hotelAmount} onChange={(e) => setNewField({...newField, hotelAmount: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400" placeholder="0.00" /></div></div></div>
              <button type="submit" className="w-full bg-slate-800 text-white p-3 rounded-xl font-semibold hover:bg-slate-900 transition shadow-sm">Create Field Area</button>
            </form>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/calculator')} className="fixed bottom-6 right-6 w-12 h-12 sm:w-14 sm:h-14 bg-slate-800 text-white rounded-2xl shadow-lg shadow-slate-900/25 hover:bg-slate-900 transition flex items-center justify-center text-xl sm:text-2xl z-40 animate-slide-up">🧮</button>
    </div>
  )
}