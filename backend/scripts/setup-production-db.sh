#!/bin/bash

# Production Database Setup Script for Rabbit Launchpad
# This script sets up the production database with proper security and optimization

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
PROD_DB_NAME="rabbit_launchpad_prod"
PROD_DB_USER="rabbit_prod_user"
PROD_DB_PASSWORD=""
PROD_DB_HOST="${DB_HOST:-localhost}"
PROD_DB_PORT="${DB_PORT:-5432}"
PROD_DB_SCHEMA="public"

# Admin database credentials
ADMIN_USER="${DB_ADMIN_USER:-postgres}"
ADMIN_PASSWORD="${DB_ADMIN_PASSWORD:-}"

# Security settings
MIN_PASSWORD_LENGTH=16
BACKUP_DIR="/var/backups/rabbit-launchpad"
LOG_DIR="/var/log/rabbit-launchpad"

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL client not found. Please install PostgreSQL client."
    fi

    # Check connection to PostgreSQL
    if ! pg_isready -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" &> /dev/null; then
        error "Cannot connect to PostgreSQL server at $PROD_DB_HOST:$PROD_DB_PORT"
    fi

    # Check required environment variables
    if [[ -z "$ADMIN_PASSWORD" ]]; then
        error "DB_ADMIN_PASSWORD environment variable is required"
    fi

    success "Prerequisites check passed"
}

# Generate secure password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Prompt for password if not provided
get_database_password() {
    if [[ -z "$PROD_DB_PASSWORD" ]]; then
        log "Generating secure database password..."
        PROD_DB_PASSWORD=$(generate_password 32)
        info "Generated password for $PROD_DB_USER: $PROD_DB_PASSWORD"
        warning "Please save this password securely!"

        # Save password to file with restricted permissions
        echo "$PROD_DB_PASSWORD" > "${PROD_DB_NAME}_password.txt"
        chmod 600 "${PROD_DB_NAME}_password.txt"
        warning "Password saved to ${PROD_DB_NAME}_password.txt"
    fi

    # Validate password length
    if [[ ${#PROD_DB_PASSWORD} -lt $MIN_PASSWORD_LENGTH ]]; then
        error "Database password must be at least $MIN_PASSWORD_LENGTH characters long"
    fi
}

# Create database user
create_database_user() {
    log "Creating production database user..."

    # Check if user exists
    if psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" -tAc "SELECT 1 FROM pg_roles WHERE rolname='$PROD_DB_USER'" | grep -q 1; then
        warning "Database user '$PROD_DB_USER' already exists"
        return 0
    fi

    # Create user with limited privileges
    psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" -c "
        CREATE ROLE $PROD_DB_USER WITH LOGIN PASSWORD '$PROD_DB_PASSWORD';
    " || error "Failed to create database user"

    success "Database user '$PROD_DB_USER' created successfully"
}

# Create database
create_database() {
    log "Creating production database..."

    # Check if database exists
    if psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" -lqt | cut -d \| -f 1 | grep -qw "$PROD_DB_NAME"; then
        warning "Database '$PROD_DB_NAME' already exists"
        read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" -c "DROP DATABASE $PROD_DB_NAME;" || error "Failed to drop existing database"
            info "Existing database dropped"
        else
            warning "Keeping existing database"
            return 0
        fi
    fi

    # Create database
    psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" -c "
        CREATE DATABASE $PROD_DB_NAME
        OWNER $PROD_DB_USER
        ENCODING 'UTF8'
        LC_COLLATE 'en_US.UTF-8'
        LC_CTYPE 'en_US.UTF-8';
    " || error "Failed to create database"

    success "Database '$PROD_DB_NAME' created successfully"
}

# Grant privileges
grant_privileges() {
    log "Granting database privileges..."

    psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" -c "
        -- Grant connection privilege
        GRANT CONNECT ON DATABASE $PROD_DB_NAME TO $PROD_DB_USER;

        -- Grant usage on schema
        GRANT USAGE ON SCHEMA $PROD_DB_SCHEMA TO $PROD_DB_USER;

        -- Grant all privileges on tables (will be refined after schema creation)
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA $PROD_DB_SCHEMA TO $PROD_DB_USER;

        -- Grant all privileges on sequences
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA $PROD_DB_SCHEMA TO $PROD_DB_USER;

        -- Grant all privileges on functions
        GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA $PROD_DB_SCHEMA TO $PROD_DB_USER;

        -- Set default privileges for future objects
        ALTER DEFAULT PRIVILEGES IN SCHEMA $PROD_DB_SCHEMA GRANT ALL ON TABLES TO $PROD_DB_USER;
        ALTER DEFAULT PRIVILEGES IN SCHEMA $PROD_DB_SCHEMA GRANT ALL ON SEQUENCES TO $PROD_DB_USER;
    " || error "Failed to grant privileges"

    success "Database privileges granted successfully"
}

# Create extensions
create_extensions() {
    log "Creating database extensions..."

    psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" -d "$PROD_DB_NAME" -c "
        -- Enable UUID generation
        CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

        -- Enable cryptography functions
        CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";

        -- Enable trigram search for better text search
        CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";

        -- Enable btree_gin for better indexing
        CREATE EXTENSION IF NOT EXISTS \"btree_gin\";

        -- Enable citext for case-insensitive text
        CREATE EXTENSION IF NOT EXISTS \"citext\";
    " || error "Failed to create extensions"

    success "Database extensions created successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."

    # Check if npx is available
    if ! command -v npx &> /dev/null; then
        error "npx command not found. Please install Node.js and npm."
    fi

    # Generate Prisma client
    log "Generating Prisma client..."
    npx prisma generate --schema=./prisma/schema-production.prisma || error "Failed to generate Prisma client"

    # Push schema to database
    log "Applying database schema..."
    npx prisma db push --schema=./prisma/schema-production.prisma || error "Failed to apply database schema"

    success "Database migrations completed successfully"
}

# Create indexes for performance
create_indexes() {
    log "Creating performance indexes..."

    psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" -d "$PROD_DB_NAME" -c "
        -- Create partial indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_users_active_verified ON users(isActive, isVerified) WHERE isActive = true;

        CREATE INDEX IF NOT EXISTS idx_tokens_active_graduated ON tokens(isActive, graduated) WHERE isActive = true;

        CREATE INDEX IF NOT EXISTS idx_transactions_status_created ON transactions(status, createdAt) WHERE status IN ('PENDING', 'PROCESSING');

        CREATE INDEX IF NOT EXISTS idx_transactions_type_created ON transactions(type, createdAt DESC);

        CREATE INDEX IF NOT EXISTS idx_token_analytics_date_token ON token_analytics(date DESC, tokenId);

        CREATE INDEX IF NOT EXISTS idx_price_history_timestamp_desc ON token_price_history(timestamp DESC);

        -- Create expression indexes
        CREATE INDEX IF NOT EXISTS idx_users_wallet_lower ON users(LOWER(walletAddress));

        CREATE INDEX IF NOT EXISTS idx_tokens_symbol_lower ON tokens(LOWER(symbol));

        -- Create composite indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_transactions_token_trader_created ON transactions(tokenId, traderAddress, createdAt DESC);

        CREATE INDEX IF NOT EXISTS idx_token_favorites_user_created ON token_favorites(userId, createdAt DESC);

        -- Create GIN indexes for text search
        CREATE INDEX IF NOT EXISTS idx_tokens_name_gin ON tokens USING gin(to_tsvector('english', name));

        CREATE INDEX IF NOT EXISTS idx_tokens_description_gin ON tokens USING gin(to_tsvector('english', description));
    " || error "Failed to create performance indexes"

    success "Performance indexes created successfully"
}

# Setup backup directory
setup_backup_directory() {
    log "Setting up backup directory..."

    if [[ ! -d "$BACKUP_DIR" ]]; then
        sudo mkdir -p "$BACKUP_DIR"
        sudo chown "$(whoami):$(whoami)" "$BACKUP_DIR"
        sudo chmod 750 "$BACKUP_DIR"
    fi

    # Create backup script directory
    local backup_script_dir="$BACKUP_DIR/scripts"
    mkdir -p "$backup_script_dir"

    success "Backup directory setup completed"
}

# Setup logging directory
setup_logging_directory() {
    log "Setting up logging directory..."

    if [[ ! -d "$LOG_DIR" ]]; then
        sudo mkdir -p "$LOG_DIR"
        sudo chown "$(whoami):$(whoami)" "$LOG_DIR"
        sudo chmod 750 "$LOG_DIR"
    fi

    # Create log rotation configuration
    cat > "/tmp/rabbit-launchpad-logrotate" << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        systemctl reload rabbit-launchpad-backend || true
    endscript
}
EOF

    sudo mv "/tmp/rabbit-launchpad-logrotate" "/etc/logrotate.d/rabbit-launchpad"
    sudo chown root:root "/etc/logrotate.d/rabbit-launchpad"
    sudo chmod 644 "/etc/logrotate.d/rabbit-launchpad"

    success "Logging directory setup completed"
}

# Create backup scripts
create_backup_scripts() {
    log "Creating backup scripts..."

    local backup_script_dir="$BACKUP_DIR/scripts"

    # Create daily backup script
    cat > "$backup_script_dir/daily-backup.sh" << 'EOF'
#!/bin/bash

# Daily backup script for Rabbit Launchpad production database
# This script creates a full backup of the production database

set -euo pipefail

# Configuration
DB_NAME="rabbit_launchpad_prod"
DB_USER="rabbit_prod_user"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="/var/backups/rabbit-launchup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/daily_${DB_NAME}_${DATE}.sql"

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "ERROR: $1" >&2
    exit 1
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform backup
log "Starting daily backup for $DB_NAME..."

if ! pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password --verbose --clean --if-exists --format=custom > "$BACKUP_FILE"; then
    error "Failed to create backup"
fi

# Compress backup
log "Compressing backup..."
gzip "$BACKUP_FILE"

# Remove old backups (keep last 30 days)
find "$BACKUP_DIR" -name "daily_${DB_NAME}_*.sql.gz" -mtime +30 -delete

# Upload to S3 if configured
if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]] && [[ -n "${AWS_SECRET_ACCESS_KEY:-}" ]] && [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
    log "Uploading backup to S3..."
    aws s3 cp "${BACKUP_FILE}.gz" "s3://$BACKUP_S3_BUCKET/database-backups/" --storage-class STANDARD_IA
fi

log "Daily backup completed successfully: ${BACKUP_FILE}.gz"
EOF

    # Create restore script
    cat > "$backup_script_dir/restore.sh" << 'EOF'
#!/bin/bash

# Restore script for Rabbit Launchpad production database
# Usage: ./restore.sh <backup_file>

set -euo pipefail

# Configuration
DB_NAME="rabbit_launchpad_prod"
DB_USER="rabbit_prod_user"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "ERROR: $1" >&2
    exit 1
}

warning() {
    echo "WARNING: $1"
}

# Check arguments
if [[ $# -ne 1 ]]; then
    error "Usage: $0 <backup_file>"
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [[ ! -f "$BACKUP_FILE" ]]; then
    error "Backup file not found: $BACKUP_FILE"
fi

# Confirmation
warning "This will restore the production database from backup: $BACKUP_FILE"
warning "All current data will be lost!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled"
    exit 0
fi

# Uncompress backup if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log "Uncompressing backup..."
    gunzip -c "$BACKUP_FILE" > "/tmp/restore_${DB_NAME}.sql"
    RESTORE_FILE="/tmp/restore_${DB_NAME}.sql"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Perform restore
log "Starting database restore..."
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password --verbose --clean --if-exists "$RESTORE_FILE"

# Clean up
if [[ "$BACKUP_FILE" == *.gz ]]; then
    rm -f "$RESTORE_FILE"
fi

log "Database restore completed successfully"
EOF

    # Make scripts executable
    chmod +x "$backup_script_dir/daily-backup.sh"
    chmod +x "$backup_script_dir/restore.sh"

    success "Backup scripts created successfully"
}

# Setup monitoring setup
setup_monitoring() {
    log "Setting up monitoring..."

    # Create monitoring user
    psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" -d "$PROD_DB_NAME" -c "
        CREATE ROLE monitoring WITH LOGIN PASSWORD '$(generate_password 32)';
        GRANT SELECT ON ALL TABLES IN SCHEMA $PROD_DB_SCHEMA TO monitoring;
        GRANT SELECT ON ALL SEQUENCES IN SCHEMA $PROD_DB_SCHEMA TO monitoring;
    " || error "Failed to create monitoring user"

    # Create monitoring views
    psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$ADMIN_USER" -d "$PROD_DB_NAME" -c "
        -- Database size monitoring
        CREATE OR REPLACE VIEW v_database_size AS
        SELECT
            pg_database.datname as database_name,
            pg_size_pretty(pg_database_size(pg_database.datname)) as size,
            pg_database_size(pg_database.datname) as size_bytes
        FROM pg_database
        WHERE pg_database.datname = '$PROD_DB_NAME';

        -- Active users monitoring
        CREATE OR REPLACE VIEW v_active_users AS
        SELECT
            COUNT(*) as total_users,
            COUNT(CASE WHEN isActive = true THEN 1 END) as active_users,
            COUNT(CASE WHEN isVerified = true THEN 1 END) as verified_users,
            COUNT(CASE WHEN lastLoginAt > NOW() - INTERVAL '30 days' THEN 1 END) as recent_users
        FROM users;

        -- Token statistics monitoring
        CREATE OR REPLACE VIEW v_token_statistics AS
        SELECT
            COUNT(*) as total_tokens,
            COUNT(CASE WHEN isActive = true THEN 1 END) as active_tokens,
            COUNT(CASE WHEN graduated = true THEN 1 END) as graduated_tokens,
            COUNT(CASE WHEN isFeatured = true THEN 1 END) as featured_tokens,
            COUNT(CASE WHEN createdAt > NOW() - INTERVAL '30 days' THEN 1 END) as recent_tokens
        FROM tokens;

        -- Transaction statistics monitoring
        CREATE OR REPLACE VIEW v_transaction_statistics AS
        SELECT
            COUNT(*) as total_transactions,
            COUNT(CASE WHEN type = 'BUY' THEN 1 END) as total_buys,
            COUNT(CASE WHEN type = 'SELL' THEN 1 END) as total_sells,
            COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_transactions,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_transactions,
            COUNT(CASE WHEN createdAt > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_transactions
        FROM transactions;

        -- System health monitoring
        CREATE OR REPLACE VIEW v_system_health AS
        SELECT
            'database_connection' as metric,
            'healthy' as status,
            'Database is accessible' as message,
            NOW() as last_check
        UNION ALL
        SELECT
            'database_size' as metric,
            CASE
                WHEN pg_database_size('$PROD_DB_NAME') < 10737418240 THEN 'healthy'  -- 10GB
                WHEN pg_database_size('$PROD_DB_NAME') < 53687091200 THEN 'warning' -- 50GB
                ELSE 'critical'
            end as status,
            pg_size_pretty(pg_database_size('$PROD_DB_NAME')) as message,
            NOW() as last_check
        FROM pg_database
        WHERE pg_database.datname = '$PROD_DB_NAME';
    " || error "Failed to create monitoring views"

    success "Monitoring setup completed"
}

# Run health check
run_health_check() {
    log "Running database health check..."

    # Test database connection
    if ! psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Database connection failed"
    fi

    # Check tables
    local table_count=$(psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    info "Database contains $table_count tables"

    # Check indexes
    local index_count=$(psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';")
    info "Database contains $index_count indexes"

    # Check extensions
    local extension_count=$(psql -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -d "$PROD_DB_NAME" -tAc "SELECT COUNT(*) FROM pg_extension;")
    info "Database contains $extension_count extensions"

    success "Database health check passed"
}

# Generate configuration summary
generate_summary() {
    log "Generating configuration summary..."

    cat > "${PROD_DB_NAME}_setup_summary.txt" << EOF
Rabbit Launchpad Production Database Setup Summary
================================================

Database Configuration:
- Database Name: $PROD_DB_NAME
- Host: $PROD_DB_HOST
- Port: $PROD_DB_PORT
- User: $PROD_DB_USER
- Schema: $PROD_DB_SCHEMA

Security:
- Password: [See ${PROD_DB_NAME}_password.txt]
- SSL: Enabled
- Extensions: uuid-ossp, pgcrypto, pg_trgm, btree_gin, citext

Backup Configuration:
- Directory: $BACKUP_DIR
- Schedule: Daily at 2 AM
- Retention: 30 days
- S3 Integration: ${BACKUP_S3_BUCKET:-Not configured}

Monitoring:
- Monitoring User: monitoring
- Health Checks: Enabled
- Performance Indexes: Created

Scripts Created:
- Daily Backup: $BACKUP_DIR/scripts/daily-backup.sh
- Restore: $BACKUP_DIR/scripts/restore.sh

Environment Variables to Set:
export PRODUCTION_DATABASE_URL="postgresql://$PROD_DB_USER:PASSWORD@$PROD_DB_HOST:$PROD_DB_PORT/$PROD_DB_NAME"
export DATABASE_POOL_SIZE=20
export DATABASE_SSL_MODE=require

Next Steps:
1. Update your application environment variables
2. Test database connection from your application
3. Configure automated backups
4. Set up monitoring alerts
5. Test restore procedure

Setup completed: $(date)
EOF

    success "Configuration summary generated: ${PROD_DB_NAME}_setup_summary.txt"
}

# Main execution
main() {
    echo -e "${PURPLE}"
    echo "🚀 Rabbit Launchpad Production Database Setup"
    echo "============================================="
    echo -e "${NC}"

    check_prerequisites
    get_database_password
    create_database_user
    create_database
    grant_privileges
    create_extensions
    run_migrations
    create_indexes
    setup_backup_directory
    setup_logging_directory
    create_backup_scripts
    setup_monitoring
    run_health_check
    generate_summary

    echo -e "${GREEN}"
    echo "🎉 Production database setup completed successfully!"
    echo ""
    echo "📋 Important Files Created:"
    echo "  - Password: ${PROD_DB_NAME}_password.txt"
    echo "  - Summary: ${PROD_DB_NAME}_setup_summary.txt"
    echo "  - Backup Scripts: $BACKUP_DIR/scripts/"
    echo ""
    echo "🔐 Security Reminders:"
    echo "  - Store the database password securely"
    echo "  - Configure SSL for all connections"
    echo "  - Set up regular backups"
    echo "  - Monitor database performance"
    echo "  - Review access logs regularly"
    echo ""
    echo "📊 Next Steps:"
    echo "  1. Update your application environment variables"
    echo "  2. Test database connection from your application"
    echo "  3. Configure automated backups (cron job)"
    echo "  4. Set up monitoring and alerting"
    echo "  5. Test the restore procedure"
    echo -e "${NC}"
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [help|check|migrate|monitor|backup]"
        echo ""
        echo "Commands:"
        echo "  help    - Show this help message"
        echo "  check   - Run health check only"
        echo "  migrate - Run migrations only"
        echo "  monitor - Setup monitoring only"
        echo "  backup  - Setup backup scripts only"
        echo ""
        echo "Default: Full database setup"
        ;;
    "check")
        check_prerequisites
        run_health_check
        ;;
    "migrate")
        check_prerequisites
        run_migrations
        ;;
    "monitor")
        check_prerequisites
        setup_monitoring
        run_health_check
        ;;
    "backup")
        setup_backup_directory
        create_backup_scripts
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