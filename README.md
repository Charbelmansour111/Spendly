# Spendly — Personal Finance Tracker

> Track smarter, spend better.

Spendly is a full-stack personal finance web app with AI-powered insights, receipt scanning, budget alerts, and savings goals — installable as a PWA on any device.

---

## Features

- **Expense & Income Tracking** — Log transactions with categories, notes, and recurring support
- **Budget Goals** — Set monthly spending limits per category with real-time progress
- **Savings Goals** — Create goals, track progress, and add funds over time
- **AI Insights** — Chat with an AI advisor that has full context of your spending habits
- **Receipt Scanner** — Upload or photograph a receipt to auto-extract the amount (OCR)
- **Reports** — Export monthly PDF or CSV reports with charts and breakdowns
- **Financial Wellness Score** — Get a 0–100 health score based on your financial behavior
- **Multi-currency** — Supports USD, EUR, GBP, LBP, AED, SAR, CAD, AUD
- **Dark Mode** — Full dark theme support across all pages
- **PWA** — Installable on iOS, Android, and desktop — works offline

---

## Tech Stack

### Frontend
| Tech | Purpose |
|------|---------|
| React 19 + Vite | UI framework |
| React Router 7 | Client-side routing |
| Tailwind CSS 4 | Styling |
| Recharts | Charts & data visualization |
| jsPDF + jspdf-autotable | PDF report generation |
| Tesseract.js | Client-side OCR for receipt scanning |
| Axios | API requests with JWT auth |

### Backend
| Tech | Purpose |
|------|---------|
| Node.js + Express 5 | REST API server |
| PostgreSQL + pg | Database |
| JWT + bcryptjs | Authentication |
| Nodemailer + Resend | Transactional emails |
| Google Generative AI | AI insights (Gemini) |
| node-cron | Scheduled tasks (recurring transactions, alerts) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables (see below)

### Clone the repo

```bash
git clone https://github.com/your-username/spendly.git
cd spendly
```

### Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `/backend`:

```env
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
RESEND_API_KEY=your_resend_key
GEMINI_API_KEY=your_google_ai_key
```

Start the server:

```bash
npm run dev      # development (nodemon)
npm start        # production
```

### Frontend setup

```bash
cd frontend
npm install
npm run dev      # development server
npm run build    # production build
```

---

## Project Structure

```
spendly/
├── frontend/
│   ├── src/
│   │   ├── pages/          # 14 page components
│   │   ├── components/     # Layout, ReceiptScanner, Skeleton
│   │   ├── hooks/          # useDarkMode
│   │   └── utils/          # Axios API instance
│   └── vite.config.js
│
├── backend/
│   ├── routes/             # 12 route files
│   ├── middleware/         # Auth (JWT), error handler
│   ├── db.js               # PostgreSQL pool
│   └── server.js
│
└── railway.json            # Railway deployment config
```

---

## Deployment

- **Frontend** — Deployed on [Vercel](https://vercel.com) (`frontend/vercel.json` included)
- **Backend** — Deployed on [Railway](https://railway.app) (`railway.json` included)
- **Database** — PostgreSQL on Railway or any managed provider

---

## Roadmap

- [ ] Business account mode (restaurant & firm dashboards, payroll, stock management)
- [ ] Plaid / bank account sync
- [ ] Notification push (web push API)
- [ ] Mobile app (React Native)
- [ ] Shared household budgets

---

## License

MIT — free to use and modify.

---

Built by [Charbel Mansour](https://github.com/charbelmansour)
