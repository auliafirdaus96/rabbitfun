@echo off
REM Cleanup Test Database for Rabbit Launchpad Backend (Windows)
REM This script cleans up the test database after tests

setlocal enabledelayedexpansion

REM Database configuration
set DB_NAME=rabbit_launchpad_test
set DB_USER=test
set DB_PASSWORD=test
set DB_HOST=localhost
set DB_PORT=5432

echo 🧹 Cleaning up Rabbit Launchpad Test Database
echo ==========================================

REM Function to check if PostgreSQL is running
:check_postgres
echo 📋 Checking PostgreSQL connection...
pg_isready -h %DB_HOST% -p %DB_PORT% -U %DB_USER% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL is running
    goto :main_menu
) else (
    echo ❌ PostgreSQL is not running or not accessible
    pause
    exit /b 1
)

:main_menu
if "%1"=="" goto :full_cleanup
if /i "%1"=="drop" goto :drop_database
if /i "%1"=="tables" goto :clean_tables
if /i "%1"=="redis" goto :cleanup_redis
if /i "%1"=="files" goto :cleanup_files
if /i "%1"=="failed" goto :cleanup_failed
if /i "%1"=="help" goto :show_help
goto :full_cleanup

:full_cleanup
echo 🔄 Starting full cleanup...
call :clean_tables
call :cleanup_redis
call :cleanup_files
goto :show_summary

:clean_tables
echo 🗑️  Cleaning all tables in test database...

REM Set password for psql
set PGPASSWORD=%DB_PASSWORD%

REM Clean tables in order of dependencies
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "TRUNCATE TABLE audit_logs CASCADE;" >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "TRUNCATE TABLE system_config CASCADE;" >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "TRUNCATE TABLE token_price_history CASCADE;" >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "TRUNCATE TABLE user_analytics CASCADE;" >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "TRUNCATE TABLE token_analytics CASCADE;" >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "TRUNCATE TABLE token_favorites CASCADE;" >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "TRUNCATE TABLE transactions CASCADE;" >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "TRUNCATE TABLE tokens CASCADE;" >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "TRUNCATE TABLE users CASCADE;" >nul 2>&1

echo ✅ All tables cleaned
goto :eof

:drop_database
echo 💥 Dropping test database...

REM Check if database exists
psql -h %DB_HOST% -p %DB_PORT% -U postgres -lqt | cut -d \| -f 1 | findstr "%DB_NAME%" >nul
if %errorlevel% equ 0 (
    REM Disconnect any active connections
    psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '%DB_NAME%';" >nul 2>&1

    REM Drop the database
    psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "DROP DATABASE %DB_NAME%;" >nul 2>&1
    echo ✅ Database '%DB_NAME%' dropped
) else (
    echo ⚠️  Database '%DB_NAME%' does not exist
)

goto :eof

:cleanup_redis
echo 🔴 Cleaning up Redis test data...

where redis-cli >nul 2>&1
if %errorlevel% equ 0 (
    REM Clear Redis database 1 (test database)
    redis-cli -n 1 FLUSHDB >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Redis test data cleared
    ) else (
        echo ⚠️  Redis not accessible, skipping cleanup
    )
) else (
    echo ⚠️  Redis CLI not found, skipping cleanup
)

goto :eof

:cleanup_files
echo 📁 Cleaning up test files...

REM Clean up test uploads
if exist "tests\uploads" (
    del /q "tests\uploads\*" >nul 2>&1
    echo ✅ Test uploads cleaned
)

REM Clean up test logs
if exist "logs" (
    del /q "logs\test-*.log" >nul 2>&1
    echo ✅ Test logs cleaned
)

REM Clean up coverage reports
if exist "coverage" (
    rmdir /s /q "coverage" >nul 2>&1
    echo ✅ Coverage reports cleaned
)

goto :eof

:cleanup_failed
echo 🚨 Cleaning up after failed tests...

REM Kill any hanging test processes
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq *jest*" >nul 2>&1
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq *test*" >nul 2>&1

call :clean_tables
call :cleanup_redis
call :cleanup_files

echo ✅ Failed test cleanup completed
goto :eof

:show_summary
echo 📊 Cleanup Summary:

REM Check if database still exists
psql -h %DB_HOST% -p %DB_PORT% -U postgres -lqt | cut -d \| -f 1 | findstr "%DB_NAME%" >nul
if %errorlevel% equ 0 (
    echo   - Database '%DB_NAME%' still exists
) else (
    echo   - Database '%DB_NAME%' removed
)

REM Check Redis status
where redis-cli >nul 2>&1
if %errorlevel% equ 0 (
    redis-cli -n 1 DBSIZE >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('redis-cli -n 1 DBSIZE') do set REDIS_SIZE=%%i
        if !REDIS_SIZE! equ 0 (
            echo   - Redis test database empty
        ) else (
            echo   - Redis test database has !REDIS_SIZE! keys
        )
    )
)

echo.
echo ✅ Cleanup completed
echo.
echo The test environment is now clean and ready for the next test run.

pause
goto :eof

:show_help
echo Usage: %0 [drop^|tables^|redis^|files^|failed^|help]
echo.
echo Commands:
echo   drop    - Drop the entire test database
echo   tables  - Clean all tables in the database
echo   redis   - Clean Redis test data
echo   files   - Clean test files (logs, uploads, coverage)
echo   failed  - Clean up after failed tests
echo   help    - Show this help message
echo.
echo Default: Full cleanup (tables, redis, files)

pause
goto :eof