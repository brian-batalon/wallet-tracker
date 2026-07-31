import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast.jsx'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Calculator from './pages/Calculator'
import Payroll from './pages/Payroll'
import FieldArea from './pages/FieldArea'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/field/:id" element={<FieldArea />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App