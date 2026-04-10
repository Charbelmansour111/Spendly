import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Budgets from './pages/Budgets'
import Savings from './pages/Savings'
import Reports from './pages/Reports'
import Insights from './pages/Insights'
import Wellness from './pages/Wellness'
import Transactions from './pages/Transactions'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/"                element={<Landing />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/verify-email"    element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* App pages */}
        <Route path="/dashboard"       element={<Dashboard />} />
        <Route path="/profile"         element={<Profile />} />
        <Route path="/budgets"         element={<Budgets />} />
        <Route path="/savings"         element={<Savings />} />
        <Route path="/reports"         element={<Reports />} />
        <Route path="/insights"        element={<Insights />} />
        <Route path="/wellness"        element={<Wellness />} />
        <Route path="/transactions"    element={<Transactions />} />

        {/* Redirects */}
        <Route path="/alerts"          element={<Navigate to="/budgets" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App