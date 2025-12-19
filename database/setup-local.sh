#!/bin/bash
# Setup local PostgreSQL database for Stitch

set -e

echo "🔧 Setting up local PostgreSQL database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo "Install it with: brew install postgresql@16"
    echo "Then start it with: brew services start postgresql@16"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo "⚠️  PostgreSQL is not running. Starting it..."
    brew services start postgresql@16 || brew services start postgresql
    sleep 2
fi

# Create database and user
echo "📦 Creating database and user..."

psql postgres -c "CREATE USER stitch WITH PASSWORD 'stitch_dev_password';" 2>/dev/null || echo "User 'stitch' already exists"
psql postgres -c "ALTER USER stitch WITH SUPERUSER;" 2>/dev/null || true
psql postgres -c "CREATE DATABASE stitch OWNER stitch;" 2>/dev/null || echo "Database 'stitch' already exists"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE stitch TO stitch;" 2>/dev/null || true

# Import schema
echo "📥 Importing schema..."
psql -U stitch -d stitch -f database/schema.sql

# Import seed data
echo "🌱 Importing seed data..."
psql -U stitch -d stitch -f database/seed.sql

echo "✅ Database setup complete!"
echo ""
echo "Connection string: postgresql://stitch:stitch_dev_password@localhost:5432/stitch"
