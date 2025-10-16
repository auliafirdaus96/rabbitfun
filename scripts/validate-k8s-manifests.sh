#!/bin/bash

# Rabbit Launchpad K8S Manifests Validation Script
# Usage: ./scripts/validate-k8s-manifests.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-staging}
PROJECT_NAME="rabbit-launchpad"
NAMESPACE="rabbit-launchpad"
K8S_DIR="k8s"

# Logging functions
log() {
    echo -e "${BLUE}[VALIDATE] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Print header
print_header() {
    echo -e "${BLUE}"
    echo "🔍 Rabbit Launchpad K8S Manifests Validation"
    echo "============================================="
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo "============================================="
    echo -e "${NC}"
}

# Validate YAML syntax
validate_yaml_syntax() {
    log "Validating YAML syntax..."

    local failed_files=0
    local yaml_files=$(find "$K8S_DIR/$ENVIRONMENT" -name "*.yaml" -o -name "*.yml" 2>/dev/null)

    if [ -z "$yaml_files" ]; then
        error "No YAML files found in $K8S_DIR/$ENVIRONMENT"
        return 1
    fi

    for file in $yaml_files; do
        log "Validating: $file"
        if grep -q "^apiVersion:" "$file" && grep -q "^kind:" "$file"; then
            success "✓ $file: Valid YAML syntax"
        else
            error "✗ $file: Invalid YAML syntax"
            ((failed_files++))
        fi
    done

    if [ $failed_files -eq 0 ]; then
        success "All YAML files have valid syntax"
        return 0
    else
        error "$failed_files files have invalid YAML syntax"
        return 1
    fi
}

# Validate required manifests exist
validate_required_manifests() {
    log "Validating required manifests..."

    local required_files=(
        "namespace.yaml"
        "configmap.yaml"
        "secrets.yaml"
        "backend-deployment.yaml"
        "frontend-deployment.yaml"
        "ingress.yaml"
    )

    local missing_files=0

    for file in "${required_files[@]}"; do
        if [ -f "$K8S_DIR/$ENVIRONMENT/$file" ]; then
            success "✓ $file: Found"
        else
            error "✗ $file: Missing"
            ((missing_files++))
        fi
    done

    if [ $missing_files -eq 0 ]; then
        success "All required manifests are present"
        return 0
    else
        error "$missing_files required files are missing"
        return 1
    fi
}

# Validate namespace configuration
validate_namespace() {
    log "Validating namespace configuration..."

    local namespace_file="$K8S_DIR/$ENVIRONMENT/namespace.yaml"

    if [ ! -f "$namespace_file" ]; then
        error "Namespace manifest not found"
        return 1
    fi

    # Check if namespace is correctly set
    if grep -q "name: $NAMESPACE" "$namespace_file"; then
        success "✓ Namespace name is correct: $NAMESPACE"
    else
        error "✗ Namespace name is incorrect or missing"
        return 1
    fi

    # Check environment label
    if grep -q "environment: $ENVIRONMENT" "$namespace_file"; then
        success "✓ Environment label is correct: $ENVIRONMENT"
    else
        error "✗ Environment label is incorrect or missing"
        return 1
    fi

    return 0
}

# Validate deployments
validate_deployments() {
    log "Validating deployments..."

    local deployments=( "backend-deployment.yaml" "frontend-deployment.yaml" )
    local failed_deployments=0

    for deployment in "${deployments[@]}"; do
        local deployment_file="$K8S_DIR/$ENVIRONMENT/$deployment"

        if [ ! -f "$deployment_file" ]; then
            error "Deployment file not found: $deployment"
            ((failed_deployments++))
            continue
        fi

        log "Validating: $deployment"

        # Check namespace
        if grep -q "namespace: $NAMESPACE" "$deployment_file"; then
            success "✓ Namespace is correct"
        else
            error "✗ Namespace is incorrect or missing"
            ((failed_deployments++))
            continue
        fi

        # Check environment labels
        if grep -q "environment: $ENVIRONMENT" "$deployment_file"; then
            success "✓ Environment labels are correct"
        else
            error "✗ Environment labels are incorrect or missing"
            ((failed_deployments++))
            continue
        fi

        # Check image tag placeholder
        if grep -q "IMAGE_TAG" "$deployment_file"; then
            success "✓ Image tag placeholder found"
        else
            warning "⚠ Image tag placeholder not found"
        fi

        # Check resource limits
        if grep -q "resources:" "$deployment_file"; then
            success "✓ Resource limits are configured"
        else
            warning "⚠ Resource limits not configured"
        fi

        # Check liveness/readiness probes
        if grep -q "livenessProbe\|readinessProbe" "$deployment_file"; then
            success "✓ Health probes are configured"
        else
            warning "⚠ Health probes not configured"
        fi
    done

    if [ $failed_deployments -eq 0 ]; then
        success "All deployments are valid"
        return 0
    else
        error "$failed_deployments deployments have validation errors"
        return 1
    fi
}

# Validate services
validate_services() {
    log "Validating services..."

    # Services are typically defined in deployment files or separate service files
    local deployment_files=$(find "$K8S_DIR/$ENVIRONMENT" -name "*deployment.yaml")
    local failed_services=0

    for file in $deployment_files; do
        log "Checking service configuration in: $(basename $file)"

        # Check if service selector matches deployment labels
        if grep -q "app: rabbit-" "$file"; then
            success "✓ Service selector labels found"
        else
            warning "⚠ Service selector labels not found"
        fi

        # Check port configuration
        if grep -q "containerPort:\|port:" "$file"; then
            success "✓ Port configuration found"
        else
            warning "⚠ Port configuration not found"
        fi
    done

    return 0
}

# Validate ingress
validate_ingress() {
    log "Validating ingress configuration..."

    local ingress_file="$K8S_DIR/$ENVIRONMENT/ingress.yaml"

    if [ ! -f "$ingress_file" ]; then
        error "Ingress manifest not found"
        return 1
    fi

    # Check namespace
    if grep -q "namespace: $NAMESPACE" "$ingress_file"; then
        success "✓ Ingress namespace is correct"
    else
        error "✗ Ingress namespace is incorrect or missing"
        return 1
    fi

    # Check host configuration
    if grep -q "host:" "$ingress_file"; then
        success "✓ Host configuration found"
        local hosts=$(grep -A 5 "host:" "$ingress_file" | grep "host:" | awk '{print $2}')
        for host in $hosts; do
            log "  - Host: $host"
        done
    else
        error "✗ Host configuration not found"
        return 1
    fi

    # Check TLS configuration
    if grep -q "tls:" "$ingress_file"; then
        success "✓ TLS configuration found"
    else
        warning "⚠ TLS configuration not found"
    fi

    # Check backend services
    if grep -q "name: rabbit-backend\|name: rabbit-frontend" "$ingress_file"; then
        success "✓ Backend services are configured"
    else
        error "✗ Backend services not configured"
        return 1
    fi

    return 0
}

# Validate ConfigMap
validate_configmap() {
    log "Validating ConfigMap..."

    local configmap_file="$K8S_DIR/$ENVIRONMENT/configmap.yaml"

    if [ ! -f "$configmap_file" ]; then
        error "ConfigMap manifest not found"
        return 1
    fi

    # Check namespace
    if grep -q "namespace: $NAMESPACE" "$configmap_file"; then
        success "✓ ConfigMap namespace is correct"
    else
        error "✗ ConfigMap namespace is incorrect or missing"
        return 1
    fi

    # Check required environment variables
    local required_vars=( "NODE_ENV" "PORT" "LOG_LEVEL" )
    local missing_vars=0

    for var in "${required_vars[@]}"; do
        if grep -q "$var:" "$configmap_file"; then
            success "✓ Environment variable $var is configured"
        else
            error "✗ Environment variable $var is missing"
            ((missing_vars++))
        fi
    done

    # Check NODE_ENV value
    if grep -q "NODE_ENV: \"$ENVIRONMENT\"" "$configmap_file"; then
        success "✓ NODE_ENV is correctly set to $ENVIRONMENT"
    else
        error "✗ NODE_ENV is not correctly set to $ENVIRONMENT"
        ((missing_vars++))
    fi

    if [ $missing_vars -eq 0 ]; then
        success "ConfigMap validation passed"
        return 0
    else
        error "$missing_vars ConfigMap validation errors"
        return 1
    fi
}

# Validate Secrets
validate_secrets() {
    log "Validating Secrets..."

    local secrets_file="$K8S_DIR/$ENVIRONMENT/secrets.yaml"

    if [ ! -f "$secrets_file" ]; then
        error "Secrets manifest not found"
        return 1
    fi

    # Check namespace
    if grep -q "namespace: $NAMESPACE" "$secrets_file"; then
        success "✓ Secrets namespace is correct"
    else
        error "✗ Secrets namespace is incorrect or missing"
        return 1
    fi

    # Check if secret keys are placeholder (not actual values)
    local placeholder_count=$(grep -c "CHANGE-ME\|your-\|placeholder" "$secrets_file" || echo "0")
    if [ "$placeholder_count" -gt 0 ]; then
        warning "⚠ $placeholder_count placeholder values found in secrets"
        warning "  Make sure to replace with actual values before deployment"
    else
        success "✓ No placeholder values found in secrets"
    fi

    return 0
}

# Check environment-specific settings
validate_environment_settings() {
    log "Validating environment-specific settings..."

    local configmap_file="$K8S_DIR/$ENVIRONMENT/configmap.yaml"

    # Check replica counts based on environment
    local backend_replicas=$(grep -A 1 "replicas:" "$K8S_DIR/$ENVIRONMENT/backend-deployment.yaml" | tail -1 | tr -d ' ')
    local frontend_replicas=$(grep -A 1 "replicas:" "$K8S_DIR/$ENVIRONMENT/frontend-deployment.yaml" | tail -1 | tr -d ' ')

    case $ENVIRONMENT in
        staging)
            if [ "$backend_replicas" = "2" ] || [ "$backend_replicas" = "1" ]; then
                success "✓ Backend replicas appropriate for staging: $backend_replicas"
            else
                warning "⚠ Backend replicas might be too high for staging: $backend_replicas"
            fi

            if [ "$frontend_replicas" = "1" ]; then
                success "✓ Frontend replicas appropriate for staging: $frontend_replicas"
            else
                warning "⚠ Frontend replicas might be too high for staging: $frontend_replicas"
            fi

            # Check log level for staging
            if grep -q "LOG_LEVEL: \"debug\"" "$configmap_file"; then
                success "✓ Log level set to debug for staging"
            else
                warning "⚠ Log level should be debug for staging"
            fi
            ;;
        production)
            if [ "$backend_replicas" -ge 3 ]; then
                success "✓ Backend replicas appropriate for production: $backend_replicas"
            else
                warning "⚠ Backend replicas might be too low for production: $backend_replicas"
            fi

            if [ "$frontend_replicas" -ge 2 ]; then
                success "✓ Frontend replicas appropriate for production: $frontend_replicas"
            else
                warning "⚠ Frontend replicas might be too low for production: $frontend_replicas"
            fi

            # Check log level for production
            if grep -q "LOG_LEVEL: \"info\"" "$configmap_file"; then
                success "✓ Log level set to info for production"
            else
                warning "⚠ Log level should be info for production"
            fi
            ;;
    esac

    return 0
}

# Generate validation report
generate_report() {
    log "Generating validation report..."

    local report_file="k8s-validation-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).txt"

    {
        echo "Rabbit Launchpad K8S Manifests Validation Report"
        echo "================================================="
        echo "Environment: $ENVIRONMENT"
        echo "Timestamp: $(date)"
        echo "Namespace: $NAMESPACE"
        echo ""

        echo "=== Manifest Files ==="
        find "$K8S_DIR/$ENVIRONMENT" -name "*.yaml" -o -name "*.yml" | sort
        echo ""

        echo "=== Configuration Summary ==="
        echo "Namespace: $NAMESPACE"
        echo "Environment: $ENVIRONMENT"
        echo "Backend Replicas: $(grep -A 1 'replicas:' "$K8S_DIR/$ENVIRONMENT/backend-deployment.yaml" | tail -1 | tr -d ' ')"
        echo "Frontend Replicas: $(grep -A 1 'replicas:' "$K8S_DIR/$ENVIRONMENT/frontend-deployment.yaml" | tail -1 | tr -d ' ')"
        echo "NODE_ENV: $(grep 'NODE_ENV:' "$K8S_DIR/$ENVIRONMENT/configmap.yaml" | awk '{print $2}')"
        echo "LOG_LEVEL: $(grep 'LOG_LEVEL:' "$K8S_DIR/$ENVIRONMENT/configmap.yaml" | awk '{print $2}')"
        echo ""

        echo "=== Ingress Hosts ==="
        grep 'host:' "$K8S_DIR/$ENVIRONMENT/ingress.yaml" | awk '{print "- " $2}'
        echo ""

        echo "=== Security Configuration ==="
        echo "TLS Configured: $(grep -q 'tls:' "$K8S_DIR/$ENVIRONMENT/ingress.yaml" && echo 'Yes' || echo 'No')"
        echo "Resource Limits: $(grep -q 'resources:' "$K8S_DIR/$ENVIRONMENT/backend-deployment.yaml" && echo 'Yes' || echo 'No')"
        echo "Health Probes: $(grep -q 'livenessProbe\|readinessProbe' "$K8S_DIR/$ENVIRONMENT/backend-deployment.yaml" && echo 'Yes' || echo 'No')"

    } > "$report_file"

    success "Validation report generated: $report_file"
}

# Main validation function
main() {
    print_header

    local validation_steps=(
        "validate_yaml_syntax"
        "validate_required_manifests"
        "validate_namespace"
        "validate_deployments"
        "validate_services"
        "validate_ingress"
        "validate_configmap"
        "validate_secrets"
        "validate_environment_settings"
    )

    local failed_steps=0

    for step in "${validation_steps[@]}"; do
        if ! $step; then
            ((failed_steps++))
        fi
        echo ""
    done

    # Generate report
    generate_report

    echo ""
    echo "============================================="
    if [ $failed_steps -eq 0 ]; then
        echo -e "${GREEN}✅ All validation checks passed!${NC}"
        echo "🎉 K8S manifests are ready for deployment."
    else
        echo -e "${RED}❌ $failed_steps validation checks failed!${NC}"
        echo "Please review the failed checks and fix the issues."
        exit 1
    fi
    echo "============================================="
}

# Help function
show_help() {
    echo "Rabbit Launchpad K8S Manifests Validation Script"
    echo "=================================================="
    echo ""
    echo "Usage: $0 [environment]"
    echo ""
    echo "Environment:"
    echo "  staging     Validate staging manifests (default)"
    echo "  production  Validate production manifests"
    echo ""
    echo "Examples:"
    echo "  $0                # Validate staging manifests"
    echo "  $0 production    # Validate production manifests"
    echo ""
    echo "Validation Checks:"
    echo "  ✓ YAML syntax validation"
    echo "  ✓ Required manifests presence"
    echo "  ✓ Namespace configuration"
    echo "  ✓ Deployment configuration"
    echo "  ✓ Service configuration"
    echo "  ✓ Ingress configuration"
    echo "  ✓ ConfigMap validation"
    echo "  ✓ Secrets validation"
    echo "  ✓ Environment-specific settings"
}

# Handle help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run main function
main "$@"