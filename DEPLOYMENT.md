# Ooting CRM — Full-Stack Production Deployment & Operations Guide

This guide covers deploying the **Ooting CRM & Travel Management System** to production with long-term data persistence, automated backups, zero fake data, and a smooth CI/CD pipeline via GitHub.

---

## 1. System Architecture Overview

* **Frontend**: React 18 SPA (Vite + Tailwind CSS + Lucide Icons + Recharts).
* **Backend**: Node.js & Express API with TypeScript (`server/dist`).
* **Serving Model**: Unified Production Server — the Express server serves both the REST API (`/api/*`), static uploaded assets (`/uploads/*`), and the compiled frontend application (`client/dist`) on a single domain.
* **Database**: Managed Cloud PostgreSQL (ACID-compliant, automated backups, high availability).
* **Media Storage**: Persistent volume mount for `server/uploads/` (packages, day-wise itineraries, company assets).

---

## 2. GitHub Setup & Push

### Local Repository Status
Your repository has been initialized with clean branch `main`.

1. **Verify your Git status**:
   ```bash
   git status
   ```
   *Secrets (`.env`), database files (`*.db`), and node_modules are strictly excluded.*

2. **Connect to your GitHub repository**:
   Create a new empty repository at [https://github.com/new](https://github.com/new):
   * Repository name: `ooting-crm`
   * Visibility: **Private** (recommended for commercial CRM) or **Public**
   * Do **not** initialize with README or .gitignore (they already exist locally).

3. **Add remote and push**:
   ```bash
   git remote add origin https://github.com/chaitrabai25/ooting-crm.git
   git branch -M main
   git push -u origin main
   ```
   *Windows Git Credential Manager will securely authenticate via browser or GitHub token. Never share your password.*

---

## 3. Recommended Production Deployment: Render (Blueprint / Web Service)

Render provides unified full-stack hosting with managed PostgreSQL and persistent disk storage.

### Option A: 1-Click Blueprint (Recommended)
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your repository `chaitrabai25/ooting-crm`.
4. Render automatically reads `render.yaml`:
   - Provisions managed PostgreSQL database `ooting-crm-db`.
   - Provisions Web Service `ooting-crm` with persistent disk attached at `server/uploads`.
   - Generates secure `JWT_SECRET`.
5. Click **Apply**.
6. Once deployed, open your live URL (e.g. `https://ooting-crm.onrender.com`).

### Option B: Manual Web Service + Managed PostgreSQL

#### Step 1: Create PostgreSQL Database
1. In Render, click **New +** -> **PostgreSQL**.
2. Name: `ooting-crm-db`.
3. Database: `ooting_crm`, User: `ooting_admin`.
4. Region: Choose closest to your customers (e.g. `Singapore` or `Frankfurt`).
5. Click **Create Database**.
6. Copy the **Internal Database URL** (or External Database URL).

#### Step 2: Create Web Service
1. Click **New +** -> **Web Service**.
2. Select your repository `chaitrabai25/ooting-crm`.
3. Runtime: **Node**.
4. Build Command:
   ```bash
   npm install && npm run prisma:pg:generate && npm run build
   ```
5. Start Command:
   ```bash
   npm start
   ```
6. **Add Environment Variables**:
   | Variable | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimisations |
   | `PORT` | `10000` | Port assigned by Render |
   | `DATABASE_URL` | *(From PostgreSQL service)* | Connection string |
   | `JWT_SECRET` | *(Random 64-char string)* | Session encryption |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry |
   | `ADMIN_EMAIL` | `admin@ooting.com` | Super Admin login email |
   | `ADMIN_PASSWORD` | `[YourSecurePassword]` | Super Admin password |

7. **Attach Persistent Disk (Crucial for Itinerary Photos)**:
   - In your Web Service settings, go to **Disks** -> **Add Disk**.
   - Name: `ooting-uploads`.
   - Mount Path: `/opt/render/project/src/server/uploads`.
   - Size: `5 GB` (expandable).

8. **Initialize Database Schema & Admin**:
   In the Render Web Service **Shell** tab:
   ```bash
   npm run prisma:pg:push
   npm run setup:prod:admin
   ```
   *This pushes the real PostgreSQL schema and creates your Super Admin. Zero dummy data is seeded.*

---

## 4. Alternative Deployment: Railway

1. Log in to [Railway.app](https://railway.app/).
2. Click **New Project** -> **Deploy from GitHub repo** -> `chaitrabai25/ooting-crm`.
3. Click **Add Plugin** -> **PostgreSQL**.
4. Add Volume: Mount `/app/server/uploads`.
5. Set environment variables (`NODE_ENV=production`, `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `JWT_SECRET=...`).
6. Build command: `npm install && npm run prisma:pg:generate && npm run build`.
7. Start command: `npm start`.

---

## 5. Production Database Safety & Backup Procedures

### Automatic Daily Backups
Managed cloud PostgreSQL (Render / Neon / Supabase) takes automatic daily snapshots with point-in-time recovery.

### Manual Backup (CLI Export)
Run this command from your computer anytime to take a complete SQL snapshot:
```bash
pg_dump "<DATABASE_URL>" -F c -b -v -f "ooting_backup_$(date +%Y%m%d).dump"
```

### Restoring from Backup
```bash
pg_restore -d "<DATABASE_URL>" -v "ooting_backup_YYYYMMDD.dump"
```

---

## 6. How to Deploy Future Code Updates Safely

Code deployment and database records are **completely decoupled**. Updating code will never delete or reset CRM data.

### Workflow:
1. Make your changes in VS Code.
2. Test build locally:
   ```bash
   npm run build
   ```
3. Commit and push:
   ```bash
   git add .
   git commit -m "Describe your update"
   git push origin main
   ```
4. Render / Railway will automatically detect the push to `main`, rebuild, and deploy the updated application with zero downtime.
5. All customers, bookings, packages, and uploaded files remain intact.
