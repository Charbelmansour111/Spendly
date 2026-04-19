import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

const PAGE_TITLES = {
  '/': 'Spendly',
  '/login': 'Login — Spendly',
  '/register': 'Sign Up — Spendly',
  '/verify-email': 'Verify Email — Spendly',
  '/forgot-password': 'Forgot Password — Spendly',
  '/account-type': 'Account Type — Spendly',
  '/terms': 'Terms of Service — Spendly',
  '/privacy': 'Privacy Policy — Spendly',
  '/dashboard': 'Dashboard — Spendly',
  '/transactions': 'Transactions — Spendly',
  '/budgets': 'Budgets — Spendly',
  '/goals': 'Goals — Spendly',
  '/reports': 'Reports — Spendly',
  '/insights': 'Insights — Spendly',
  '/wellness': 'Wellness — Spendly',
  '/profile': 'Profile — Spendly',
}

function RouteTitle() {
  const { pathname } = useLocation()
  useEffect(() => { document.title = PAGE_TITLES[pathname] || 'Spendly' }, [pathname])
  return null
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}
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
import Subscriptions from './pages/Subscriptions'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'

function App() {
  return (
    <BrowserRouter>
      <RouteTitle />
      <ScrollToTop />
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
        <Route path="/subscriptions"          element={<Subscriptions />} />
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
