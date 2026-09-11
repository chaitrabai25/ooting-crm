# Ooting CRM — Full-Stack Travel Business Management System

> **Journeys Beyond Ordinary**  
> A complete, production-ready Customer Relationship Management (CRM) and ERP system built specifically for **Ooting** travel agency.

---

## 🌟 Key Capabilities

1. **Lead & Pipeline Management**:
   - Multi-stage pipeline: `NEW`, `CONTACTED`, `QUALIFIED`, `QUOTATION_SENT`, `FOLLOW_UP`, `WON`, `LOST`, `CANCELLED`.
   - 1-Click Lead-to-Booking conversion preserving customer history, travel dates, passenger counts, and assigned agents.
   - Stage history audit trails.

2. **Smart Follow-ups & Reminders**:
   - Today's, overdue, and upcoming follow-ups with instant status updates (`COMPLETED`, `RESCHEDULED`).
   - Omnichannel reminders (Call, WhatsApp, Email, In-person meeting).

3. **Customer 360° Profiles**:
   - Centralized customer directory with lifetime bookings, total spend, pending dues, and communication records.
   - CSV bulk customer import with phone duplicate protection.

4. **Dynamic Travel Packages & Day-by-Day Itineraries**:
   - Pre-seeded with authentic signature packages (Mysore & Coorg, Ooty Nilgiris, Andaman Islands, Ayodhya & Kashi Spiritual).
   - Interactive day-by-day itinerary builder with activities, sightseeing spots, and timing details.

5. **Branded Quotation Builder & PDF Print**:
   - Automatically calculates base rates, customizable discounts, GST/taxes, and final amounts.
   - High-fidelity branded quotation view incorporating Ooting's official header and footer wave letterheads and crimson theme (`#C91F28`).
   - Built-in browser print-to-PDF formatting.

6. **Bookings & Strict Financial Integrity**:
   - Real-time balance calculations: `Balance Due = Final Amount - SUM(Successful Payments)`.
   - Overpayment protection and automatic booking status progression (`HOLD`, `CONFIRMED`, `COMPLETED`).
   - Integrated expense ledger per booking to monitor gross margins and actual profitability.

7. **B2B Travel Agent Network**:
   - Partner agency registry, commission rate tracking, total turnover, and pending commission payouts.

8. **Zero-Fake Analytics & P&L Intelligence**:
   - Strictly derived from database records — empty database displays clean ₹0 / 0 state.
   - Monthly revenue trajectory, cash collection vs. pending receivables, top destinations, and sales staff leaderboards.
   - Comprehensive CSV exports for Bookings, Leads, and Payments registers.

9. **Security, RBAC & Audit Trails**:
   - JWT authentication with secure password hashing (`bcryptjs`).
   - Role-Based Access Control: `SUPER_ADMIN`, `ADMIN`, `SALES`, `OPERATIONS`, `ACCOUNTANT`, `AGENT`.
   - Immutable audit logging tracking all administrative changes, payments, and stage transitions.

---

## 🏗️ Architecture & Technology Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Zod, Multer, Bcrypt, JsonWebToken.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Axios.
- **Database**:
  - **Local Development**: SQLite (`file:./ooting.db`) via Prisma for friction-free out-of-the-box local execution in VS Code without needing external database services or Docker.
  - **Production Deployment**: Parallel `schema.postgresql.prisma` ready for cloud databases (Supabase, Neon, AWS RDS, PostgreSQL).
- **Branding**: Authentic Ooting crimson color palette (`#C91F28`) with official company logo and header/footer wave graphics extracted from official templates.

---

## 🚀 Quickstart Guide (Local Execution in VS Code)

### 1. Prerequisites
- Node.js (v18 or v20+ recommended)
- npm or pnpm

### 2. Setup Server (Backend)

Open a terminal in the root folder:
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```
The backend API server will start on **http://localhost:5000**.
The database will be automatically created (`ooting.db`) and populated with default administrator credentials, sample travel packages, and company settings.

### 3. Setup Client (Frontend)

Open a second terminal:
```bash
cd client
npm install
npm run dev
```
The frontend application will start on **http://localhost:5173** (or the port displayed in your terminal).

---

## 🔐 Default Credentials

The seed script initializes the following staff accounts for immediate testing:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@ooting.com` | `Admin@12345` | Full System Access (Users, Settings, Audits, Financials) |
| **Sales Consultant** | `sales@ooting.com` | `Admin@12345` | Leads, Follow-ups, Quotations, Bookings |
| **Operations Manager** | `ops@ooting.com` | `Admin@12345` | Bookings, Itineraries, Expenses |
| **Accountant** | `accounts@ooting.com` | `Admin@12345` | Payments, Expenses, Financial Reports |

> **Note**: A quick-login helper is embedded directly on the login screen to sign in with one click during development and evaluation.

---

## 📂 Project Structure

```
RM/
├── package.json               # Root workspace configuration
├── README.md                  # System documentation & setup guide
├── server/                    # Backend API (Express + TypeScript + Prisma)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                   # Server environment variables
│   ├── prisma/
│   │   ├── schema.prisma      # SQLite Prisma schema (local development)
│   │   ├── schema.postgresql.prisma # PostgreSQL schema (production)
│   │   └── seed.ts            # Seed script (Admin user, packages, settings)
│   └── src/
│       ├── config/            # Environment & company configuration
│       ├── db/                # Prisma client singleton
│       ├── middleware/        # Auth (JWT/RBAC), Audit, Error, Upload handlers
│       ├── routes/            # REST API route controllers
│       ├── app.ts             # Express application setup
│       └── index.ts           # Server entry point
└── client/                    # Frontend SPA (React + Vite + Tailwind)
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js     # Ooting brand theme configuration
    ├── public/assets/         # Official logo, header wave, footer wave
    └── src/
        ├── api/               # Axios client with JWT interceptors
        ├── components/        # Layout, Navbar, Sidebar, UI widgets, Modals
        ├── context/           # AuthContext (persistent JWT session)
        ├── pages/             # Dashboard, Leads, Quotations, Bookings, etc.
        ├── types/             # Strict TypeScript interfaces
        ├── App.tsx            # Application routing
        └── main.tsx           # React entry point
```

---

## 🧪 Testing & Verification

- **Backend Health Check**: `http://localhost:5000/health`
- **Global Search API**: `http://localhost:5000/api/search?q=Mysore`
- **Zero-Data Analytics Rule**: Verify that an empty database returns `0` / `₹0` without fabricated metrics.
- **Quotation Print View**: Open any quotation and click **"Print / Export PDF"** to view the pixel-accurate letterhead layout with header and footer waves.
