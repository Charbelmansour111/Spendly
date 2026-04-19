import { useState, useRef } from 'react'
import { useDarkMode } from '../hooks/useDarkMode'
import VoiceAssistant from './VoiceAssistant'
import TourBanner from './TourBanner'
import { t, isRTL } from '../i18n'

const Icons = {
  home: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={a?'currentColor':'none'} fillOpacity={a?0.15:0}/><path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  reports: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={a?'currentColor':'none'} fillOpacity={a?0.1:0}/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  ai: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.1:0}/><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  savings: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M19 7H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.1:0}/><path d="M16 3H8L5 7h14l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.2:0}/></svg>),
  profile: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.15:0}/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  budget: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={a?'currentColor':'none'} fillOpacity={a?0.15:0}/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>),
  wellness: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={a?'currentColor':'none'} fillOpacity={a?0.15:0}/></svg>),
  transactions: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 6l4-4 4 4M16 18l-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2v20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  bell: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  moon: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>),
  sun: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  debt: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.1:0}/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 12v4M10 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  subs: (a) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.8" fill={a?'currentColor':'none'} fillOpacity={a?0.1:0}/><path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  logout: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  hamburger: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  close: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
}

const NAV_ITEMS = [
  { key: 'nav_dashboard',       icon: 'home',         href: '/dashboard' },
  { key: 'nav_transactions',    icon: 'transactions', href: '/transactions' },
  { key: 'nav_budgets',         icon: 'budget',       href: '/budgets' },
  { key: 'nav_goals',           icon: 'savings',      href: '/goals' },
  { key: 'nav_subscriptions',   icon: 'subs',         href: '/subscriptions' },
  { key: 'nav_reports',         icon: 'reports',      href: '/reports' },
  { key: 'nav_ai',              icon: 'ai',           href: '/insights' },
  { key: 'nav_wellness',        icon: 'wellness',     href: '/wellness' },
  { key: 'nav_profile',         icon: 'profile',      href: '/profile' },
]

const TAB_ITEMS = [
  { href: '/dashboard',    icon: 'home',         key: 'tab_home' },
  { href: '/transactions', icon: 'transactions', key: 'nav_transactions' },
  { href: '/insights',     icon: 'ai',           key: 'tab_ai' },
  { href: '/goals',        icon: 'savings',      key: 'tab_goals' },
  { href: '/profile',      icon: 'profile',      key: 'nav_profile' },
]

// Business navigation — disabled until business mode is re-enabled
// const BUSINESS_NAV = [...]
// const BUSINESS_TABS = [...]

const ADVISOR_NAV = [
  { key: 'Advisor Dashboard', icon: 'home',    href: '/advisor/dashboard' },
  { key: 'Find Advisors',     icon: 'profile', href: '/advisors' },
  { key: 'Profile',           icon: 'profile', href: '/profile' },
]

function SidebarContent({ user, current, dark, toggleDark, onBellClick, unreadCount, onLogout, navItems }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Spendly</h1>
        </div>
        <p className="text-xs text-gray-400 mt-1 ml-9">Track smarter, spend better</p>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold text-sm shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = current === item.href
          return (
            <a key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-violet-700 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
              }`}>
              <span className={isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}>
                {Icons[item.icon]?.(isActive)}
              </span>
              <span className="truncate flex-1">{t(item.key)}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
            </a>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700/60 space-y-0.5">
        <button onClick={onBellClick}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
          <span className="relative text-gray-400 dark:text-gray-500">
            {Icons.bell()}
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </span>
          <span>{t('nav_notifications')}</span>
          {unreadCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
        </button>
        <button onClick={toggleDark}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
          <span className="text-gray-400 dark:text-gray-500">{dark ? Icons.sun() : Icons.moon()}</span>
          <span>{dark ? t('nav_light') : t('nav_dark')}</span>
        </button>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
          <span>{Icons.logout()}</span>
          <span>{t('nav_logout')}</span>
        </button>
      </div>
    </div>
  )
}

export default function Layout({ children, onBellClick, unreadCount = 0 }) {
  const [dark, toggleDark] = useDarkMode()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const lastAiTapRef = useRef(0)
  const aiTapTimerRef = useRef(null)
  const current = window.location.pathname
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleAiTabClick = () => {
    const now = Date.now()
    if (now - lastAiTapRef.current < 350) {
      clearTimeout(aiTapTimerRef.current)
      lastAiTapRef.current = 0
      setShowVoice(true)
    } else {
      lastAiTapRef.current = now
      clearTimeout(aiTapTimerRef.current)
      aiTapTimerRef.current = setTimeout(() => { window.location.href = '/insights' }, 350)
    }
  }

  // Business mode disabled — always use personal nav
  // const isBusiness = user?.account_type === 'business'
  const isAdvisor = user?.account_subtype === 'advisor_approved'
  const activeNavItems = isAdvisor ? ADVISOR_NAV : NAV_ITEMS

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }

  const sidebarProps = { user, current, dark, toggleDark, onBellClick, unreadCount, onLogout: handleLogout, navItems: activeNavItems }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden" dir={isRTL() ? 'rtl' : 'ltr'}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/60 shrink-0 h-screen sticky top-0">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700/60 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Spendly</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onBellClick} className="relative p-2 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            {Icons.bell()}
            {unreadCount > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <button onClick={toggleDark} className="p-2 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">{dark ? Icons.sun() : Icons.moon()}</button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">{mobileOpen ? Icons.close() : Icons.hamburger()}</button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 shadow-2xl">
            <SidebarContent {...sidebarProps} />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-700/60">
        <div className="flex items-stretch h-16">
          {TAB_ITEMS.map(item => {
            const isActive = current === item.href
            if (item.icon === 'ai') {
              return (
                <button key={item.href} onClick={handleAiTabClick}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 relative ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {isActive && <span className="absolute top-0 w-6 h-0.5 rounded-full bg-violet-600 dark:bg-violet-400" />}
                  <span className={`transition-transform duration-150 ${isActive ? 'scale-110' : 'scale-100'}`}>
                    {Icons[item.icon]?.(isActive)}
                  </span>
                  <span className="text-[10px] font-medium">{t(item.key)}</span>
                </button>
              )
            }
            return (
              <a key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 relative ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {isActive && <span className="absolute top-0 w-6 h-0.5 rounded-full bg-violet-600 dark:bg-violet-400" />}
                <span className={`transition-transform duration-150 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {Icons[item.icon]?.(isActive)}
                </span>
                <span className="text-[10px] font-medium">{t(item.key)}</span>
              </a>
            )
          })}
        </div>
      </nav>

      {showVoice && <VoiceAssistant onClose={() => setShowVoice(false)} />}
      <TourBanner />
    </div>
  )
}
