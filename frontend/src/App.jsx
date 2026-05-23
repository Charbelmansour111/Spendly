import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { scheduleReminders } from './utils/notifications'
import { WalletProvider } from './context/WalletContext'

const PAGE_TITLES = {
  '/': 'Fina',
  '/login': 'Login — Fina',
  '/register': 'Sign Up — Fina',
  '/verify-email': 'Verify Email — Fina',
  '/check-email': 'Check Your Email — Fina',
  '/forgot-password': 'Forgot Password — Fina',
  '/account-type': 'Account Type — Fina',
  '/terms': 'Terms of Service — Fina',
  '/privacy': 'Privacy Policy — Fina',
  '/wallets': 'Choose Wallet — Fina',
  '/create-wallet': 'Create Wallet — Fina',
  '/family': 'Family Overview — Fina',
  '/wallet/:id/profile': 'Wallet Profile — Fina',
  '/dashboard': 'Dashboard — Fina',
  '/transactions': 'Transactions — Fina',
  '/budgets': 'Budgets — Fina',
  '/goals': 'Goals — Fina',
  '/reports': 'Reports — Fina',
  '/insights': 'Insights — Fina',
  '/net-worth': 'Net Worth — Fina',
  '/wellness': 'Wellness — Fina',
  '/profile': 'Profile — Fina',
  '/settings': 'Settings — Fina',
}

function RouteTitle() {
  const { pathname } = useLocation()
  useEffect(() => { document.title = PAGE_TITLES[pathname] || 'Fina' }, [pathname])
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
import Settings from './pages/Settings'
import VerifyEmail from './pages/VerifyEmail'
import CheckEmail from './pages/CheckEmail'
import ForgotPassword from './pages/ForgotPassword'
import AccountType from './pages/AccountType'
import Dashboard from './pages/Dashboard'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Wellness from './pages/Wellness'
import Transactions from './pages/Transactions'
import NetWorth from './pages/NetWorth'
import QuickAdd from './pages/QuickAdd'
import Subscriptions from './pages/Subscriptions'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import WalletSelect from './pages/WalletSelect'
import CreateWallet from './pages/CreateWallet'
import FamilyOverview from './pages/FamilyOverview'
import WalletProfile from './pages/WalletProfile'
import WalletGuard from './components/WalletGuard'

function NetWorthGuarded() {
  const { key } = useLocation()
  return <NetWorth key={key} />
}

function App() {
  useEffect(() => {
    if (localStorage.getItem('token')) scheduleReminders()
  }, [])

  return (
    <BrowserRouter>
      <WalletProvider>
        <RouteTitle />
        <ScrollToTop />
        <Routes>
          <Route path="/"                      element={<Landing />} />
          <Route path="/login"                 element={<Login />} />
          <Route path="/register"              element={<Register />} />
          <Route path="/verify-email"          element={<VerifyEmail />} />
          <Route path="/check-email"           element={<CheckEmail />} />
          <Route path="/forgot-password"       element={<ForgotPassword />} />
          <Route path="/account-type"          element={<AccountType />} />
          <Route path="/terms"                 element={<Terms />} />
          <Route path="/privacy"               element={<Privacy />} />

          {/* Wallet selection + configuration (no wallet guard needed) */}
          <Route path="/wallets"               element={<WalletSelect />} />
          <Route path="/create-wallet"         element={<CreateWallet />} />
          <Route path="/wallet/:id/profile"    element={<WalletProfile />} />
          <Route path="/wallet/:id/app"        element={<Navigate to="/wallets" replace />} />

          {/* Wallet-guarded pages */}
          <Route path="/dashboard"             element={<WalletGuard><Dashboard /></WalletGuard>} />
          <Route path="/profile"               element={<WalletGuard><Profile /></WalletGuard>} />
          <Route path="/settings"              element={<WalletGuard><Settings /></WalletGuard>} />
          <Route path="/budgets"               element={<WalletGuard><Budgets /></WalletGuard>} />
          <Route path="/goals"                 element={<WalletGuard><Goals /></WalletGuard>} />
          <Route path="/savings"               element={<Navigate to="/goals" replace />} />
          <Route path="/debts"                 element={<Navigate to="/goals" replace />} />
          <Route path="/subscriptions"         element={<WalletGuard><Subscriptions /></WalletGuard>} />
          <Route path="/reports"               element={<WalletGuard><Reports /></WalletGuard>} />
          <Route path="/insights"              element={<Navigate to="/reports" replace />} />
          <Route path="/wellness"              element={<WalletGuard><Wellness /></WalletGuard>} />
          <Route path="/transactions"          element={<WalletGuard><Transactions /></WalletGuard>} />
          <Route path="/net-worth"             element={<WalletGuard><NetWorthGuarded /></WalletGuard>} />
          <Route path="/quick-add"             element={<WalletGuard><QuickAdd /></WalletGuard>} />
          <Route path="/family"                element={<WalletGuard><FamilyOverview /></WalletGuard>} />

          <Route path="/business"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/business/*"            element={<Navigate to="/dashboard" replace />} />
          <Route path="/alerts"                element={<Navigate to="/budgets" replace />} />
          <Route path="/advisor/apply"         element={<Navigate to="/dashboard" replace />} />
          <Route path="/advisor/dashboard"     element={<Navigate to="/dashboard" replace />} />
          <Route path="/advisors"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/advisors"        element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </WalletProvider>
    </BrowserRouter>
  )
}

export default App
