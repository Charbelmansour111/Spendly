# Spendly — Full App Context Document
> Written for any AI assistant continuing development on this project.
> Last updated: April 2026

---

## 1. What Is Spendly?

Spendly is a **personal finance web app** (PWA) built by Charbel Mansour. It lets users track expenses and income, set spending budgets, manage savings goals and debts, track subscriptions, get AI-powered financial advice, and monitor their financial wellness score. The app has a sarcastic/witty AI advisor personality and supports voice input in 12+ languages.

---

## 2. Tech Stack

### Frontend
| Tool | Version | Purpose |
|------|---------|---------|
| React | 19 | UI framework |
| Vite | 7 | Build tool |
| Tailwind CSS | v4 | Styling (use canonical classes like `w-150`, NOT `w-[600px]`) |
| React Router | 7 | Client-side routing |
| Recharts | 3 | Charts (bar, pie, line) |
| Axios | 1 | HTTP client (via `src/utils/api.js`) |
| jsPDF + autotable | 4/5 | PDF export in Reports |
| Tesseract.js | 7 | OCR for receipt scanning |

### Backend
| Tool | Version | Purpose |
|------|---------|---------|
| Node.js + Express | 5 | REST API server |
| PostgreSQL (via `pg`) | 8 | Database |
| JWT (`jsonwebtoken`) | 9 | Auth tokens |
| bcryptjs | 3 | Password hashing |
| Nodemailer + Resend | 8/6 | Email (verify, forgot password) |
| Groq API (llama-3.3-70b) | — | AI chat, expense parsing, report summaries |
| node-cron | 4 | Scheduled notifications |

### Deployment
- **Frontend**: Vercel (auto-deploys from `main` branch)
- **Backend**: Railway (`railway.json` present)
- **Database**: PostgreSQL on Railway

---

## 3. Project Structure

```
spendly/
├── frontend/
│   └── src/
│       ├── pages/          # One file per route
│       ├── components/     # Shared UI components
│       ├── hooks/          # useDarkMode
│       ├── i18n/           # Translations (index.js)
│       └── utils/
│           └── api.js      # Axios instance with baseURL + auth header
├── backend/
│   ├── server.js           # Express app, mounts all routes at /api/*
│   ├── db.js               # pg Pool connection
│   ├── db/migrate.js       # Runs CREATE TABLE IF NOT EXISTS on startup
│   ├── middleware/auth.js  # JWT authenticateToken middleware
│   └── routes/             # One file per feature
└── railway.json
```

---

## 4. Database Schema

Tables auto-created on startup via `db/migrate.js`. Core tables:

```sql
users            (id, name, email, password_hash, currency, account_type, verified, ...)
expenses         (id, user_id, amount, category, description, date, is_recurring, expense_scope, linked_date)
income           (id, user_id, amount, source, description, date, created_at)
budgets          (id, user_id, category, amount, period, name)
savings_goals    (id, user_id, name, target_amount, current_amount, deadline, goal_type)
debts            (id, user_id, name, total_amount, remaining_amount, monthly_payment, interest_rate, category, due_date)
subscriptions    (id, user_id, name, amount, billing_cycle, next_billing_date, category)
notifications    (id, user_id, message, type, read, created_at)
wellness_logs    (id, user_id, score, mood, created_at)
```

**Expense categories**: Food, Transport, Shopping, Subscriptions, Entertainment, Other  
**Income sources**: Salary, Freelance, Business, Investment, Other  
**Billing cycles** (subscriptions): monthly, yearly, weekly

---

## 5. API Routes

All routes prefixed with `/api/`. All protected routes require `Authorization: Bearer <token>` header.

| Route | Auth | Description |
|-------|------|-------------|
| POST `/auth/register` | No | Register, sends verification email |
| POST `/auth/login` | No | Login, returns JWT |
| POST `/auth/verify-email` | No | Verify email token |
| POST `/auth/forgot-password` | No | Send reset email |
| GET/POST/PUT/DELETE `/expenses` | Yes | CRUD expenses |
| POST `/expenses/apply-recurring` | Yes | Copy last month's recurring expenses to current month |
| POST `/expenses/parse-natural` | Yes | AI parses natural language into expense objects (Groq) |
| GET `/expenses/trends` | Yes | 6-month spending trend data |
| GET/POST/PUT/DELETE `/income` | Yes | CRUD income |
| GET/POST/PUT/DELETE `/budgets` | Yes | CRUD budgets |
| GET/POST/PUT/DELETE `/savings` | Yes | CRUD savings goals |
| GET/POST/PUT/DELETE `/debts` | Yes | CRUD debts |
| GET/POST/PUT/DELETE `/subscriptions` | Yes | CRUD subscriptions (dedicated table) |
| POST `/insights/chat` | Yes | AI chat — passes user's financial data as context, `mode: 'sarcastic'` or `'friendly'` |
| GET `/wellness` | Yes | Calculate wellness score + habits |
| GET `/news` | Yes | Financial news (external API) |
| GET `/notifications` | Yes | User notifications |
| PUT `/notifications/read` | Yes | Mark notifications read |
| GET/PUT `/profile` | Yes | Get/update profile |
| PUT `/profile/password` | Yes | Change password |
| DELETE `/profile` | Yes | Delete account |
| POST `/receipts/scan` | Yes | OCR receipt scanning |
| POST `/support/ticket` | Yes | **Not yet implemented in backend** — frontend falls back to mailto: |

---

## 6. Frontend Pages

### `/` — Landing
- Hero with floating mock app preview cards
- "How it works" 3-step section  
- Platform install buttons: iOS (Safari Add to Home Screen instructions) and Android (Chrome install prompt)
- Native `beforeinstallprompt` PWA install button

### `/login` `/register` `/verify-email` `/forgot-password` `/account-type`
- Standard auth flow. After login → `/dashboard`. After account type → `/dashboard`.
- `account_type` stored but business mode is currently disabled (all routes redirect to personal).

### `/dashboard`
The most feature-rich page. Key elements:
- **Carousel** (3 panels, swipeable): Overview stats, News feed, Tips
- **Spending Forecast card**: `projected = (totalSpent / dayOfMonth) * daysInMonth`, shows progress bar and surplus/deficit vs income. Only shows when `isCurrentMonth && totalSpent > 0`
- **Upcoming Bills card**: reads `spendly_bills` from localStorage, shows bills due within 7 days
- **Budget Alerts**: warns when any budget is ≥80% spent
- **Recent Transactions**: last 5 entries
- **Add Expense sheet** (`AddExpenseSheet`): slides up from bottom, category picker, amount, description, date, recurring toggle
- **Smart Log / Quick Log** (`QuickLogSheet`): voice-first expense entry. User speaks naturally ("spent $20 on food"), AI parses it via `/expenses/parse-natural`, creates expense. Purple mic button.
- **Onboarding trigger**: shows `Onboarding` component when `spendly_onboarded_{userId}` is NOT in localStorage

**Key state**:
```js
const [showAddExp, setShowAddExp]     // AddExpenseSheet
const [showQuickLog, setShowQuickLog] // Smart Log / voice
const [showOnboarding, setShowOnboarding] // first-time tour
```

### `/transactions`
- **View-only for adding** — expenses and income are added from Dashboard, NOT this page
- Shows full history with tabs: Expenses / Income / All
- Filter by date range + category
- Edit any entry inline
- Toggle `is_recurring` on any expense (makes it appear in recurring section)
- Export to CSV
- Recurring section shows items that repeat monthly

### `/budgets`
Two-tab page:
- **Spending Budgets tab**: Create budgets per category with monthly limit. Progress bars. AI advisor button when near limit. Color-coded: green (<70%), amber (70–99%), red (≥100%).
- **Bills tab**: Fixed monthly payments (rent, utilities, etc.) stored in `localStorage` key `spendly_bills`. Each bill has emoji, name, amount, due day (1–28). Shows days until due with color-coded borders. `spendly_paid_bills_YYYY-MM` tracks which are paid this month. **Dashboard reads this same localStorage key** to show upcoming bills.

Bill localStorage structure:
```js
// spendly_bills
[{ id: 'uuid', emoji: '🏠', name: 'Rent', amount: 1200, dueDay: 1 }]

// spendly_paid_bills_2026-04
['bill-id-1', 'bill-id-2']
```

### `/goals`
Two-tab page:
- **Savings Goals**: Create goal with name, target amount, current amount, deadline, category. Progress bar. "Add funds" to increment. AI tips button at mid-progress.
- **Debt Tracker**: Create debt with total, remaining, monthly payment, interest rate, due date. Shows payoff timeline and months remaining.

### `/subscriptions`
- Uses dedicated `/subscriptions` backend table (NOT `is_recurring` expenses)
- Fields: name, amount, billing_cycle (monthly/yearly/weekly), next_billing_date, category
- Monthly cost normalization: yearly ÷ 12, weekly × 4.33
- **Renewal countdown badges**: "Renews in 3d", "Renews today", "Overdue Xd"
- Summary strip: monthly total, yearly total, % of income
- Warning card when subscriptions > 15% of monthly income
- Category breakdown horizontal bar chart
- **AI Subscription Audit**: POSTs to `/insights/chat` with full subscription list, gets honest recommendations
- Expandable delete confirmation per item
- Potential savings tip: shows savings from cutting 2 cheapest subscriptions
- Empty state guides user to add subscriptions (+ Add button opens inline form)

### `/reports`
- Month selector (navigates past months)
- **Analytics tab**: AI Report Summary (first), Daily Spending chart, Category Pie chart, Category table, Income breakdown
- **Transactions tab**: Full filterable list for the month + export (PDF/CSV)
- AI summary calls `/insights/chat` with monthly data

### `/insights`
- Chat interface with AI advisor
- System context includes: user's last 50 expenses, 20 income entries, budgets
- Two modes: `sarcastic` (default, roasts spending) and `friendly`
- Quick-question pills: "Where am I overspending?", "How can I save more?", etc.
- TTS toggle (reads AI responses aloud using Web Speech API)
- **Mic button** (between text input and Send): uses SpeechRecognition, auto-sends on result. Uses `spendly_lang_mic` preference.
- Tappable stat cards at top (spent, income, top category) — tap to see full value in modal

### `/wellness`
- Financial health score 0–100 calculated from: income tracked, under all budgets, positive balance, savings progress, 10+ transactions logged
- Grade display (A+ to F)
- Achievements system
- Mood tracker
- Mini-games section (MoneyDefender game component)
- "Calculate My Score" button

### `/profile`
Five tabs:
1. **Profile**: Name, email, currency. Save calls `PUT /api/profile`.
2. **Preferences**: Income frequency, savings target % (slider), app language, mic language. Saved to localStorage (`spendly_prefs`, `spendly_lang_app`, `spendly_lang_mic`). Reload on save.
3. **Security**: Change password with strength indicator. Calls `PUT /api/profile/password`.
4. **Account**: Plan info, **Replay Tutorial** button (clears `spendly_onboarded_{userId}` → redirects to `/dashboard` to restart tour), Sign Out, Delete Account (type DELETE to confirm).
5. **Support**: Subject dropdown + message textarea. POSTs to `/support/ticket` (not yet implemented in backend). Falls back to `mailto:charbel.mansourb@gmail.com` on error. Success state shown after send.

Profile photo: stored as base64 in `localStorage` key `spendly_profile_photo` (max 2MB).

### `/subscriptions`
(see above)

---

## 7. Key Components

### `Layout.jsx`
Wraps every authenticated page. Contains:
- Desktop sidebar (nav links, user info, dark mode toggle, logout)
- Mobile top bar (logo, bell, dark toggle, hamburger)
- Mobile drawer (slides from right)
- Mobile bottom tab bar: Home / Transactions / AI (double-tap = VoiceAssistant) / Goals / Profile
- Renders `<TourBanner />` always (it self-hides when no tour is active or on auth pages)
- Renders `<VoiceAssistant />` when triggered by double-tap on AI tab

### `TourBanner.jsx` ← Core onboarding system
Single component managing the entire tutorial flow via localStorage key `spendly_active_tour`.

State format: `{ step: number, voice: boolean }`
- `step === -1`: renders animated **welcome modal** (full overlay)
- `step 0–5`: renders **floating banner** at bottom of screen

Flow:
1. `Onboarding.jsx` calls `startTour(voice)` → sets `{ step: -1, voice }` in localStorage → dispatches `spendly_tour_update` event
2. `TourBanner` picks it up, shows welcome modal
3. User clicks "Start Tour" → step becomes 0, navigates to `/dashboard`
4. Each "Next →" advances step and navigates to next page
5. "Skip" or final step → `clearTour()` removes localStorage key

**6 tour steps** (pages visited in order):
1. `/dashboard` — Dashboard overview
2. `/transactions` — Transaction history (note: adding expenses is done from Dashboard, not here)
3. `/budgets` — Set spending budgets
4. `/goals` — Savings goals & debt tracker
5. `/subscriptions` — Recurring payment tracking
6. `/insights` — AI chat advisor

Voice: Uses Web Speech API SpeechSynthesis. Female voice priority order: Samantha (macOS/iOS) → Karen (macOS) → Moira → Google UK English Female → Microsoft Zira → Microsoft Aria → any female en voice → en-GB → en-US. Rate: 1.12, Pitch: 1.15.

Exports: `getTour()`, `setTour()`, `startTour()`, `clearTour()`, `TOUR_KEY`, `TOUR_STEPS`

### `Onboarding.jsx`
Thin trigger only — no UI rendered. On mount: calls `startTour(true)`, dispatches event, calls `onDone()`. Returns `null`.

Triggered from `Dashboard.jsx`:
```js
const [showOnboarding] = useState(() => {
  const uid = JSON.parse(localStorage.getItem('user') || '{}').id || 'guest'
  return !localStorage.getItem(`spendly_onboarded_${uid}`)
})
// onDone sets: localStorage.setItem(`spendly_onboarded_${uid}`, '1')
```

### `VoiceAssistant.jsx`
Full-screen voice chat interface. Opened by double-tapping the AI tab in mobile bottom nav.
- SpeechRecognition for input
- Parses intent (add_expense, set_budget, add_goal, navigate, general_question, etc.)
- Executes actions via API or navigates
- Speaks responses using SpeechSynthesis
- Uses `spendly_lang_mic` for recognition, `spendly_lang_app` for responses

### `ReceiptScanner.jsx`
- Uses Tesseract.js for OCR
- Extracts amount, merchant, date from photo
- Pre-fills add expense form

### `MoneyDefender.jsx`
Mini-game in Wellness page. Teaches budgeting through gameplay.

---

## 8. i18n / Internationalization

`src/i18n/index.js` — translations object with `en` and `ar` locales.

```js
import { t, isRTL } from '../i18n'
t('nav_dashboard') // → 'Dashboard'
isRTL()            // → true if current lang is Arabic
```

Language set in Profile → Preferences, saved to `localStorage`:
- `spendly_lang_app` — UI language + AI response language
- `spendly_lang_mic` — SpeechRecognition language (what you speak)

These can be set independently (e.g. speak Arabic, get English response).

Supported languages include: English (US/UK), Arabic (12 dialects), Spanish (ES/MX), French, German, Italian, Portuguese, Dutch, Polish, Russian, Turkish, Afrikaans.

---

## 9. localStorage Keys Reference

| Key | Type | Purpose |
|-----|------|---------|
| `token` | string | JWT auth token |
| `user` | JSON | User object `{ id, name, email, currency }` |
| `currency` | string | Active currency code (e.g. 'USD') |
| `spendly_prefs` | JSON | `{ incomeFreq, savingsTarget }` |
| `spendly_lang_app` | string | App/AI response language code |
| `spendly_lang_mic` | string | Mic/speech recognition language code |
| `spendly_profile_photo` | string | Base64 profile photo (max 2MB) |
| `spendly_onboarded_{userId}` | string | `'1'` when user has seen/skipped tour |
| `spendly_active_tour` | JSON | `{ step, voice }` — active tour state |
| `spendly_tour_voice` | string | `'on'` or `'off'` — voice preference |
| `spendly_insights_tts` | string | `'true'`/`'false'` — AI Insights TTS toggle |
| `spendly_bills` | JSON | Array of bill objects for Bills tab in Budgets |
| `spendly_paid_bills_YYYY-MM` | JSON | Array of paid bill IDs for current month |

---

## 10. AI System

All AI calls go through `/api/insights/chat`. The backend:
1. Fetches user's last 50 expenses, 20 income entries, and all budgets from DB
2. Builds a system prompt with this financial context
3. Sends to Groq API (llama-3.3-70b-versatile, max_tokens: 300)
4. Returns `{ reply: string }`

Two modes:
- `mode: 'sarcastic'` — roasts spending, witty/savage, still actionable
- `mode: 'friendly'` — supportive, practical advice

AI is used in:
- **AI Insights** chat page (main interface)
- **Reports** page (monthly summary generation)
- **Budgets** page ("Ask AI" near limit)
- **Goals** page (mid-progress tips)
- **Subscriptions** page (audit which to cut)
- **Onboarding tour** (voice narration via Web Speech API, not Groq)
- **Voice Assistant** (intent parsing + responses via Groq)
- **Natural language expense parsing** (`/expenses/parse-natural`) — parses "spent $20 on coffee" into structured expense object

---

## 11. Dark Mode

Custom hook `src/hooks/useDarkMode.js`. Toggles `dark` class on `<html>`. All Tailwind dark: variants work. Toggle in sidebar (desktop) and top bar (mobile). Persisted in localStorage.

---

## 12. Known Issues / TODOs

1. **`/support/ticket` backend endpoint not implemented** — Profile Support tab falls back to `mailto:charbel.mansourb@gmail.com` when API call fails.
2. **Business mode disabled** — All business routes redirect to `/dashboard`. BusinessDashboard, BusinessMenu, BusinessReports, BusinessStock, BusinessTransactions pages exist but are not accessible.
3. **Chunk size warning** during build — some chunks exceed 500kB. Non-blocking but worth addressing with code splitting eventually.
4. **Bills tab**: Bills are stored only in localStorage (not synced to backend/DB). If user clears browser data, bills are lost.

---

## 13. Developer Info

- **Developer**: Charbel Mansour
- **GitHub**: `Charbelmansour111/Spendly`
- **Branch**: `main` (direct commits, no PRs)
- **Contact email**: `charbel.mansourb@gmail.com`
- **AI used for development**: Claude Sonnet 4.6 (via Claude Code)

---

## 14. Recent Changes (April 2026 session)

In roughly chronological order:

1. Moved AI Report Summary before Daily Spending chart in Reports
2. Full onboarding tutorial overhaul with Web Speech API voice narration
3. Landing page redesign: floating mock cards hero, "How it works" steps, iOS/Android install modals
4. New **Subscriptions page** (`/subscriptions`): uses dedicated subscriptions table, renewal countdowns, billing cycle normalization, AI audit, category breakdown, income % warning
5. **Bills tab** in Budgets: localStorage-based fixed payment tracker with due-date countdowns, connected to Dashboard upcoming bills card
6. **Spending Forecast card** on Dashboard
7. **Profile photo upload** (base64 in localStorage)
8. **Profile page redesign**: tabs for Profile/Preferences/Security/Account/Support
9. **Support tab** in Profile: contact form with mailto fallback
10. **Replay Tutorial** button in Profile → Account tab
11. **Mic button** in AI Insights chat input
12. **Onboarding system rebuild**: `TourBanner.jsx` handles entire tour in one component — welcome modal (step -1) + floating navigation banner (steps 0–5), auto-navigates between pages, female voice (Samantha/Zira/Google UK Female), rate 1.12 pitch 1.15
13. Tour welcome screen: animated slide-up card, waving emoji, shimmer title, floating badge decorations, auto-speaks greeting
14. Fixed: onboarding flag scoped per user ID (`spendly_onboarded_{userId}`) so new accounts always see tour
15. Fixed: Transactions tour step corrected — expenses added from Dashboard, not Transactions page
16. Fixed: build error in Subscriptions.jsx (JSX syntax in template literal)
