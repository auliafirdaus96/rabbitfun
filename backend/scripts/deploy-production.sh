#!/bin/bash

# ==============================================
# Rabbit Launchpad - Production Deployment Script
# ==============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Configuration
PROJECT_NAME="rabbit-launchpad"
BACKUP_DIR="./backups"
LOG_DIR="./logs"
ENV_FILE=".env.production"

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."

    # Check if running as root (for production deployments)
    if [[ $EUID -eq 0 ]]; then
        error "Please do not run this script as root. Use a non-root user with sudo privileges."
    fi

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        warn "PM2 is not installed. Installing PM2..."
        npm install -g pm2
    fi

    # Check if Node.js version is compatible
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 18 ]]; then
        error "Node.js version 18 or higher is required. Current version: $(node --version)"
    fi

    # Check if required files exist
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Production environment file $ENV_FILE does not exist. Please create it from .env.production.example"
    fi

    # Check if git repository is clean
    if [[ -n $(git status --porcelain) ]]; then
        warn "Git repository has uncommitted changes. Consider committing before deployment."
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Deployment cancelled due to uncommitted changes."
        fi
    fi

    log "Prerequisites check completed."
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."

    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "./uploads"
    mkdir -p "./nginx/ssl"

    log "Directories created."
}

# Backup current deployment
backup_current_deployment() {
    log "Creating backup of current deployment..."

    if [[ -d "dist" ]]; then
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" dist/ logs/ uploads/ || warn "Could not create backup file."
        log "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    else
        warn "No existing deployment found to backup."
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing production dependencies..."

    npm ci --only=production
    npm cache clean --force

    log "Dependencies installed."
}

# Build application
build_application() {
    log "Building application for production..."

    # Clean previous build
    if [[ -d "dist" ]]; then
        rm -rf dist
    fi

    # Generate Prisma client
    npx prisma generate

    # Build TypeScript
    npm run build

    # Verify build
    if [[ ! -f "dist/server.js" ]]; then
        error "Build failed - dist/server.js not found"
    fi

    log "Application built successfully."
}

# Run database migrations
run_database_migrations() {
    log "Running database migrations..."

    # Check if PostgreSQL is available
    if docker ps | grep -q "postgres"; then
        log "PostgreSQL container is running."
    else
        log "Starting PostgreSQL container..."
        docker-compose -f docker-compose.prod.yml up -d postgres
        sleep 10
    fi

    # Run migrations
    npx prisma migrate deploy

    log "Database migrations completed."
}

# Deploy with PM2
deploy_with_pm2() {
    log "Deploying application with PM2..."

    # Stop existing PM2 processes
    if pm2 list | grep -q "$PROJECT_NAME"; then
        log "Stopping existing PM2 processes..."
        pm2 delete all
    fi

    # Start with PM2
    pm2 start ecosystem.config.prod.js --env production

    # Save PM2 configuration
    pm2 save

    # Setup PM2 startup script
    pm2 startup

    log "Application deployed with PM2."
}

# Deploy with Docker
deploy_with_docker() {
    log "Deploying application with Docker..."

    # Build Docker image
    docker build -f Dockerfile.prod -t rabbit-launchpad:latest .

    # Stop existing containers
    docker-compose -f docker-compose.prod.yml down

    # Start new containers
    docker-compose -f docker-compose.prod.yml up -d

    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30

    # Check if API is responding
    API_HEALTH=$(curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo "unknown")
    if [[ "$API_HEALTH" == "OK" ]]; then
        log "Docker deployment successful - API is healthy"
    else
        error "Docker deployment failed - API health check failed"
    fi

    log "Docker deployment completed."
}

# Run health checks
run_health_checks() {
    log "Running health checks..."

    # Check API health
    API_STATUS=$(curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo "unknown")
    if [[ "$API_STATUS" == "OK" ]]; then
        log "✅ API health check passed"
    else
        warn "⚠️  API health check failed - Status: $API_STATUS"
    fi

    # Check database connection
    DB_STATUS=$(curl -s http://localhost:3001/health | jq -r '.services.database' 2>/dev/null || echo "unknown")
    if [[ "$DB_STATUS" == "connected" ]]; then
        log "✅ Database health check passed"
    else
        warn "⚠️  Database health check failed - Status: $DB_STATUS"
    fi

    # Check Redis connection
    REDIS_STATUS=$(curl -s http://localhost:3001/health | jq -r '.services.redis' 2>/dev/null || echo "unknown")
    if [[ "$REDIS_STATUS" == "connected" ]]; then
        log "✅ Redis health check passed"
    else
        warn "⚠️  Redis health check failed - Status: $REDIS_STATUS"
    fi

    log "Health checks completed."
}

# Display deployment information
display_deployment_info() {
    log "Deployment completed successfully!"
    log ""
    log "🌐 Application Information:"
    log "   - API URL: http://localhost:3001"
    log "   - Health Check: http://localhost:3001/health"
    log "   - API Docs: http://localhost:3001/api"
    log ""
    log "🔧 Management Commands:"
    log "   - PM2 Status: pm2 status"
    log "   - PM2 Logs: pm2 logs"
    log "   - PM2 Restart: pm2 restart all"
    log "   - Docker Status: docker-compose ps"
    log "   - Docker Logs: docker-compose logs -f"
    log ""
    log "📊 Monitoring:"
    log "   - PM2 Monitoring: pm2 monit"
    log "   - Check logs: tail -f $LOG_DIR/combined.log"
    log ""
    log "🛡️  Security Reminders:"
    log "   - Ensure all secrets are properly set"
    log "   - Check SSL certificates are valid"
    log "   - Review rate limiting configuration"
    log "   - Monitor error logs regularly"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    # Add any cleanup tasks here
    log "Cleanup completed."
}

# Main deployment function
main() {
    log "🚀 Starting Rabbit Launchpad Production Deployment"
    log "================================================"

    # Trap cleanup on exit
    trap cleanup EXIT

    # Parse command line arguments
    DEPLOYMENT_METHOD=${1:-"pm2"}

    case $DEPLOYMENT_METHOD in
        "pm2")
            log "Deployment method: PM2"
            ;;
        "docker")
            log "Deployment method: Docker"
            ;;
        "docker-compose")
            log "Deployment method: Docker Compose"
            DEPLOYMENT_METHOD="docker"
            ;;
        *)
            error "Invalid deployment method. Use 'pm2' or 'docker'"
            ;;
    esac

    # Run deployment steps
    check_prerequisites
    create_directories
    backup_current_deployment
    install_dependencies
    build_application

    if [[ $DEPLOYMENT_METHOD == "pm2" ]]; then
        run_database_migrations
        deploy_with_pm2
    else
        deploy_with_docker
    fi

    run_health_checks
    display_deployment_info

    log "🎉 Deployment completed successfully!"
}

# Script usage
usage() {
    echo "Usage: $0 [deployment_method]"
    echo ""
    echo "Deployment methods:"
    echo "  pm2           - Deploy using PM2 (default)"
    echo "  docker        - Deploy using Docker"
    echo "  docker-compose - Deploy using Docker Compose (same as docker)"
    echo ""
    echo "Examples:"
    echo "  $0           # Deploy using PM2 (default)"
    echo "  $0 pm2       # Deploy using PM2"
    echo "  $0 docker     # Deploy using Docker"
}

# Check for help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@"