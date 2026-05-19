# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

### Backend (`/backend`)
```bash
npm run dev      # nodemon watch (development)
npm start        # node server.js (production)
```

### Frontend (`/frontend`)
```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

No test suite exists. There is no monorepo root — run all commands from inside `backend/` or `frontend/`.

### Required backend environment variables
```
JWT_SECRET
DB_USER / DB_HOST / DB_NAME / DB_PASSWORD / DB_PORT   # local Postgres
DATABASE_URL                                           # OR single Render/Railway URL (takes precedence)
GROQ_API_KEY      # llama-3.3-70b-versatile via Groq
RESEND_API_KEY    # transactional email
NEWS_API_KEY      # optional — enables World & Financial News panel
```
The server calls `process.exit(1)` on startup if `JWT_SECRET`, `DB_*` vars, or `GROQ_API_KEY` are missing.

---

## Architecture

### Stack
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Recharts + React Router 7
- **Backend**: Express 5 + PostgreSQL (`pg` pool, no ORM) + JWT auth
- **AI**: Groq API (`llama-3.3-70b-versatile`) for all chat and insight generation
- **Deployment**: Frontend → Vercel, Backend → Render (`https://spendly-backend-et20.onrender.com`), DB → Railway/managed Postgres

> The app was originally named "Fina" — you'll see that name in `PAGE_TITLES`, the AI assistant's persona, and the `server.js` health check response.

---

### The Wallet System (central concept)

Every authenticated user can have multiple **wallets** (personal spending profiles). A wallet is selected at `/wallets` and unlocked with a PIN. **All finance data (expenses, income, budgets, savings, debts, subscriptions) is scoped to the active wallet** — not the user account.

**How routing works in `frontend/src/utils/api.js`**: The Axios instance intercepts every request and rewrites 6 URL prefixes automatically:

```js
const WALLET_REWRITES = ['/expenses', '/income', '/budgets', '/savings', '/debts', '/subscriptions']
// /expenses → /wallets/:walletId/expenses
```

This means page components call `API.get('/expenses')` and get wallet-scoped data with zero extra effort.

**WalletContext** (`frontend/src/context/WalletContext.jsx`) provides `{ wallets, activeWallet, activateWallet, deactivateWallet, refreshWallets }` to the whole app. The active wallet is persisted to `localStorage` under `spendly_wallet_remember` with a 30-day TTL.

**WalletGuard** (`frontend/src/components/WalletGuard.jsx`) wraps all finance pages in `App.jsx` — it redirects to `/wallets` if no active wallet is found.

One special wallet type is `is_total_wallet = true` — the "Family Overview" that aggregates all sibling wallets. It cannot be deleted by normal users.

---

### Database

No ORM. All queries use `pg` parameterized queries (`$1`, `$2`). The connection pool is exported from `backend/db.js` and imported as `pool` in every route file.

**Schema bootstrap**: `backend/db/migrate.js` runs `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements on every server start (called in `server.js` before `startScheduler()`). Add new tables/columns there.

**Key tables**:

| Table | Purpose |
|-------|---------|
| `users` | Account with `account_subtype` (personal/business) |
| `wallets` | Spending profiles, each with PIN, avatar, color |
| `wallet_expenses` / `wallet_income` / `wallet_budgets` / `wallet_savings` / `wallet_debts` / `wallet_subscriptions` | Wallet-scoped finance data |
| `expenses` / `income` / `budgets` / `savings_goals` / `debts` / `subscriptions` | Legacy user-scoped tables (still used by insights/AI routes) |
| `daily_insights` | `JSONB` cache of AI-generated insight per `(user_id, date)` — `UNIQUE` constraint enables upsert |
| `user_onboarding` | Life situation data from onboarding flow (used to personalise AI) |
| `custom_categories` | User-defined expense categories on top of the 13 defaults |
| `push_subscriptions` | Web Push API subscriptions for notifications |
| `user_activity` | `last_seen` date, updated by auth middleware on every request |
| `splits` + `split_participants` | Bill-splitting feature |
| `net_worth_items` / `net_worth_snapshots` | Net worth tracker |

---

### Authentication

`backend/middleware/auth.js` — reads `Authorization: Bearer <token>`, verifies JWT, sets `req.userId` and `req.user`. Also upserts `user_activity.last_seen` as a side effect.

Frontend stores JWT in `localStorage.token`. The Axios interceptor injects it on every request and redirects to `/login` on 401/403.

---

### AI Integration

All AI calls go through Groq (`llama-3.3-70b-versatile`) via raw `fetch`, not an SDK.

**`POST /api/insights/chat`** (`backend/routes/insights.js`) — the main AI chat endpoint. Handles:
- Normal chat (`mode: 'normal'` or `'sarcastic'`) — injects the user's live spending data, onboarding life context, and last 30 expenses into the system prompt
- `mode: 'budget_suggestions'` — returns structured JSON budget recommendations
- Parses `TXNS:[...]` markers from AI replies to auto-create expenses
- Parses `##ACTION:DELETE:ID##` / `##ACTION:UPDATE:ID:...##` markers to mutate expenses
- Supports English, formal Arabic, Lebanese dialect (Arabizi) — the system prompt includes a full Arabizi decoding table

**`GET /api/daily-insight`** (`backend/routes/dailyInsight.js`) — generates one daily card with type, headline, subtext, color theme, icon, and AI commentary. 12 insight types: `category_milestone`, `budget_countdown`, `spending_spike`, `weekend_warrior`, `monthly_wrap`, `payday_awareness`, `streak`, `savings_rate`, `top_category`, `biggest_purchase`, `monthly_pace`, `financial_guide`. Results cached per `(user_id, date)`. When `?force=true`, runners are shuffled randomly instead of run in priority order.

**`POST /api/insights/time-machine`** — generates a narrative story about the user's money in a different historical era (CPI-adjusted). Returns structured JSON with 6 slide lines.

**`POST /api/insights/monthly-wrap`** — Spotify-Wrapped-style 6-slide summary. Returns JSON array of strings.

**`POST /api/insights/quick-parse`** — parses natural language into a structured expense object.

---

### Frontend Architecture

**Routing** (`frontend/src/App.jsx`): All finance pages are wrapped in `<WalletGuard>`. Several old routes (`/savings`, `/debts`, `/insights`, `/business/*`) redirect to their current locations.

**Styling**: Tailwind CSS v4 — uses `bg-linear-to-*` syntax (NOT `bg-gradient-to-*`). No `tailwind.config.js`; configured via the `@tailwindcss/vite` plugin.

**Animation**: Uses `motion/react` (NOT `framer-motion` directly). Critical: `motion.div` elements add a CSS `transform` to the DOM which breaks `position: fixed` descendants — use `createPortal(..., document.body)` for any fixed overlays (modals, games) that appear inside animated containers.

**Charts**: Recharts (`LineChart`, `PieChart` with `Cell` for per-segment colors). The donut chart on Dashboard uses `CAT_PALETTE` — a 13-color array of solid mid-saturation hues.

**Key components**:
- `Layout.jsx` — main shell with bottom nav, dark mode toggle, notification bell, wallet avatar. Wraps all authenticated pages.
- `DailyInsightBoard.jsx` — gradient card component with shimmer skeleton, count-up animation, and `isActive` prop that triggers a force-refresh on every swipe into view.
- `BudgetSuggestionsSheet.jsx` — slide-up sheet for AI budget plan generation.
- `MoneyDefender.jsx` — mini-game (Space Invaders variant) rendered via `createPortal`.
- `TimeMachineModal.jsx` — historical money value explorer, also portaled.
- `VoiceAssistant.jsx` — voice input for expense logging, uses Web Speech API.
- `ReceiptScanner.jsx` — Tesseract.js OCR, client-side.
- `WalletGuard.jsx` — redirects to `/wallets` if no active wallet session.

**Hooks**:
- `useCategories()` — merges 13 default categories with user's custom ones from `/api/categories`
- `useDarkMode()` — persists to `localStorage`
- `useHideNav()` — hides the bottom nav when modals/forms are open
- `useWallet()` — must be used inside `<WalletProvider>`

**i18n** (`frontend/src/i18n/index.js`) — minimal helper used in `Layout.jsx`. Supports LTR/RTL detection.

---

### Scheduled Jobs (`backend/services/scheduler.js`)

Runs via `node-cron` on server start. Sends Web Push notifications for:
- 9 PM daily — expense reminder (all users)
- 11 PM daily — only users with no expenses logged today
- 1st of month 9 AM — monthly spending summary
- 10 AM daily — subscription renewals in 1–2 days
- 10:30 AM daily — debt due dates within 3 days
- 6 PM daily — inactivity nudge (3+ days since `user_activity.last_seen`)

---

### Adding a New Route

1. Create `backend/routes/myRoute.js` — export an Express router, use `authenticateToken` middleware, query via `pool`
2. Register in `backend/server.js`: `app.use('/api/my-route', require('./routes/myRoute'))`
3. If it needs a new table, add `CREATE TABLE IF NOT EXISTS` to `backend/db/migrate.js`
4. Call from frontend with `API.get('/my-route')` — JWT and wallet rewriting are handled automatically by the Axios interceptor
