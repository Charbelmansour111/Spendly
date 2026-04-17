import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import AccountType from './pages/AccountType'
import Dashboard from './pages/Dashboard'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Insights from './pages/Insights'
import Wellness from './pages/Wellness'
import Transactions from './pages/Transactions'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                      element={<Landing />} />
        <Route path="/login"                 element={<Login />} />
        <Route path="/register"              element={<Register />} />
        <Route path="/verify-email"          element={<VerifyEmail />} />
        <Route path="/forgot-password"       element={<ForgotPassword />} />
        <Route path="/account-type"          element={<AccountType />} />
        <Route path="/terms"                 element={<Terms />} />
        <Route path="/privacy"               element={<Privacy />} />

        {/* Personal */}
        <Route path="/dashboard"             element={<Dashboard />} />
        <Route path="/profile"               element={<Profile />} />
        <Route path="/budgets"               element={<Budgets />} />
        <Route path="/goals"                 element={<Goals />} />
        <Route path="/savings"               element={<Navigate to="/goals" replace />} />
        <Route path="/debts"                 element={<Navigate to="/goals" replace />} />
        <Route path="/subscriptions"         element={<Navigate to="/dashboard" replace />} />
        <Route path="/reports"               element={<Reports />} />
        <Route path="/insights"              element={<Insights />} />
        <Route path="/wellness"              element={<Wellness />} />
        <Route path="/transactions"          element={<Transactions />} />

        <Route path="/business"              element={<Navigate to="/dashboard" replace />} />
        <Route path="/business/*"            element={<Navigate to="/dashboard" replace />} />
        <Route path="/alerts"                element={<Navigate to="/budgets" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
