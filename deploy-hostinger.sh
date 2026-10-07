#!/usr/bin/env bash
# ==============================================================================
# Ooting CRM - Automated Production Deployment Script for Hostinger VPS / Cloud
# ZERO DATA LOSS SAFEGUARD: Does NOT run prisma migrate reset or drop any tables
# ==============================================================================

set -e

echo "🚀 [1/6] Starting Ooting CRM Hostinger Deployment..."

# Ensure logs directory exists
mkdir -p logs

# Ensure node & npm are installed
echo "📦 [2/6] Checking Node.js environment..."
node -v
npm -v

# Install dependencies (respecting lockfile)
echo "📥 [3/6] Installing dependencies..."
npm install --no-audit

# Generate Prisma Client (Zero data alteration)
echo "🔄 [4/6] Generating Prisma client schema..."
npm --workspace=server run prisma:generate

# Build frontend and backend
echo "🏗️ [5/6] Building Client & Server bundles..."
npm --workspace=client run build
npm --workspace=server run build

# Start or reload via PM2
echo "⚡ [6/6] Reloading PM2 process manager..."
if pm2 describe ooting-crm > /dev/null 2>&1; then
    echo "Reloading existing ooting-crm process with zero downtime..."
    pm2 reload ecosystem.config.cjs --env production
else
    echo "Starting new ooting-crm PM2 instance..."
    pm2 start ecosystem.config.cjs --env production
fi

pm2 save

echo "===================================================="
echo "✅ Ooting CRM successfully deployed to Hostinger!"
echo "   Status: pm2 status"
echo "   Logs: pm2 logs ooting-crm"
echo "   Health Check: curl http://127.0.0.1:5000/api/health"
echo "===================================================="
