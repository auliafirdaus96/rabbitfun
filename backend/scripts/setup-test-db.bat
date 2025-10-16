@echo off
REM Setup Test Database for Rabbit Launchpad Backend (Windows)
REM This script creates and configures the test database

setlocal enabledelayedexpansion

REM Database configuration
set DB_NAME=rabbit_launchpad_test
set DB_USER=test
set DB_PASSWORD=test
set DB_HOST=localhost
set DB_PORT=5432

echo 🗄️  Setting up Rabbit Launchpad Test Database
echo ========================================

REM Function to check if PostgreSQL is running
:check_postgres
echo 📋 Checking PostgreSQL connection...
pg_isready -h %DB_HOST% -p %DB_PORT% -U %DB_USER% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL is running
    goto :create_user
) else (
    echo ❌ PostgreSQL is not running or not accessible
    echo Please make sure PostgreSQL is installed and running
    pause
    exit /b 1
)

:create_user
echo 👤 Creating test database user...
psql -h %DB_HOST% -p %DB_PORT% -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='%DB_USER%'" | findstr "1" >nul
if %errorlevel% equ 0 (
    echo ✅ User '%DB_USER%' already exists
) else (
    psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%';"
    echo ✅ Created user '%DB_USER%'
)

psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "ALTER USER %DB_USER% CREATEDB;" >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%;" >nul 2>&1

:create_database
echo 🏗️  Creating test database...

REM Check if database exists and drop it
psql -h %DB_HOST% -p %DB_PORT% -U postgres -lqt | cut -d \| -f 1 | findstr "%DB_NAME%" >nul
if %errorlevel% equ 0 (
    echo 🗑️  Dropping existing database '%DB_NAME%'
    psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "DROP DATABASE %DB_NAME%;" >nul 2>&1
)

REM Create new database
psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;"
echo ✅ Created database '%DB_NAME%'

:run_migrations
echo 🔄 Running database migrations...

REM Check if npx is available
where npx >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npx command not found. Please install Node.js and npm.
    pause
    exit /b 1
)

REM Generate Prisma client
echo 📦 Generating Prisma client...
npx prisma generate --schema=./prisma/schema-test.prisma

REM Run migrations
echo 🚀 Pushing schema to test database...
npx prisma db push --schema=./prisma/schema-test.prisma

echo ✅ Database migrations completed

:seed_data
echo 🌱 Seeding test data...

REM Run seed script if exists
if exist "prisma\seed-test.ts" (
    npx ts-node prisma/seed-test.ts
    echo ✅ Test data seeded successfully
) else (
    echo ⚠️  No seed file found, skipping data seeding
)

:setup_redis
echo 🔴 Checking Redis connection...

where redis-cli >nul 2>&1
if %errorlevel% equ 0 (
    redis-cli -h localhost -p 6379 ping >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Redis is running
    ) else (
        echo ⚠️  Redis is not running. Some tests may fail.
    )
) else (
    echo ⚠️  Redis CLI not found. Install Redis for full test coverage.
)

:verify_setup
echo 🔍 Verifying database setup...

REM Test connection
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Database connection successful
) else (
    echo ❌ Database connection failed
    pause
    exit /b 1
)

REM Check tables
for /f "tokens=*" %%i in ('psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"') do set TABLE_COUNT=%%i
echo ✅ Database contains %TABLE_COUNT% tables

REM Show database info
echo 📊 Database Information:
echo   - Host: %DB_HOST%:%DB_PORT%
echo   - Name: %DB_NAME%
echo   - User: %DB_USER%
echo   - Tables: %TABLE_COUNT%

echo.
echo 🎉 Test database setup completed successfully!
echo.
echo 📊 Next steps:
echo 1. Run tests: npm run test:integration
echo 2. Run tests with coverage: npm run test:coverage
echo 3. Run specific test: npm test -- tests/integration/database.test.ts
echo.
echo ⚠️  To reset the database: scripts\setup-test-db.bat

pause