#!/bin/bash

# Cleanup Test Database for Rabbit Launchpad Backend
# This script cleans up the test database after tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="rabbit_launchpad_test"
DB_USER="test"
DB_PASSWORD="test"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${BLUE}🧹 Cleaning up Rabbit Launchpad Test Database${NC}"
echo "=========================================="

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "${YELLOW}📋 Checking PostgreSQL connection...${NC}"
    if pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; then
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
        return 0
    else
        echo -e "${RED}❌ PostgreSQL is not running or not accessible${NC}"
        return 1
    fi
}

# Function to clean all tables
clean_tables() {
    echo -e "${YELLOW}🗑️  Cleaning all tables in test database...${NC}"

    # Export password for psql
    export PGPASSWORD=$DB_PASSWORD

    # Clean tables in order of dependencies
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        TRUNCATE TABLE audit_logs CASCADE;
        TRUNCATE TABLE system_config CASCADE;
        TRUNCATE TABLE token_price_history CASCADE;
        TRUNCATE TABLE user_analytics CASCADE;
        TRUNCATE TABLE token_analytics CASCADE;
        TRUNCATE TABLE token_favorites CASCADE;
        TRUNCATE TABLE transactions CASCADE;
        TRUNCATE TABLE tokens CASCADE;
        TRUNCATE TABLE users CASCADE;
    " || {
        echo -e "${RED}❌ Failed to clean tables${NC}"
        return 1
    }

    echo -e "${GREEN}✅ All tables cleaned${NC}"
}

# Function to drop the entire database
drop_database() {
    echo -e "${YELLOW}💥 Dropping test database...${NC}"

    # Check if database exists
    if psql -h $DB_HOST -p $DB_PORT -U postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        # Disconnect any active connections
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '$DB_NAME';
        " || true

        # Drop the database
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "DROP DATABASE $DB_NAME;"
        echo -e "${GREEN}✅ Database '$DB_NAME' dropped${NC}"
    else
        echo -e "${YELLOW}⚠️  Database '$DB_NAME' does not exist${NC}"
    fi
}

# Function to clean up Redis
cleanup_redis() {
    echo -e "${YELLOW}🔴 Cleaning up Redis test data...${NC}"

    if command -v redis-cli &> /dev/null; then
        # Clear Redis database 1 (test database)
        redis-cli -n 1 FLUSHDB > /dev/null 2>&1 && {
            echo -e "${GREEN}✅ Redis test data cleared${NC}"
        } || {
            echo -e "${YELLOW}⚠️  Redis not accessible, skipping cleanup${NC}"
        }
    else
        echo -e "${YELLOW}⚠️  Redis CLI not found, skipping cleanup${NC}"
    fi
}

# Function to clean up test files
cleanup_files() {
    echo -e "${YELLOW}📁 Cleaning up test files...${NC}"

    # Clean up test uploads
    if [ -d "./tests/uploads" ]; then
        rm -rf ./tests/uploads/*
        echo -e "${GREEN}✅ Test uploads cleaned${NC}"
    fi

    # Clean up test logs
    if [ -d "./logs" ]; then
        rm -f ./logs/test-*.log
        echo -e "${GREEN}✅ Test logs cleaned${NC}"
    fi

    # Clean up coverage reports
    if [ -d "./coverage" ]; then
        rm -rf ./coverage
        echo -e "${GREEN}✅ Coverage reports cleaned${NC}"
    fi
}

# Function to show cleanup summary
show_summary() {
    echo -e "${BLUE}📊 Cleanup Summary:${NC}"

    # Check if database still exists
    if psql -h $DB_HOST -p $DB_PORT -U postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        echo -e "${YELLOW}  - Database '$DB_NAME' still exists${NC}"
    else
        echo -e "${GREEN}  - Database '$DB_NAME' removed${NC}"
    fi

    # Check Redis status
    if command -v redis-cli &> /dev/null; then
        if redis-cli -n 1 DBSIZE > /dev/null 2>&1; then
            REDIS_SIZE=$(redis-cli -n 1 DBSIZE)
            if [ "$REDIS_SIZE" -eq 0 ]; then
                echo -e "${GREEN}  - Redis test database empty${NC}"
            else
                echo -e "${YELLOW}  - Redis test database has $REDIS_SIZE keys${NC}"
            fi
        fi
    fi

    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to cleanup after failed tests
cleanup_failed_tests() {
    echo -e "${YELLOW}🚨 Cleaning up after failed tests...${NC}"

    # Kill any hanging test processes
    pkill -f "jest" || true
    pkill -f "node.*test" || true

    # Clean up test database
    clean_tables

    # Clean up Redis
    cleanup_redis

    # Clean up files
    cleanup_files

    echo -e "${GREEN}✅ Failed test cleanup completed${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting test database cleanup...${NC}"

    # Check prerequisites
    if ! check_postgres; then
        echo -e "${RED}❌ Cannot proceed without PostgreSQL${NC}"
        exit 1
    fi

    # Clean up different components
    clean_tables
    cleanup_redis
    cleanup_files

    # Show summary
    show_summary

    echo -e "${GREEN}🎉 Test database cleanup completed!${NC}"
    echo ""
    echo -e "${BLUE}The test environment is now clean and ready for the next test run.${NC}"
}

# Handle script arguments
case "${1:-}" in
    "drop")
        echo -e "${YELLOW}💥 Dropping entire test database...${NC}"
        if check_postgres; then
            drop_database
            cleanup_redis
            cleanup_files
        fi
        ;;
    "tables")
        echo -e "${YELLOW}🗑️  Cleaning tables only...${NC}"
        if check_postgres; then
            clean_tables
        fi
        ;;
    "redis")
        echo -e "${YELLOW}🔴 Cleaning Redis only...${NC}"
        cleanup_redis
        ;;
    "files")
        echo -e "${YELLOW}📁 Cleaning test files only...${NC}"
        cleanup_files
        ;;
    "failed")
        echo -e "${YELLOW}🚨 Cleaning up after failed tests...${NC}"
        cleanup_failed_tests
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [drop|tables|redis|files|failed|help]"
        echo ""
        echo "Commands:"
        echo "  drop    - Drop the entire test database"
        echo "  tables  - Clean all tables in the database"
        echo "  redis   - Clean Redis test data"
        echo "  files   - Clean test files (logs, uploads, coverage)"
        echo "  failed  - Clean up after failed tests"
        echo "  help    - Show this help message"
        echo ""
        echo "Default: Full cleanup (tables, redis, files)"
        ;;
    "")
        main
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac