#!/bin/bash

# Rabbit Launchpad Kubernetes Deployment Script
# Usage: ./scripts/deploy-k8s.sh [environment] [version] [action]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
ACTION=${3:-deploy}
PROJECT_NAME="rabbit-launchpad"
DOCKER_REGISTRY="ghcr.io"
BACKUP_DIR="/backups"
LOG_FILE="./logs/deploy-k8s.log"

# Paths
K8S_DIR="k8s"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $1" >> $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> $LOG_FILE
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] [WARNING] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> $LOG_FILE
}

# Print header
print_header() {
    echo -e "${BLUE}"
    echo "🚀 Rabbit Launchpad Kubernetes Deployment"
    echo "======================================"
    echo "Environment: $ENVIRONMENT"
    echo "Version: $VERSION"
    echo "Action: $ACTION"
    echo "======================================"
    echo -e "${NC}"
}

# Change to project root
cd "$PROJECT_ROOT"

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
        exit 1
    fi

    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        error "docker is not installed"
        exit 1
    fi

    # Check if we can access the cluster
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot access Kubernetes cluster"
        exit 1
    fi

    # Check if K8S manifests exist
    if [ ! -d "$K8S_DIR" ]; then
        error "Kubernetes manifests directory not found: $K8S_DIR"
        exit 1
    fi

    # Check if environment config exists
    if [ ! -f ".env.$ENVIRONMENT" ]; then
        error "Environment file not found: .env.$ENVIRONMENT"
        exit 1
    fi

    success "Prerequisites check passed"
}

# Validate environment
validate_environment() {
    log "Validating environment configuration..."

    case $ENVIRONMENT in
        staging|production)
            log "Environment $ENVIRONMENT is valid"
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
            exit 1
            ;;
    esac

    # Load environment variables
    source .env.$ENVIRONMENT

    # Validate required environment variables
    required_vars=("DATABASE_URL" "REDIS_URL" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done

    success "Environment validation passed"
}

# Create backup (production only)
create_backup() {
    if [ "$ENVIRONMENT" == "production" ] && [ "$ACTION" == "deploy" ]; then
        log "Creating production backup..."

        BACKUP_NAME="$PROJECT_NAME-$(date +%Y%m%d-%H%M%S)"
        BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

        mkdir -p $BACKUP_PATH

        # Backup Kubernetes resources
        log "Backing up Kubernetes resources..."
        kubectl get all -n rabbit-launchpad -o yaml > $BACKUP_PATH/k8s-resources.yaml

        # Backup database
        log "Backing up database..."
        kubectl exec -n rabbit-launchpad deployment/postgres -- \
            pg_dump -U postgres rabbit_launchpad > $BACKUP_PATH/database.sql

        # Upload to S3 (if configured)
        if [ -n "$AWS_S3_BUCKET" ]; then
            log "Uploading backup to S3..."
            aws s3 cp $BACKUP_PATH s3://$AWS_S3_BUCKET/backups/$BACKUP_NAME/ --recursive
        fi

        success "Backup created: $BACKUP_NAME"
    else
        log "Skipping backup for non-production environment or non-deploy action"
    fi
}

# Build and push Docker images
build_and_push_images() {
    if [ "$ACTION" == "deploy" ]; then
        log "Building and pushing Docker images..."

        # Build backend image
        log "Building backend image..."
        cd backend
        docker build -t $DOCKER_REGISTRY/$PROJECT_NAME-backend:$VERSION .
        docker push $DOCKER_REGISTRY/$PROJECT_NAME-backend:$VERSION
        cd ..

        # Build frontend image
        log "Building frontend image..."
        cd frontend
        docker build -t $DOCKER_REGISTRY/$PROJECT_NAME-frontend:$VERSION .
        docker push $DOCKER_REGISTRY/$PROJECT_NAME-frontend:$VERSION
        cd ..

        success "Images built and pushed successfully"
    else
        log "Skipping image build for non-deploy action"
    fi
}

# Prepare Kubernetes manifests
prepare_manifests() {
    log "Preparing Kubernetes manifests..."

    # Create environment-specific directory if it doesn't exist
    ENV_DIR="$K8S_DIR/$ENVIRONMENT"
    if [ ! -d "$ENV_DIR" ]; then
        log "Creating environment directory: $ENV_DIR"
        mkdir -p "$ENV_DIR"
        # Copy base manifests to environment directory
        cp -r "$K8S_DIR/production"/* "$ENV_DIR/"
    fi

    # Update image tags in manifests
    if [ "$ACTION" == "deploy" ]; then
        log "Updating image tags to $VERSION..."
        sed -i.bak "s|IMAGE_TAG|$VERSION|g" "$ENV_DIR/backend-deployment.yaml"
        sed -i.bak "s|IMAGE_TAG|$VERSION|g" "$ENV_DIR/frontend-deployment.yaml"

        # Remove backup files
        rm -f "$ENV_DIR"/*.bak
    fi

    success "Kubernetes manifests prepared"
}

# Deploy to Kubernetes
deploy_to_k8s() {
    log "Deploying to Kubernetes..."

    # Set context to rabbit-launchpad namespace
    kubectl config set-context --current --namespace=rabbit-launchpad

    # Apply namespace and monitoring namespace
    log "Applying namespaces..."
    kubectl apply -f "$K8S_DIR/$ENVIRONMENT/namespace.yaml"

    # Apply ConfigMaps and Secrets
    log "Applying configurations..."
    if [ -f "$K8S_DIR/$ENVIRONMENT/configmap.yaml" ]; then
        kubectl apply -f "$K8S_DIR/$ENVIRONMENT/configmap.yaml"
    fi

    # Apply Secrets (template)
    if [ -f "$K8S_DIR/$ENVIRONMENT/secrets.yaml" ]; then
        log "Note: Update secrets.yaml with actual values before applying"
        # kubectl apply -f "$K8S_DIR/$ENVIRONMENT/secrets.yaml"
    fi

    # Apply backend deployment
    log "Deploying backend services..."
    kubectl apply -f "$K8S_DIR/$ENVIRONMENT/backend-deployment.yaml"

    # Apply frontend deployment
    log "Deploying frontend services..."
    kubectl apply -f "$K8S_DIR/$ENVIRONMENT/frontend-deployment.yaml"

    # Apply ingress
    log "Applying ingress configuration..."
    kubectl apply -f "$K8S_DIR/$ENVIRONMENT/ingress.yaml"

    success "Kubernetes deployment completed"
}

# Wait for deployment rollout
wait_for_rollout() {
    log "Waiting for deployment rollout..."

    # Wait for backend deployment
    log "Waiting for backend rollout..."
    kubectl rollout status deployment/rabbit-backend --timeout=600s

    # Wait for frontend deployment
    log "Waiting for frontend rollout..."
    kubectl rollout status deployment/rabbit-frontend --timeout=300s

    # Wait for pods to be ready
    log "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=rabbit-backend --timeout=120s
    kubectl wait --for=condition=ready pod -l app=rabbit-frontend --timeout=60s

    success "Deployment rollout completed"
}

# Run health checks
run_health_checks() {
    log "Running health checks..."

    # Get service URLs
    if [ "$ENVIRONMENT" == "production" ]; then
        BASE_URL="https://rabbitlaunchpad.io"
    else
        BASE_URL="https://staging.rabbitlaunchpad.io"
    fi

    # Check backend health
    log "Checking backend health..."
    if curl -f -s "$BASE_URL/health" > /dev/null; then
        success "Backend health check passed"
    else
        error "Backend health check failed"
        return 1
    fi

    # Check frontend health
    log "Checking frontend health..."
    if curl -f -s "$BASE_URL/health" > /dev/null; then
        success "Frontend health check passed"
    else
        error "Frontend health check failed"
        return 1
    fi

    # Check database connectivity via pod
    log "Checking database connectivity..."
    if kubectl exec -n rabbit-launchpad deployment/rabbit-backend -- node dist/health-check.js; then
        success "Database connectivity check passed"
    else
        error "Database connectivity check failed"
        return 1
    fi

    success "All health checks passed"
}

# Run smoke tests
run_smoke_tests() {
    log "Running smoke tests..."

    if [ -f "$SCRIPT_DIR/smoke-tests.sh" ]; then
        chmod +x "$SCRIPT_DIR/smoke-tests.sh"
        if "$SCRIPT_DIR/smoke-tests.sh" "$ENVIRONMENT"; then
            success "Smoke tests passed"
        else
            error "Smoke tests failed"
            return 1
        fi
    else
        warning "Smoke tests script not found, skipping"
    fi
}

# Rollback deployment
rollback_deployment() {
    log "Initiating rollback..."

    if [ "$ENVIRONMENT" == "production" ]; then
        # Get previous revision
        PREVIOUS_REVISION=$(kubectl rollout history deployment/rabbit-backend -n rabbit-launchpad | tail -n 2 | head -n 1 | awk '{print $1}')

        # Rollback backend
        log "Rolling back backend to revision $PREVIOUS_REVISION..."
        kubectl rollout undo deployment/rabbit-backend -n rabbit-launchpad --to-revision=$PREVIOUS_REVISION

        # Rollback frontend
        log "Rolling back frontend..."
        kubectl rollout undo deployment/rabbit-frontend -n rabbit-launchpad --to-revision=$PREVIOUS_REVISION

        # Wait for rollback to complete
        kubectl rollout status deployment/rabbit-backend -n rabbit-launchpad --timeout=300s
        kubectl rollout status deployment/rabbit-frontend -n rabbit-launchpad --timeout=300s

        success "Rollback completed"
    else
        error "Rollback only supported for production environment"
        exit 1
    fi
}

# Scale deployment
scale_deployment() {
    local replicas=${1:-3}
    log "Scaling deployments to $replicas replicas..."

    kubectl scale deployment/rabbit-backend --replicas=$replicas -n rabbit-launchpad
    kubectl scale deployment/rabbit-frontend --replicas=2 -n rabbit-launchpad

    success "Deployment scaled successfully"
}

# Get deployment status
get_status() {
    log "Getting deployment status..."

    echo "=== Kubernetes Resources ==="
    kubectl get all -n rabbit-launchpad

    echo ""
    echo "=== Pod Status ==="
    kubectl get pods -n rabbit-launchpad

    echo ""
    echo "=== Services ==="
    kubectl get svc -n rabbit-launchpad

    echo ""
    echo "=== Ingress ==="
    kubectl get ingress -n rabbit-launchpad

    echo ""
    echo "=== HPA Status ==="
    kubectl get hpa -n rabbit-launchpad
}

# Clean up resources
cleanup() {
    log "Cleaning up old resources..."

    # Remove old Docker images
    docker image prune -f

    # Remove failed pods
    kubectl delete pods -l app=rabbit-backend -l status=Failed --ignore-not-found -n rabbit-launchpad
    kubectl delete pods -l app=rabbit-frontend -l status=Failed --ignore-not-found -n rabbit-launchpad

    # Clean up old backups (keep last 7)
    if [ -d "$BACKUP_DIR" ]; then
        find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    fi

    success "Cleanup completed"
}

# Show logs
show_logs() {
    local service=${1:-backend}
    local follow=${2:-false}

    log "Showing logs for $service..."

    case $service in
        backend)
            if [ "$follow" = "true" ]; then
                kubectl logs -f deployment/rabbit-backend -n rabbit-launchpad
            else
                kubectl logs deployment/rabbit-backend -n rabbit-launchpad --tail=100
            fi
            ;;
        frontend)
            if [ "$follow" = "true" ]; then
                kubectl logs -f deployment/rabbit-frontend -n rabbit-launchpad
            else
                kubectl logs deployment/rabbit-frontend -n rabbit-launchpad --tail=100
            fi
            ;;
        *)
            error "Unknown service: $service. Use 'backend' or 'frontend'"
            exit 1
            ;;
    esac
}

# Main deployment function
main() {
    print_header

    case $ACTION in
        deploy)
            log "Starting deployment to $ENVIRONMENT..."
            check_prerequisites
            validate_environment
            create_backup
            build_and_push_images
            prepare_manifests
            deploy_to_k8s
            wait_for_rollout

            # Run health checks
            if ! run_health_checks; then
                error "Health checks failed, initiating rollback..."
                rollback_deployment
                exit 1
            fi

            # Run smoke tests
            if ! run_smoke_tests; then
                error "Smoke tests failed, initiating rollback..."
                rollback_deployment
                exit 1
            fi

            cleanup
            success "Deployment to $ENVIRONMENT completed successfully!"
            ;;
        rollback)
            log "Starting rollback for $ENVIRONMENT..."
            check_prerequisites
            rollback_deployment
            ;;
        status)
            check_prerequisites
            get_status
            ;;
        logs)
            check_prerequisites
            show_logs $2 $3
            ;;
        scale)
            check_prerequisites
            scale_deployment $2
            ;;
        cleanup)
            check_prerequisites
            cleanup
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

# Help function
show_help() {
    echo "Rabbit Launchpad Kubernetes Deployment Script"
    echo "============================================="
    echo ""
    echo "Usage: $0 [environment] [version] [action] [options]"
    echo ""
    echo "Environment:"
    echo "  staging     Deploy to staging environment"
    echo "  production  Deploy to production environment"
    echo ""
    echo "Version:"
    echo "  latest      Use latest image (default)"
    echo "  v1.0.0      Use specific version tag"
    echo ""
    echo "Actions:"
    echo "  deploy      Deploy application (default)"
    echo "  rollback    Rollback to previous version"
    echo "  status      Show deployment status"
    echo "  logs        Show service logs"
    echo "  scale       Scale deployments"
    echo "  cleanup     Clean up old resources"
    echo ""
    echo "Examples:"
    echo "  $0 staging latest deploy                    # Deploy latest to staging"
    echo "  $0 production v1.2.0 deploy                # Deploy v1.2.0 to production"
    echo "  $0 production rollback                    # Rollback production deployment"
    echo "  $0 staging status                          # Show staging status"
    echo "  $0 staging logs backend                  # Show backend logs"
    echo "  $0 staging logs backend true              # Follow backend logs"
    echo "  $0 production scale 5                     # Scale production to 5 replicas"
    echo "  $0 staging cleanup                       # Clean up staging resources"
    echo ""
    echo "Prerequisites:"
    echo "  - kubectl configured and accessible"
    echo "  - docker installed and logged in to registry"
    echo "  - .env.[environment] file with proper configuration"
    echo "  - Kubernetes cluster access"
}

# Handle help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Validate arguments
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

# Run main function
main "$@"