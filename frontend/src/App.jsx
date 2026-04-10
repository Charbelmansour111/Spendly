import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import AccountType from './pages/AccountType'
import Dashboard from './pages/Dashboard'
import BusinessDashboard from './pages/BusinessDashboard'
import BusinessMenu from './pages/BusinessMenu'
import BusinessStock from './pages/BusinessStock'
import BusinessTransactions from './pages/BusinessTransactions'
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
        <Route path="/"                      element={<Landing />} />
        <Route path="/login"                 element={<Login />} />
        <Route path="/register"              element={<Register />} />
        <Route path="/verify-email"          element={<VerifyEmail />} />
        <Route path="/forgot-password"       element={<ForgotPassword />} />
        <Route path="/account-type"          element={<AccountType />} />

        {/* Personal */}
        <Route path="/dashboard"             element={<Dashboard />} />
        <Route path="/profile"               element={<Profile />} />
        <Route path="/budgets"               element={<Budgets />} />
        <Route path="/savings"               element={<Savings />} />
        <Route path="/reports"               element={<Reports />} />
        <Route path="/insights"              element={<Insights />} />
        <Route path="/wellness"              element={<Wellness />} />
        <Route path="/transactions"          element={<Transactions />} />

        {/* Business */}
        <Route path="/business"              element={<BusinessDashboard />} />
        <Route path="/business/menu"         element={<BusinessMenu />} />
        <Route path="/business/stock"        element={<BusinessStock />} />
        <Route path="/business/transactions" element={<BusinessTransactions />} />

        <Route path="/alerts"                element={<Navigate to="/budgets" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App