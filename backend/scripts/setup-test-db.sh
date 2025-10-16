#!/bin/bash

# Setup Test Database for Rabbit Launchpad Backend
# This script creates and configures the test database

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

echo -e "${BLUE}🗄️  Setting up Rabbit Launchpad Test Database${NC}"
echo "========================================"

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "${YELLOW}📋 Checking PostgreSQL connection...${NC}"
    if pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; then
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
        return 0
    else
        echo -e "${RED}❌ PostgreSQL is not running or not accessible${NC}"
        echo -e "${YELLOW}Please make sure PostgreSQL is installed and running${NC}"
        return 1
    fi
}

# Function to create database user if not exists
create_user() {
    echo -e "${YELLOW}👤 Creating test database user...${NC}"

    # Check if user exists
    if psql -h $DB_HOST -p $DB_PORT -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
        echo -e "${GREEN}✅ User '$DB_USER' already exists${NC}"
    else
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
        echo -e "${GREEN}✅ Created user '$DB_USER'${NC}"
    fi

    # Grant necessary permissions
    psql -h $DB_HOST -p $DB_PORT -U postgres -c "ALTER USER $DB_USER CREATEDB;"
    psql -h $DB_HOST -p $DB_PORT -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
}

# Function to create database
create_database() {
    echo -e "${YELLOW}🏗️  Creating test database...${NC}"

    # Drop database if exists
    if psql -h $DB_HOST -p $DB_PORT -U postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        echo -e "${YELLOW}🗑️  Dropping existing database '$DB_NAME'${NC}"
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "DROP DATABASE $DB_NAME;" || true
    fi

    # Create new database
    psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    echo -e "${GREEN}✅ Created database '$DB_NAME'${NC}"
}

# Function to run migrations
run_migrations() {
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"

    # Check if prisma is available
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}❌ npx command not found. Please install Node.js and npm.${NC}"
        return 1
    fi

    # Generate Prisma client
    echo -e "${YELLOW}📦 Generating Prisma client...${NC}"
    npx prisma generate --schema=./prisma/schema-test.prisma

    # Run migrations
    echo -e "${YELLOW}🚀 Pushing schema to test database...${NC}"
    npx prisma db push --schema=./prisma/schema-test.prisma

    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Function to seed test data
seed_data() {
    echo -e "${YELLOW}🌱 Seeding test data...${NC}"

    # Run seed script
    if [ -f "./prisma/seed-test.ts" ]; then
        npx ts-node prisma/seed-test.ts
        echo -e "${GREEN}✅ Test data seeded successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  No seed file found, skipping data seeding${NC}"
    fi
}

# Function to verify setup
verify_setup() {
    echo -e "${YELLOW}🔍 Verifying database setup...${NC}"

    # Test connection
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        return 1
    fi

    # Check tables
    TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo -e "${GREEN}✅ Database contains $TABLE_COUNT tables${NC}"

    # Show database info
    echo -e "${BLUE}📊 Database Information:${NC}"
    echo "  - Host: $DB_HOST:$DB_PORT"
    echo "  - Name: $DB_NAME"
    echo "  - User: $DB_USER"
    echo "  - Tables: $TABLE_COUNT"
}

# Function to setup Redis (optional)
setup_redis() {
    echo -e "${YELLOW}🔴 Checking Redis connection...${NC}"

    if command -v redis-cli &> /dev/null; then
        if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Redis is running${NC}"
        else
            echo -e "${YELLOW}⚠️  Redis is not running. Some tests may fail.${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Redis CLI not found. Install Redis for full test coverage.${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Starting test database setup...${NC}"

    # Check prerequisites
    if ! check_postgres; then
        echo -e "${RED}❌ Cannot proceed without PostgreSQL${NC}"
        exit 1
    fi

    # Setup database
    create_user
    create_database
    run_migrations
    seed_data

    # Setup Redis
    setup_redis

    # Verify everything
    verify_setup

    echo -e "${GREEN}🎉 Test database setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Run tests: npm run test:integration"
    echo "2. Run tests with coverage: npm run test:coverage"
    echo "3. Run specific test: npm test -- tests/integration/database.test.ts"
    echo ""
    echo -e "${YELLOW}To reset the database:${NC}"
    echo "./scripts/setup-test-db.sh"
}

# Handle script arguments
case "${1:-}" in
    "clean")
        echo -e "${YELLOW}🗑️  Cleaning test database...${NC}"
        if psql -h $DB_HOST -p $DB_PORT -U postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
            psql -h $DB_HOST -p $DB_PORT -U postgres -c "DROP DATABASE $DB_NAME;"
            echo -e "${GREEN}✅ Database '$DB_NAME' dropped${NC}"
        else
            echo -e "${YELLOW}⚠️  Database '$DB_NAME' does not exist${NC}"
        fi
        ;;
    "seed")
        echo -e "${YELLOW}🌱 Reseeding test data...${NC}"
        seed_data
        ;;
    "migrate")
        echo -e "${YELLOW}🔄 Running migrations only...${NC}"
        run_migrations
        ;;
    "verify")
        echo -e "${YELLOW}🔍 Verifying setup...${NC}"
        verify_setup
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [clean|seed|migrate|verify|help]"
        echo ""
        echo "Commands:"
        echo "  clean   - Drop the test database"
        echo "  seed    - Seed test data only"
        echo "  migrate - Run migrations only"
        echo "  verify  - Verify database setup"
        echo "  help    - Show this help message"
        echo ""
        echo "Default: Full setup (create, migrate, seed, verify)"
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