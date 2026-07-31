import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Calculator() {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [shouldReset, setShouldReset] = useState(false)
  const [history, setHistory] = useState([])
  const navigate = useNavigate()

  const handleClick = (value) => {
    if (shouldReset && value !== 'C' && value !== '⌫') {
      setDisplay(value)
      setExpression('')
      setShouldReset(false)
      return
    }

    switch(value) {
      case 'C':
        setDisplay('0')
        setExpression('')
        setShouldReset(false)
        break
      case '⌫':
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0')
        break
      case '=':
        try {
          const sanitized = display.replace(/×/g, '*').replace(/÷/g, '/')
          const result = eval(sanitized)
          const resultStr = String(Number(result.toFixed(10)))
          setHistory(prev => [{ expr: display, result: resultStr }, ...prev].slice(0, 10))
          setExpression(display + ' =')
          setDisplay(resultStr)
          setShouldReset(true)
        } catch {
          setDisplay('Error')
          setShouldReset(true)
        }
        break
      case '%':
        setDisplay(prev => String(Number(prev) / 100))
        setShouldReset(true)
        break
      default:
        setDisplay(prev => prev === '0' && value !== '.' ? value : prev + value)
    }
  }

  const buttons = [
    ['C', '⌫', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=', '']
  ]

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <span className="absolute text-3xl" style={{top: '8%', right: '12%', animation: 'float-slow 6s ease-in-out infinite'}}>🔢</span>
        <span className="absolute text-4xl" style={{bottom: '12%', left: '8%', animation: 'float-medium 5s ease-in-out infinite'}}>🧮</span>
        <span className="absolute text-2xl" style={{top: '50%', left: '5%', animation: 'float-fast 4s ease-in-out infinite'}}>➕</span>
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-r from-red-200 to-red-300 rounded-full opacity-20 blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite'}}></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-r from-blue-200 to-purple-300 rounded-full opacity-20 blur-3xl" style={{animation: 'pulse-slow 4s ease-in-out infinite', animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-sm animate-scale-in flex flex-col" style={{maxHeight: '90vh'}}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200 hover:bg-slate-50 transition">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <h1 className="text-slate-800 font-bold text-lg">Calculator</h1>
          <div className="w-10"></div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 mb-3 border border-slate-200 shadow-sm flex-shrink-0" style={{maxHeight: '120px', overflowY: 'auto'}}>
            <p className="text-slate-400 text-xs font-medium mb-1.5">History</p>
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-slate-400 truncate mr-2">{h.expr}</span>
                  <span className="text-green-500 font-semibold">{h.result}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Display */}
        <div className="bg-white rounded-2xl p-4 mb-2 border border-slate-200 shadow-sm flex-shrink-0">
          <div className="text-right">
            <p className="text-slate-400 text-xs h-4 mb-1 truncate">{expression}</p>
            <p className="text-slate-800 text-3xl font-bold truncate tracking-tight">{display}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex-shrink-0">
          {buttons.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-1.5 mb-1.5 last:mb-0">
              {row.map((btn, j) => (
                btn ? (
                  <button key={j} onClick={() => handleClick(btn)}
                    className={`p-3 rounded-xl text-base font-bold transition-all active:scale-90 ${
                      btn === '=' 
                        ? 'bg-gradient-to-br from-red-800 to-red-950 text-white shadow-lg shadow-red-900/20'
                        : ['÷', '×', '-', '+'].includes(btn)
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : ['C'].includes(btn)
                        ? 'bg-red-100 text-red-500 hover:bg-red-200'
                        : ['⌫'].includes(btn)
                        ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}>
                    {btn}
                  </button>
                ) : <div key={j} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}