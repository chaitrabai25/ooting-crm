# Ooting CRM — Step-by-Step MySQL Setup Guide

This guide gives you the exact, step-by-step instructions to connect your **Local Laptop MySQL** for development and a **Cloud MySQL** database for your 24/7 Vercel deployment.

---

## PART 1: Local MySQL Setup (On Your Laptop)

Your laptop already has **MySQL 8.0** installed and running (`MySQL80` service). Follow these steps to create the `ooting_crm` database:

### STEP 1: Open MySQL Workbench (or MySQL 8.0 Command Line Client)
- Press the **Windows Key** on your keyboard.
- Type `MySQL Workbench` (or `MySQL Command Line Client`) and click to open it.

### STEP 2: Connect to your Local MySQL
- In MySQL Workbench, click on **Local instance MySQL80** (user: `root`).
- Enter your MySQL root password when prompted.

### STEP 3: Create the `ooting_crm` Database
- In the SQL Query tab, type or paste:
  ```sql
  CREATE DATABASE IF NOT EXISTS ooting_crm;
  ```
- Click the ⚡ **Execute** (lightning bolt) icon or press `Ctrl + Enter`.
- Look at the bottom output panel: you will see a green checkmark `CREATE DATABASE IF NOT EXISTS ooting_crm`.

### STEP 4: Configure Your Local Environment File
- Open your CRM folder in VS Code (`c:\Users\ootng\Desktop\RM`).
- Open `server/.env` (or create `.env.local`).
- Update the `DATABASE_URL` line to:
  ```env
  DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/ooting_crm"
  ```
  *(Replace `YOUR_PASSWORD` with the password you use to log into MySQL Workbench).*

### STEP 5: Run the Automated Setup & Data Migration
- Open a terminal in the project root and run:
  ```bash
  npm run db:setup:local
  ```
- This command automatically:
  1. Creates all 18 tables in your MySQL `ooting_crm` database.
  2. Migrates all 7 users, 3 customers, 1 lead, 1 booking, 4 packages, 7 itinerary days, 1 expense, 1 cab booking, 1 calendar event, 7 company settings, and 34 audit logs.
  3. Displays a verification table showing `[PASS]` for all tables.

### STEP 6: Start Your Local CRM
- In your terminal, run:
  ```bash
  npm run dev
  ```
- Open `http://localhost:5173` in your browser.
- Log in with any of your verified accounts:
  - **Super Admin**: `admin@ooting.com` / `Admin@12345`
  - **Super Admin**: `chaitrabaijr@gmail.com` / `Admin@12345`
  - **Super Admin**: `chaitrabai25@gmail.com` / `Admin@12345`
  - **Admin**: `chandu@gmail.com` / `Admin@12345`
  - **Sales**: `sales@ooting.com` / `Sales@12345`
  - **Sales**: `darshan@gmail.com` / `123456`
  - **Accountant**: `accounts@ooting.com` / `Accounts@12345`

---

## PART 2: Production Cloud MySQL Setup (For Vercel)

To ensure your Vercel deployment stores data permanently 24/7 (even when your laptop is turned off or restarting), connect it to a free Cloud MySQL database.

We recommend **TiDB Cloud Serverless** or **Aiven for MySQL** (both are 100% MySQL 8.0 wire-compatible and have free tiers).

### Using TiDB Cloud (Recommended — 25GB Free, No Credit Card Required):

### STEP 1: Open TiDB Cloud
- Open your web browser and go to [https://tidbcloud.com/](https://tidbcloud.com/).
- Click **Sign In with Google** or create a free account.

### STEP 2: Create a Free Serverless Cluster
- Click **Create Cluster**.
- Select **Serverless** (Free tier).
- Cluster name: `ooting-crm-db`.
- Region: Select nearest region (e.g. `Singapore` or `Mumbai`).
- Click **Create**.

### STEP 3: Create Database & Copy Connection String
- Once the cluster is created, click **Connect**.
- Select **Prisma** from the connection framework dropdown.
- Copy the provided `DATABASE_URL`:
  ```env
  DATABASE_URL="mysql://username:password@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/ooting_crm?sslaccept=strict"
  ```
- Make sure the database name at the end of the URL is `ooting_crm` (if it says `/test`, change it to `/ooting_crm`).

### STEP 4: Migrate Your Existing Data to Cloud MySQL
- On your laptop, run this one-time command in your terminal (paste your real Cloud MySQL URL):
  ```bash
  $env:DATABASE_URL="YOUR_CLOUD_MYSQL_URL"; npm run db:setup:local
  ```
  *(On Mac/Linux: `DATABASE_URL="YOUR_CLOUD_MYSQL_URL" npm run db:setup:local`)*
- This initializes all tables in your Cloud MySQL and uploads your existing 7 users, 3 customers, leads, bookings, packages, and settings.

### STEP 5: Add `DATABASE_URL` to Vercel
- Go to your [Vercel Dashboard](https://vercel.com/).
- Click your **Ooting CRM** project.
- Click **Settings** (top navigation bar).
- In the left sidebar, click **Environment Variables**.
- Click **Add Variable**:
  - **Key**: `DATABASE_URL`
  - **Value**: Paste your Cloud MySQL connection string.
  - **Environments**: Check `Production`, `Preview`, `Development`.
- Click **Save**.

### STEP 6: Redeploy Vercel
- Go to the **Deployments** tab in Vercel.
- Click the three dots `...` on your latest deployment and click **Redeploy**.
- Once deployed, visit your Vercel URL (e.g., `https://ooting-crm.vercel.app/login`).
- Log in with `admin@ooting.com` / `Admin@12345`.
- Create a test booking or customer.
- Close your laptop, restart it, or open from your mobile phone: **all data is saved permanently in Cloud MySQL**!

---

## PART 3: Database Dump & Backup Files

For your records and future migration to any other system, your project contains:

1. **`server/prisma/backup/dump.sql`**:
   - Universal, standard MySQL SQL file with `CREATE TABLE` and `INSERT INTO` statements.
   - Can be opened and executed directly in MySQL Workbench, phpMyAdmin, or any MySQL database.
2. **`server/prisma/backup/ooting-crm-pre-migration-backup.json`**:
   - Clean JSON snapshot of all 18 tables with exact IDs and password hashes.
3. **1-Click Live CRM Dump from UI**:
   - Inside the CRM, navigate to **Settings → Permanent Data Backup & Complete CRM Dump**.
   - Click **Download Full CRM Backup (.json)** at any time.

---

## PART 4: Verification Checklist

| Verification Step | Local Development | Vercel Production |
|---|---|---|
| **Database Engine** | MySQL 8.0 (Laptop) | Cloud MySQL (24/7) |
| **Data Survives Laptop Shutdown** | N/A (Local dev only) | ✅ YES (Stored in Cloud DB) |
| **All Existing Users & Data Preserved** | ✅ YES (7 users, all records) | ✅ YES (7 users, all records) |
| **Authentication Working** | ✅ YES | ✅ YES |
| **Reports & Excel Export** | ✅ Authenticated downloads | ✅ Authenticated downloads |
| **Custom Domain Ready** | N/A | ✅ Future domain (e.g. crm.ooting.com) |
