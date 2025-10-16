#!/bin/bash

# Production Database Migration Script for Rabbit Launchpad
# This script handles database schema migrations with proper safety measures

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROD_DB_NAME="${DB_NAME:-rabbit_launchpad_prod}"
PROD_DB_USER="${DB_USER:-rabbit_prod_user}"
PROD_DB_HOST="${DB_HOST:-localhost}"
PROD_DB_PORT="${DB_PORT:-5432}"

# Migration settings
MIGRATION_TIMEOUT="${MIGRATION_TIMEOUT:-600}" # 10 minutes
BACKUP_BEFORE_MIGRATION="${BACKUP_BEFORE_MIGRATION:-true}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Backup settings
BACKUP_DIR="/var/backups/rabbit-launchpad/migrations"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Create backup before migration
create_migration_backup() {
    if [[ "$BACKUP_BEFORE_MIGRATION" != "true" ]]; then
        return 0
    fi

    log "Creating pre-migration backup..."

    mkdir -p "$BACKUP_DIR"
    local backup_file="$BACKUP_DIR/pre_migration_${PROD_DB_NAME}_${TIMESTAMP}.sql"

    if ! pg_dump -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" --no-password --verbose --clean --if-exists --format=custom > "$backup_file"; then
        gzip "$backup_file"
        success "Pre-migration backup created: ${backup_file}.gz"
        echo "$backup_file.gz" > "$BACKUP_DIR/latest_migration_backup.txt"
    else
        error "Failed to create pre-migration backup"
    fi
}

# Check database connection
check_database_connection() {
    log "Checking database connection..."

    if ! pg_isready -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" > /dev/null 2>&1; then
        error "Cannot connect to database: $PROD_DB_NAME"
    fi

    success "Database connection verified"
}

# Check database size and health
check_database_health() {
    log "Checking database health..."

    local db_size=$(psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT pg_size_pretty(pg_database_size('$PROD_DB_NAME'));" | tr -d ' ')
    local table_count=$(psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

    info "Database size: $db_size"
    info "Table count: $table_count"

    # Check for active connections
    local active_connections=$(psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';")
    if [[ $active_connections -gt 0 ]]; then
        warning "Found $active_connections active database connections"
        read -p "Continue with migration? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Migration cancelled by user"
        fi
    fi

    success "Database health check passed"
}

# Generate Prisma client
generate_prisma_client() {
    log "Generating Prisma client..."

    if ! npx prisma generate --schema=./prisma/schema-production.prisma; then
        error "Failed to generate Prisma client"
    fi

    success "Prisma client generated successfully"
}

# Check migration status
check_migration_status() {
    log "Checking migration status..."

    # Check if we can connect to the database
    if ! npx prisma db pull --schema=./prisma/schema-production.prisma --force 2>/dev/null; then
        warning "Cannot pull current schema, database might be empty"
        return 0
    fi

    # Compare current schema with target schema
    local schema_diff=$(npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema-production.prisma 2>/dev/null || echo "diff_available")

    if [[ "$schema_diff" == "No changes" ]]; then
        info "Database schema is up to date"
        return 1
    else
        info "Schema changes detected"
        return 0
    fi
}

# Apply database migrations
apply_migrations() {
    log "Applying database migrations..."

    # Use db push for production (safer than migrate)
    if npx prisma db push --schema=./prisma/schema-production.prisma --accept-data-loss; then
        success "Database migrations applied successfully"
    else
        error "Failed to apply database migrations"
    fi
}

# Verify migration success
verify_migration() {
    log "Verifying migration success..."

    # Check if all tables exist
    local expected_tables=(
        "users"
        "user_sessions"
        "tokens"
        "transactions"
        "token_favorites"
        "token_analytics"
        "user_analytics"
        "token_price_history"
        "token_alerts"
        "system_config"
        "audit_logs"
        "rate_limits"
        "failed_logins"
        "background_jobs"
    )

    local missing_tables=()
    for table in "${expected_tables[@]}"; do
        if ! psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name = '$table' AND table_schema = 'public';" | grep -q 1; then
            missing_tables+=("$table")
        fi
    done

    if [[ ${#missing_tables[@]} -gt 0 ]]; then
        error "Missing tables after migration: ${missing_tables[*]}"
    fi

    # Check if indexes exist
    local expected_indexes=(
        "idx_wallet_address"
        "idx_email"
        "idx_username"
        "idx_token_address"
        "idx_token_name"
        "idx_token_symbol"
        "idx_tx_hash"
        "idx_tx_block"
        "idx_tx_type"
        "idx_tx_token"
        "idx_tx_trader"
        "idx_tx_status"
        "idx_tx_created"
    )

    local missing_indexes=()
    for index in "${expected_indexes[@]}"; do
        if ! psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT 1 FROM pg_indexes WHERE indexname = '$index';" | grep -q 1; then
            missing_indexes+=("$index")
        fi
    done

    if [[ ${#missing_indexes[@]} -gt 0 ]]; then
        warning "Missing indexes after migration: ${missing_indexes[*]}"
    fi

    # Test basic operations
    if ! psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -c "INSERT INTO system_config (key, value, description, category) VALUES ('migration_test', 'success', 'Migration verification test', 'system') ON CONFLICT (key) DO NOTHING;" > /dev/null 2>&1; then
        error "Failed to verify database write operations"
    fi

    if ! psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -c "DELETE FROM system_config WHERE key = 'migration_test';" > /dev/null 2>&1; then
        error "Failed to verify database delete operations"
    fi

    success "Migration verification passed"
}

# Create migration log
create_migration_log() {
    log "Creating migration log..."

    local log_file="$BACKUP_DIR/migration_log_${TIMESTAMP}.log"

    {
        echo "=== Rabbit Launchpad Production Database Migration ==="
        echo "Timestamp: $(date)"
        echo "Database: $PROD_DB_NAME"
        echo "Host: $PROD_DB_HOST:$PROD_DB_PORT"
        echo "User: $PROD_DB_USER"
        echo ""
        echo "Migration Settings:"
        echo "  Timeout: ${MIGRATION_TIMEOUT}s"
        echo "  Backup Before: $BACKUP_BEFORE_MIGRATION"
        echo "  Rollback on Failure: $ROLLBACK_ON_FAILURE"
        echo ""
        echo "Schema: prisma/schema-production.prisma"
        echo "Client Generated: $(npx prisma --version)"
        echo ""
        echo "=== Migration Results ==="
        echo "Status: SUCCESS"
        echo "Completed: $(date)"
        echo ""
        echo "=== Database Statistics ==="
        local db_size=$(psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT pg_size_pretty(pg_database_size('$PROD_DB_NAME'));")
        local table_count=$(psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        local index_count=$(psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';")
        echo "Database Size: $db_size"
        echo "Table Count: $table_count"
        echo "Index Count: $index_count"
    } > "$log_file"

    success "Migration log created: $log_file"
}

# Rollback migration
rollback_migration() {
    if [[ "$ROLLBACK_ON_FAILURE" != "true" ]]; then
        warning "Rollback is disabled, leaving database as-is"
        return 0
    fi

    log "Rolling back migration..."

    local backup_file=$(cat "$BACKUP_DIR/latest_migration_backup.txt" 2>/dev/null || echo "")

    if [[ -z "$backup_file" ]] || [[ ! -f "$backup_file" ]]; then
        error "No backup file found for rollback"
    fi

    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" > "/tmp/rollback_${PROD_DB_NAME}.sql"
        RESTORE_FILE="/tmp/rollback_${PROD_DB_NAME}.sql"
    else
        RESTORE_FILE="$backup_file"
    fi

    # Drop and recreate database
    psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U postgres -c "DROP DATABASE $PROD_DB_NAME;" > /dev/null 2>&1
    psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U postgres -c "CREATE DATABASE $PROD_DB_NAME OWNER $PROD_DB_USER;" > /dev/null 2>&1

    # Restore from backup
    if pg_restore -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" --no-password --verbose --clean --if-exists "$RESTORE_FILE"; then
        success "Migration rolled back successfully"
    else
        error "Failed to rollback migration"
    fi

    # Clean up
    if [[ "$backup_file" == *.gz ]]; then
        rm -f "$RESTORE_FILE"
    fi
}

# Set timeout for migration
set_migration_timeout() {
    log "Setting migration timeout to ${MIGRATION_TIMEOUT} seconds..."

    # Set Prisma timeout
    export PRISMA_QUERY_ENGINE_TIMEOUT="$MIGRATION_TIMEOUT"
    export PRISMA_ENGINES_TIMEOUT="$MIGRATION_TIMEOUT"

    success "Migration timeout set to ${MIGRATION_TIMEOUT} seconds"
}

# Main execution
main() {
    echo -e "${PURPLE}"
    echo "🔄 Rabbit Launchpad Production Database Migration"
    echo "=============================================="
    echo -e "${NC}"

    # Set timeout
    set_migration_timeout

    # Pre-migration checks
    check_database_connection
    check_database_health

    # Create backup
    create_migration_backup

    # Check if migration is needed
    if ! check_migration_status; then
        info "No migration needed, database is up to date"
        exit 0
    fi

    # Generate client
    generate_prisma_client

    # Apply migrations
    apply_migrations

    # Verify migration
    verify_migration

    # Create migration log
    create_migration_log

    echo -e "${GREEN}"
    echo "🎉 Production database migration completed successfully!"
    echo ""
    echo "📋 Migration Details:"
    echo "  - Database: $PROD_DB_NAME"
    echo "  - Host: $PROD_DB_HOST:$PROD_DB_PORT"
    echo "  - Schema: prisma/schema-production.prisma"
    echo "  - Backup: $BACKUP_BEFORE_MIGRATION"
    echo ""
    echo "📊 Next Steps:"
    echo "  1. Test application functionality"
    echo "  2. Monitor database performance"
    echo "  3. Check application logs"
    echo "  4. Verify all features are working"
    echo ""
    echo "📁 Migration Log: $BACKUP_DIR/migration_log_${TIMESTAMP}.log"
    echo "📁 Backup: $BACKUP_DIR/latest_migration_backup.txt"
    echo -e "${NC}"
}

# Error handling
trap 'error "Migration failed. Check logs for details."; rollback_migration' ERR

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [help|check|backup|status|verify|rollback]"
        echo ""
        echo "Commands:"
        echo "  help    - Show this help message"
        echo "  check   - Check database connection and health only"
        echo "  backup  - Create backup only"
        echo "  status  - Check migration status only"
        echo "  verify  - Verify current database schema"
        echo "  rollback - Rollback last migration"
        echo ""
        echo "Environment Variables:"
        echo "  DB_NAME - Database name (default: rabbit_launchpad_prod)"
        echo "  DB_USER - Database user (default: rabbit_prod_user)"
        echo "  DB_HOST - Database host (default: localhost)"
        echo "  DB_PORT - Database port (default: 5432)"
        echo "  MIGRATION_TIMEOUT - Migration timeout in seconds (default: 600)"
        echo "  BACKUP_BEFORE_MIGRATION - Create backup before migration (default: true)"
        echo "  ROLLBACK_ON_FAILURE - Rollback on failure (default: true)"
        echo ""
        echo "Default: Full migration process"
        ;;
    "check")
        check_database_connection
        check_database_health
        ;;
    "backup")
        create_migration_backup
        ;;
    "status")
        check_database_connection
        check_migration_status
        ;;
    "verify")
        check_database_connection
        verify_migration
        ;;
    "rollback")
        rollback_migration
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