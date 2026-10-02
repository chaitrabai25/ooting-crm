# Ooting CRM — How to Connect to Your MySQL Database

Your Ooting CRM uses a dedicated, production **MySQL 8.0+** database. All existing data (7 users, 12 packages, 40 itineraries, hotels, customers, and bookings) is securely stored in this MySQL database.

---

## METHOD 1: Connect Using MySQL Workbench (Desktop App)

You already have MySQL installed on your laptop. You can connect **MySQL Workbench** directly to your live production database to inspect tables, run queries, and see your live data:

### Connection Parameters:
- **Connection Name**: `Ooting CRM Live MySQL`
- **Connection Method**: `Standard (TCP/IP)`
- **Hostname**: `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
- **Port**: `4000`
- **Username**: `2AJqT6QgbdvDayf.root`
- **Password**: Click **Store in Vault...** and enter: `7xCl3FL0jIFUVu5D`
- **Default Schema**: `ooting_crm`

### Step-by-Step in MySQL Workbench:
1. Open **MySQL Workbench** on your laptop.
2. Next to *MySQL Connections*, click the **`+`** icon to add a new connection.
3. Fill in the parameters above.
4. Click on the **SSL** tab at the top:
   - Set **Use SSL**: `Require` (or `Require and Verify CA`).
5. Click **Test Connection** at the bottom right.
   - You will see: *"Successfully made the MySQL connection"*.
6. Click **OK** to save.
7. Double-click **Ooting CRM Live MySQL** to open it!
   - On the left sidebar under **Schemas**, expand `ooting_crm` → **Tables**.
   - You will see: `User`, `Package`, `ItineraryDay`, `Hotel`, `Customer`, `Booking`, `Payment`, etc.
   - Right-click any table (e.g. `User`) and select **Select Rows - Limit 1000** to view all live records!

---

## METHOD 2: Instant Visual Database in Browser (Prisma Studio)

If you don't want to configure MySQL Workbench, you can view the entire MySQL database in your web browser with a single command:

1. Open your terminal in the CRM project root:
   ```bash
   cd server
   npm run db:studio
   ```
2. Open **http://localhost:5555** in Google Chrome or Edge.
3. You will see an interactive web spreadsheet showing every table in your MySQL database:
   - Click **User** to see all 7 staff accounts and passwords.
   - Click **Package** to see all 12 tour packages.
   - Click **Hotel** to see all hotels.
   - Click **ItineraryDay** to see all 40 day itineraries.
   - Search, filter, and view relations seamlessly!

---

## METHOD 3: Live Terminal Database Viewer

You can instantly print your database status directly in your terminal at any time:

```bash
cd server
npm run db:view
```
This connects to your MySQL server and prints:
- Total record counts for all 18 tables
- List of all active staff and Super Admins
- List of all tour packages with prices
- List of all hotels with star ratings

---

## METHOD 4: Exporting / Downloading a Complete `.sql` Dump

To download an exact, standard MySQL `.sql` script of your live database:

```bash
cd server
npm run db:export
```
This generates:
- **`server/prisma/backup/ooting_crm_live_dump.sql`**

This `.sql` file contains full `CREATE TABLE` and `INSERT INTO` statements. You can import it into any MySQL server, local `localhost:3306`, or archive it as a permanent backup.

---

## METHOD 5: Running Local MySQL (`localhost:3306`)

Your laptop has the `MySQL80` service running. If you want your local development server to store data in your laptop's local MySQL instead of the cloud MySQL:

1. Open MySQL Workbench, connect to **Local instance MySQL80**.
2. Run SQL:
   ```sql
   CREATE DATABASE IF NOT EXISTS ooting_crm;
   ```
3. In `server/.env`, set:
   ```env
   DATABASE_URL="mysql://root:YOUR_LOCAL_PASSWORD@localhost:3306/ooting_crm"
   ```
4. Run `npx prisma db push` to create all tables in your local database.
5. Open `server/prisma/backup/ooting_crm_live_dump.sql` in MySQL Workbench and execute it to import all records.

---

## Summary of Active Database Configuration

| Property | Value |
|---|---|
| **Database Engine** | MySQL 8.0+ (InnoDB utf8mb4) |
| **Host** | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| **Port** | `4000` |
| **Database** | `ooting_crm` |
| **Active Users** | 7 (Super Admins, Admins, Sales, Accounts) |
| **Active Packages** | 12 |
| **Active Itineraries** | 40 |
| **Data Loss Risk** | 0% (Idempotent architecture, daily backups) |
