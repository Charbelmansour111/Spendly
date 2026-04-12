import { useState } from 'react'
import { useDarkMode } from '../hooks/useDarkMode'

const Icons = {
  home: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={a?'currentColor':'none'} fillOpacity={a?0.15:0}/><path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  reports: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={a?'currentColor':'none'} fillOpacity={a?0.1:0}/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  ai: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.1:0}/><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  savings: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M19 7H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.1:0}/><path d="M16 3H8L5 7h14l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.2:0}/></svg>),
  profile: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.15:0}/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  budget: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={a?'currentColor':'none'} fillOpacity={a?0.15:0}/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>),
  wellness: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={a?'currentColor':'none'} fillOpacity={a?0.15:0}/></svg>),
  stock: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.1:0}/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  menu_icon: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 3h18v3H3zM3 10.5h18v3H3zM3 18h18v3H3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={a?'currentColor':'none'} fillOpacity={a?0.1:0}/></svg>),
  transactions: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 6l4-4 4 4M16 18l-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2v20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  bell: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  moon: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>),
  sun: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  logout: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  hamburger: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  close: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
}

const PERSONAL_NAV = [
  { label: 'Dashboard',       icon: 'home',         href: '/dashboard' },
  { label: 'Transactions',    icon: 'transactions', href: '/transactions' },
  { label: 'Budget & Alerts', icon: 'budget',       href: '/budgets' },
  { label: 'Savings Goals',   icon: 'savings',      href: '/savings' },
  { label: 'Reports',         icon: 'reports',      href: '/reports' },
  { label: 'AI Insights',     icon: 'ai',           href: '/insights' },
  { label: 'My Wellness',     icon: 'wellness',     href: '/wellness' },
  { label: 'Profile',         icon: 'profile',      href: '/profile' },
]

const PERSONAL_TABS = [
  { href: '/dashboard',    icon: 'home',         label: 'Home' },
  { href: '/transactions', icon: 'transactions', label: 'Transactions' },
  { href: '/insights',     icon: 'ai',           label: 'AI' },
  { href: '/savings',      icon: 'savings',      label: 'Savings' },
  { href: '/profile',      icon: 'profile',      label: 'Profile' },
]

const BUSINESS_NAV = [
  { label: 'Dashboard',           icon: 'home',         href: '/business' },
  { label: 'Transactions',        icon: 'transactions', href: '/business/transactions' },
  { label: 'Budget & Alerts',     icon: 'budget',       href: '/budgets' },
  { label: 'Reports',             icon: 'reports',      href: '/business/reports' },
  { label: 'AI Insights',         icon: 'ai',           href: '/insights' },
  { label: '─── Restaurant ───',  icon: null,           href: null, separator: true },
  { label: 'Menu Builder',        icon: 'menu_icon',    href: '/business/menu' },
  { label: 'Stock & Ingredients', icon: 'stock',        href: '/business/stock', badge: 'stock' },
  { label: '─────────────────',   icon: null,           href: null, separator: true },
  { label: 'Profile',             icon: 'profile',      href: '/profile' },
]

const BUSINESS_TABS = [
  { href: '/business',              icon: 'home',         label: 'Dashboard' },
  { href: '/business/transactions', icon: 'transactions', label: 'Transactions' },
  { href: '/insights',              icon: 'ai',           label: 'AI' },
  { href: '/business/stock',        icon: 'stock',        label: 'Stock', badge: 'stock' },
  { href: '/profile',               icon: 'profile',      label: 'Profile' },
]

export default function Layout({ children, onBellClick, unreadCount = 0 }) {
  const [dark, toggleDark] = useDarkMode()
  const [mobileOpen, setMobileOpen] = useState(false)
  const current = window.location.pathname
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isBusiness = user?.account_type === 'business'

  // Read pending stock items count
  const pendingStockCount = (() => {
    try { return JSON.parse(localStorage.getItem('pending_stock_items') || '[]').length } catch { return 0 }
  })()

  const accent      = isBusiness ? 'text-orange-500'  : 'text-indigo-600'
  const accentHover = isBusiness ? 'hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700/50'
  const activeClass = isBusiness ? 'bg-orange-500 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm'
  const tabActive   = isBusiness ? 'text-orange-500 dark:text-orange-400' : 'text-indigo-600 dark:text-indigo-400'
  const tabLine     = isBusiness ? 'bg-orange-500' : 'bg-indigo-600 dark:bg-indigo-400'

  const NAV_ITEMS = isBusiness ? BUSINESS_NAV : PERSONAL_NAV
  const TAB_ITEMS = isBusiness ? BUSINESS_TABS : PERSONAL_TABS

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }

  const getBadgeCount = (badgeKey) => {
    if (badgeKey === 'stock') return pendingStockCount
    return 0
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60">
        <h1 className={`text-2xl font-bold tracking-tight ${accent}`}>Spendly</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {isBusiness ? (user?.business_type === 'restaurant' ? 'Restaurant Mode' : 'Business Mode') : 'Track smarter, spend better'}
        </p>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isBusiness ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600'}`}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400 truncate">
              {isBusiness ? (user?.business_type === 'restaurant' ? '🍽️ Restaurant' : '🏪 Firm') : user?.email || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item, idx) => {
          if (item.separator) return (
            <div key={idx} className="px-4 py-1.5">
              <p className="text-xs text-gray-400 font-medium truncate">{item.label}</p>
            </div>
          )
          const isActive  = current === item.href
          const badgeCount = item.badge ? getBadgeCount(item.badge) : 0
          return (
            <a key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? activeClass : `text-gray-600 dark:text-gray-300 ${accentHover}`}`}>
              <span className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}>
                {Icons[item.icon]?.(isActive)}
              </span>
              <span className="truncate flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
              {isActive && badgeCount === 0 && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />}
            </a>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700/60 space-y-0.5">
        <button onClick={onBellClick}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
          <span className="relative text-gray-500 dark:text-gray-400">
            {Icons.bell()}
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </span>
          <span>Notifications</span>
          {unreadCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
        </button>
        <button onClick={toggleDark}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
          <span className="text-gray-500 dark:text-gray-400">{dark ? Icons.sun() : Icons.moon()}</span>
          <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        {isBusiness && (
          <a href="/dashboard"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
            <span className="text-gray-400">👤</span>
            <span>Personal Account</span>
          </a>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
          <span>{Icons.logout()}</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/60 flex-shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700/60 px-4 py-3 flex justify-between items-center">
        <h1 className={`text-xl font-bold tracking-tight ${accent}`}>Spendly</h1>
        <div className="flex items-center gap-2">
          <button onClick={onBellClick} className="relative p-2 text-gray-500 dark:text-gray-400">
            {Icons.bell()}
            {unreadCount > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <button onClick={toggleDark} className="p-2 text-gray-500 dark:text-gray-400">{dark ? Icons.sun() : Icons.moon()}</button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-600 dark:text-gray-300">{mobileOpen ? Icons.close() : Icons.hamburger()}</button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-700/60">
        <div className="flex items-stretch h-16">
          {TAB_ITEMS.map(item => {
            const isActive   = current === item.href
            const badgeCount = item.badge ? getBadgeCount(item.badge) : 0
            return (
              <a key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 relative ${isActive ? tabActive : 'text-gray-400 dark:text-gray-500'}`}>
                {isActive && <span className={`absolute top-0 w-6 h-0.5 rounded-full ${tabLine}`} />}
                <span className={`relative transition-transform duration-150 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {Icons[item.icon]?.(isActive)}
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}