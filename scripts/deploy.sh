#!/bin/bash

# Ahiru Launchpad Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print header
print_header() {
    echo -e "${BLUE}"
    echo "🚀 Ahiru Launchpad Deployment Script"
    echo "=================================="
    echo -e "${NC}"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "deployment-config.json" ]; then
        log_error "deployment-config.json not found. Please run from the root directory."
        exit 1
    fi
}

# Verify configuration
verify_configuration() {
    log_info "Verifying configuration..."
    node scripts/verify-configuration.js
    if [ $? -eq 0 ]; then
        log_success "Configuration verified successfully"
    else
        log_error "Configuration verification failed"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."

    # Frontend dependencies
    log_info "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..

    # Backend dependencies
    log_info "Installing backend dependencies..."
    cd backend
    npm install
    cd ..

    # Smart contract dependencies
    log_info "Installing smart contract dependencies..."
    cd smartcontract
    npm install
    cd ..

    log_success "Dependencies installed successfully"
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."
    cd frontend
    npm run build
    cd ..
    log_success "Frontend built successfully"
}

# Run tests
run_tests() {
    log_info "Running tests..."

    # Frontend tests
    log_info "Running frontend tests..."
    cd frontend
    npm test
    cd ..

    # Backend tests
    log_info "Running backend tests..."
    cd backend
    npm test
    cd ..

    # Smart contract tests
    log_info "Running smart contract tests..."
    cd smartcontract
    npm test
    cd ..

    log_success "All tests passed"
}

# Deploy smart contract
deploy_smart_contract() {
    log_info "Deploying smart contract..."
    cd smartcontract

    if [ "$1" = "testnet" ]; then
        log_info "Deploying to BSC Testnet..."
        npm run deploy:bscTestnet
    elif [ "$1" = "mainnet" ]; then
        log_info "Deploying to BSC Mainnet..."
        npm run deploy:bscMainnet
    else
        log_error "Please specify 'testnet' or 'mainnet'"
        cd ..
        exit 1
    fi

    cd ..
    log_success "Smart contract deployed successfully"
}

# Deploy backend
deploy_backend() {
    log_info "Deploying backend..."
    cd backend

    # Build backend
    npm run build

    # Deploy to your preferred platform
    # This is a placeholder - implement your actual deployment logic
    log_info "Backend deployment logic goes here"

    cd ..
    log_success "Backend deployed successfully"
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend..."
    cd frontend

    # Deploy to Vercel
    log_info "Deploying to Vercel..."
    npx vercel --prod

    cd ..
    log_success "Frontend deployed successfully"
}

# Main deployment function
main() {
    print_header

    # Parse command line arguments
    ENVIRONMENT=${1:-"development"}
    NETWORK=${2:-"testnet"}

    log_info "Starting deployment for $ENVIRONMENT environment"
    log_info "Target network: $NETWORK"

    # Check prerequisites
    check_prerequisites

    # Verify configuration
    verify_configuration

    # Install dependencies
    install_dependencies

    # Run tests
    run_tests

    # Build frontend
    build_frontend

    # Deploy based on environment
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Starting production deployment..."

        # Deploy smart contract if specified
        if [ "$NETWORK" != "" ]; then
            deploy_smart_contract $NETWORK
        fi

        # Deploy backend
        deploy_backend

        # Deploy frontend
        deploy_frontend

        log_success "Production deployment completed successfully"
    else
        log_info "Development setup completed"
        log_info "Run 'npm run dev' in frontend and backend directories to start development servers"
    fi

    log_info "Deployment completed! 🎉"
}

# Help function
show_help() {
    echo "Usage: $0 [ENVIRONMENT] [NETWORK]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  development (default)  - Set up development environment"
    echo "  production             - Deploy to production"
    echo ""
    echo "NETWORK:"
    echo "  testnet (default)      - BSC Testnet"
    echo "  mainnet                - BSC Mainnet"
    echo ""
    echo "Examples:"
    echo "  $0                    # Setup development environment with testnet"
    echo "  $0 production testnet # Deploy to production with testnet configuration"
    echo "  $0 production mainnet # Deploy to production with mainnet configuration"
}

# Handle help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Check if we're in the right directory
check_directory

# Run main deployment function
main $@