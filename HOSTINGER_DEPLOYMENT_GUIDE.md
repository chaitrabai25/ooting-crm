# 🚀 Ooting CRM - Hostinger Deployment & Operations Guide

> **CRITICAL DIRECTIVE - ZERO DATA LOSS:**
> This is a live, ongoing production business system.
> **NEVER execute `prisma migrate reset` or `drop table / database`.**
> All migrations and schema checks are designed to be purely non-destructive and additive.

---

## 📋 System Architecture

- **Frontend:** React 18 + Vite + Tailwind CSS + SweetAlert2 + Lucide Icons (compiled to static production assets in `client/dist`)
- **Backend:** Node.js (v20+) + Express (ES Modules) + Prisma ORM + Sharp (compiled to `server/dist`)
- **Serving Model:** The Express server automatically serves both the API (`/api/*`) and the compiled client SPA (`client/dist/index.html`) on a single port (default: `5000`), or Nginx can serve `client/dist` directly and proxy `/api` to port `5000`.
- **Database:** MySQL / TiDB Cloud with SSL support (`DATABASE_URL`).

---

## 🛡️ Database Zero-Data-Loss Protocols

### 1. Database Safety Rules
- **NEVER RUN:** `npx prisma migrate reset` (This drops all tables and wipes all customer/quotation data).
- **SAFE COMMANDS:**
  - `npm --workspace=server run prisma:generate` (Compiles Prisma client against schema; touches zero database tables).
  - `npm --workspace=server run prisma:push` (Only applies additive column changes, never drops tables if guarded).
  - `npm run db:export` or `npm run db:dump` (Generates offline SQL backup).

### 2. Pre-Deployment Database Backup
Before any deployment or major server maintenance, take a quick snapshot backup:
```bash
# Option A: Built-in Ooting CRM export
npm run db:dump

# Option B: Standard mysqldump (replace with your DB credentials)
mysqldump -u <DB_USER> -p<DB_PASS> -h <DB_HOST> <DB_NAME> > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🌟 Option A: Hostinger VPS Deployment (Recommended)

Hostinger VPS provides root SSH access, dedicated RAM, and full control over background services via PM2 and Nginx.

### Step 1: Connect to VPS and Install Prerequisites
SSH into your Hostinger VPS:
```bash
ssh root@<YOUR_VPS_IP>
```

Install Node.js 20 LTS, Git, and PM2:
```bash
# Update package lists
apt update && apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git certbot python3-certbot-nginx

# Install PM2 globally
npm install -g pm2
```

Verify versions:
```bash
node -v   # v20.x.x
npm -v    # 10.x.x
pm2 -v    # 5.x.x
```

---

### Step 2: Clone Codebase to `/var/www/ooting-crm`
```bash
cd /var/www
git clone <YOUR_GIT_REPOSITORY_URL> ooting-crm
cd ooting-crm
```

---

### Step 3: Configure Environment Variables

Create the production environment file in `server/.env`:
```bash
nano server/.env
```

Paste your production secrets:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="mysql://<user>:<password>@<host>:<port>/<dbname>?sslaccept=strict"
JWT_SECRET="your-super-strong-jwt-secret-key-32-chars-minimum"
CLIENT_URL="https://crm.yourdomain.com"
```

In the root directory, configure `.env` if necessary:
```bash
nano .env
```

And in `client/.env.production` (if pointing directly to domain API):
```env
VITE_API_URL=/api
```

---

### Step 4: Run Automated Deployment Script
Make the deployment script executable and run:
```bash
chmod +x deploy-hostinger.sh
./deploy-hostinger.sh
```

Or execute manual step-by-step build:
```bash
# 1. Install dependencies
npm install --no-audit

# 2. Generate Prisma Client
npm --workspace=server run prisma:generate

# 3. Build Client & Server
npm --workspace=client run build
npm --workspace=server run build

# 4. Start via PM2 using ecosystem configuration
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

---

### Step 5: Configure Nginx Reverse Proxy with SSL

Create an Nginx server block:
```bash
nano /etc/nginx/sites-available/ooting-crm
```

Paste the following configuration (replace `crm.yourdomain.com` with your domain):
```nginx
server {
    listen 80;
    server_name crm.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and restart Nginx:
```bash
ln -s /etc/nginx/sites-available/ooting-crm /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

Obtain free Let's Encrypt SSL certificate:
```bash
certbot --nginx -d crm.yourdomain.com
```

---

## 🌐 Option B: Hostinger hPanel "Node.js Web App" (Cloud Hosting)

If your Hostinger plan includes Cloud Hosting with the **Node.js** app manager:

1. **Upload Files:**
   - Zip your project (excluding `node_modules` and `.git`).
   - In Hostinger hPanel, go to **File Manager** and extract into `public_html` or a subfolder like `public_html/crm`.
2. **Open Node.js Manager in hPanel:**
   - **Node.js version:** Select `20.x` or latest LTS.
   - **Application mode:** `Production`
   - **Application root:** `/crm` (or path where project resides)
   - **Application startup file:** `server/dist/index.js`
3. **Set Environment Variables:**
   - Add `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `PORT=5000`.
4. **Run Build Commands via SSH or Terminal:**
   ```bash
   npm install --no-audit
   npm --workspace=server run prisma:generate
   npm --workspace=client run build
   npm --workspace=server run build
   ```
5. Click **Restart Application** in hPanel.

---

## 🔍 Verification & Health Checklist

After deployment, verify that everything is running smoothly:

1. **API Health Check:**
   ```bash
   curl http://127.0.0.1:5000/api/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "system": "Ooting CRM API Server",
     "database": { "status": "connected", "userCount": <N> }
   }
   ```
2. **Check PM2 Status:**
   ```bash
   pm2 status
   pm2 logs ooting-crm --lines 50
   ```
3. **Verify Frontend UI:**
   - Open `https://crm.yourdomain.com/login`
   - Log in with verified admin credentials.
   - Visit `/packages`: Verify package cards render with full cover photo banners, badges, and quick actions.
   - Visit `/quotations`: Verify approval/rejection triggers SweetAlert2 custom crimson modals instead of browser default popups.
   - Open **Custom Itinerary**: Verify the **Places Master** and **Hotels Master** tabs load with instant 1-click addition to itinerary days.
