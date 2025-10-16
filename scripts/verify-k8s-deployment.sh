#!/bin/bash

# Rabbit Launchpad K8S Deployment Verification Script
# Usage: ./scripts/verify-k8s-deployment.sh [environment]

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

# Logging functions
log() {
    echo -e "${BLUE}[VERIFY] $1${NC}"
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
    echo "🔍 Rabbit Launchpad K8S Deployment Verification"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo "=========================================="
    echo -e "${NC}"
}

# Verify prerequisites
verify_prerequisites() {
    log "Verifying prerequisites..."

    # Check kubectl access
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot access Kubernetes cluster"
        return 1
    fi

    # Check if namespace exists
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        error "Namespace $NAMESPACE does not exist"
        return 1
    fi

    success "Prerequisites verified"
}

# Verify deployments
verify_deployments() {
    log "Verifying deployments..."

    local deployments=("rabbit-backend" "rabbit-frontend")
    local failed_deployments=0

    for deployment in "${deployments[@]}"; do
        log "Checking deployment: $deployment"

        # Check if deployment exists
        if ! kubectl get deployment $deployment -n $NAMESPACE &> /dev/null; then
            error "Deployment $deployment not found"
            ((failed_deployments++))
            continue
        fi

        # Check deployment status
        local status=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
        local replicas=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.replicas}')

        if [ "$status" = "$replicas" ] && [ "$status" -gt 0 ]; then
            success "✓ $deployment: $status/$replicas replicas ready"
        else
            error "✗ $deployment: $status/$replicas replicas ready"
            ((failed_deployments++))
        fi
    done

    if [ $failed_deployments -eq 0 ]; then
        success "All deployments verified"
        return 0
    else
        error "$failed_deployments deployments failed verification"
        return 1
    fi
}

# Verify pods
verify_pods() {
    log "Verifying pods..."

    local failed_pods=0
    local total_pods=$(kubectl get pods -n $NAMESPACE --no-headers | wc -l)

    if [ "$total_pods" -eq 0 ]; then
        error "No pods found in namespace $NAMESPACE"
        return 1
    fi

    log "Found $total_pods pods"

    # Check pod status
    while IFS= read -r pod; do
        local pod_name=$(echo "$pod" | awk '{print $1}')
        local pod_status=$(echo "$pod" | awk '{print $3}')
        local pod_ready=$(echo "$pod" | awk '{print $2}')

        if [ "$pod_status" = "Running" ] && [ "$pod_ready" = "1/1" ]; then
            success "✓ Pod $pod_name: $pod_status ($pod_ready)"
        elif [ "$pod_status" = "Running" ]; then
            warning "⚠ Pod $pod_name: $pod_status ($pod_ready) - Not ready"
        else
            error "✗ Pod $pod_name: $pod_status ($pod_ready)"
            ((failed_pods++))
        fi
    done < <(kubectl get pods -n $NAMESPACE --no-headers)

    if [ $failed_pods -eq 0 ]; then
        success "All pods verified"
        return 0
    else
        error "$failed_pods pods failed verification"
        return 1
    fi
}

# Verify services
verify_services() {
    log "Verifying services..."

    local services=("rabbit-backend" "rabbit-frontend")
    local failed_services=0

    for service in "${services[@]}"; do
        log "Checking service: $service"

        if ! kubectl get service $service -n $NAMESPACE &> /dev/null; then
            error "Service $service not found"
            ((failed_services++))
            continue
        fi

        # Check service type and ports
        local service_type=$(kubectl get service $service -n $NAMESPACE -o jsonpath='{.spec.type}')
        local ports=$(kubectl get service $service -n $NAMESPACE -o jsonpath='{.spec.ports[*].port}')

        success "✓ $service: $service_type (ports: $ports)"
    done

    if [ $failed_services -eq 0 ]; then
        success "All services verified"
        return 0
    else
        error "$failed_services services failed verification"
        return 1
    fi
}

# Verify ingress
verify_ingress() {
    log "Verifying ingress..."

    if ! kubectl get ingress -n $NAMESPACE &> /dev/null; then
        warning "No ingress found in namespace $NAMESPACE"
        return 0
    fi

    local ingress_name=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    local ingress_host=$(kubectl get ingress $ingress_name -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
    local ingress_class=$(kubectl get ingress $ingress_name -n $NAMESPACE -o jsonpath='{.spec.ingressClassName}')

    success "✓ Ingress: $ingress_name (host: $ingress_host, class: $ingress_class)"

    # Check TLS if configured
    local tls_enabled=$(kubectl get ingress $ingress_name -n $NAMESPACE -o jsonpath='{.spec.tls}')
    if [ -n "$tls_enabled" ]; then
        success "✓ TLS enabled for ingress"
    else
        warning "⚠ TLS not configured for ingress"
    fi

    return 0
}

# Verify persistent volumes
verify_persistent_volumes() {
    log "Verifying persistent volumes..."

    local failed_pvs=0

    # Check PVCs
    local pvcs=$(kubectl get pvc -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    if [ "$pvcs" -gt 0 ]; then
        log "Found $pvcs PVCs"

        while IFS= read -r pvc; do
            local pvc_name=$(echo "$pvc" | awk '{print $1}')
            local pvc_status=$(echo "$pvc" | awk '{print $2}')
            local pvc_capacity=$(echo "$pvc" | awk '{print $3}')

            if [ "$pvc_status" = "Bound" ]; then
                success "✓ PVC $pvc_name: $pvc_status ($pvc_capacity)"
            else
                error "✗ PVC $pvc_name: $pvc_status ($pvc_capacity)"
                ((failed_pvs++))
            fi
        done < <(kubectl get pvc -n $NAMESPACE --no-headers)
    else
        log "No PVCs found"
    fi

    if [ $failed_pvs -eq 0 ]; then
        success "All persistent volumes verified"
        return 0
    else
        error "$failed_pvs PVCs failed verification"
        return 1
    fi
}

# Verify horizontal pod autoscalers
verify_hpas() {
    log "Verifying HPAs..."

    local failed_hpas=0

    if ! kubectl get hpa -n $NAMESPACE &> /dev/null; then
        log "No HPAs found in namespace $NAMESPACE"
        return 0
    fi

    while IFS= read -r hpa; do
        local hpa_name=$(echo "$hpa" | awk '{print $1}')
        local hpa_min=$(echo "$hpa" | awk '{print $3}')
        local hpa_max=$(echo "$hpa" | awk '{print $4}')
        local hpa_current=$(echo "$hpa" | awk '{print $2}')

        success "✓ HPA $hpa_name: $hpa_current/$hpa_min-$hpa_max replicas"
    done < <(kubectl get hpa -n $NAMESPACE --no-headers)

    return 0
}

# Verify resource usage
verify_resource_usage() {
    log "Checking resource usage..."

    # Check CPU and memory usage
    log "CPU and Memory Usage:"
    kubectl top pods -n $NAMESPACE --no-headers 2>/dev/null || {
        warning "Metrics server not available, skipping resource usage check"
        return 0
    }

    local high_cpu_pods=0
    local high_memory_pods=0

    while IFS= read -r line; do
        local pod_name=$(echo "$line" | awk '{print $1}')
        local cpu_cores=$(echo "$line" | awk '{print $2}')
        local memory=$(echo "$line" | awk '{print $3}')

        # Convert CPU cores to mCPU
        local cpu_mcpu=0
        if [[ $cpu_cores == *m ]]; then
            cpu_mcpu=${cpu_cores%m}
        else
            cpu_mcpu=$(echo "$cpu_cores * 1000" | bc 2>/dev/null || echo "0")
        fi

        # Check for high CPU usage (>500m)
        if [ "$cpu_mcpu" -gt 500 ]; then
            warning "⚠ Pod $pod_name has high CPU usage: $cpu_cores"
            ((high_cpu_pods++))
        fi

        # Check for high memory usage (>500Mi)
        local memory_mb=0
        if [[ $memory == *Mi ]]; then
            memory_mb=${memory%Mi}
        elif [[ $memory == *Gi ]]; then
            memory_mb=$(echo "${memory%Gi} * 1024" | bc 2>/dev/null || echo "0")
        fi

        if [ "$memory_mb" -gt 500 ]; then
            warning "⚠ Pod $pod_name has high memory usage: $memory"
            ((high_memory_pods++))
        fi

    done < <(kubectl top pods -n $NAMESPACE --no-headers)

    if [ "$high_cpu_pods" -eq 0 ] && [ "$high_memory_pods" -eq 0 ]; then
        success "Resource usage looks normal"
    else
        warning "$high_cpu_pods pods with high CPU, $high_memory_pods pods with high memory"
    fi

    return 0
}

# Verify network connectivity
verify_network_connectivity() {
    log "Verifying network connectivity..."

    # Test internal service connectivity
    local backend_service="rabbit-backend.$NAMESPACE.svc.cluster.local:3001"
    local frontend_service="rabbit-frontend.$NAMESPACE.svc.cluster.local:3000"

    # Test backend connectivity
    log "Testing backend connectivity..."
    if kubectl run connectivity-test --image=curlimages/curl --rm -i --restart=Never -- \
        curl -f -s "$backend_service/health" > /dev/null; then
        success "✓ Backend service is reachable internally"
    else
        error "✗ Backend service is not reachable internally"
        return 1
    fi

    # Test frontend connectivity
    log "Testing frontend connectivity..."
    if kubectl run connectivity-test --image=curlimages/curl --rm -i --restart=Never -- \
        curl -f -s "$frontend_service/health" > /dev/null; then
        success "✓ Frontend service is reachable internally"
    else
        error "✗ Frontend service is not reachable internally"
        return 1
    fi

    return 0
}

# Verify external connectivity
verify_external_connectivity() {
    log "Verifying external connectivity..."

    local base_url
    if [ "$ENVIRONMENT" == "production" ]; then
        base_url="https://rabbitlaunchpad.io"
    else
        base_url="https://staging.rabbitlaunchpad.io"
    fi

    log "Testing external connectivity to: $base_url"

    # Test external health endpoint
    if curl -f -s "$base_url/health" > /dev/null; then
        success "✓ External health endpoint is reachable"
    else
        error "✗ External health endpoint is not reachable"
        return 1
    fi

    # Test external API endpoint
    if curl -f -s "$base_url/api/health" > /dev/null; then
        success "✓ External API endpoint is reachable"
    else
        error "✗ External API endpoint is not reachable"
        return 1
    fi

    return 0
}

# Generate verification report
generate_report() {
    log "Generating verification report..."

    local report_file="k8s-verification-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).txt"

    {
        echo "Rabbit Launchpad K8S Deployment Verification Report"
        echo "================================================="
        echo "Environment: $ENVIRONMENT"
        echo "Timestamp: $(date)"
        echo "Namespace: $NAMESPACE"
        echo ""

        echo "=== Deployments ==="
        kubectl get deployments -n $NAMESPACE
        echo ""

        echo "=== Pods ==="
        kubectl get pods -n $NAMESPACE
        echo ""

        echo "=== Services ==="
        kubectl get services -n $NAMESPACE
        echo ""

        echo "=== Ingress ==="
        kubectl get ingress -n $NAMESPACE
        echo ""

        echo "=== HPA ==="
        kubectl get hpa -n $NAMESPACE 2>/dev/null || echo "No HPAs found"
        echo ""

        echo "=== PVC ==="
        kubectl get pvc -n $NAMESPACE 2>/dev/null || echo "No PVCs found"
        echo ""

        echo "=== Resource Usage ==="
        kubectl top pods -n $NAMESPACE 2>/dev/null || echo "Metrics server not available"
        echo ""

        echo "=== Events (Last 10) ==="
        kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10

    } > "$report_file"

    success "Verification report generated: $report_file"
}

# Main verification function
main() {
    print_header

    local verification_steps=(
        "verify_prerequisites"
        "verify_deployments"
        "verify_pods"
        "verify_services"
        "verify_ingress"
        "verify_persistent_volumes"
        "verify_hpas"
        "verify_resource_usage"
        "verify_network_connectivity"
        "verify_external_connectivity"
    )

    local failed_steps=0

    for step in "${verification_steps[@]}"; do
        if ! $step; then
            ((failed_steps++))
        fi
    done

    # Generate report
    generate_report

    echo ""
    echo "=========================================="
    if [ $failed_steps -eq 0 ]; then
        echo -e "${GREEN}✅ All verification checks passed!${NC}"
        echo "🎉 Rabbit Launchpad K8S deployment is healthy and ready for use."
    else
        echo -e "${RED}❌ $failed_steps verification checks failed!${NC}"
        echo "Please review the failed checks and fix the issues."
        exit 1
    fi
    echo "=========================================="
}

# Help function
show_help() {
    echo "Rabbit Launchpad K8S Deployment Verification Script"
    echo "=================================================="
    echo ""
    echo "Usage: $0 [environment]"
    echo ""
    echo "Environment:"
    echo "  staging     Verify staging deployment (default)"
    echo "  production  Verify production deployment"
    echo ""
    echo "Examples:"
    echo "  $0                # Verify staging deployment"
    echo "  $0 production    # Verify production deployment"
    echo ""
    echo "Verification Checks:"
    echo "  ✓ Prerequisites (kubectl access, namespace)"
    echo "  ✓ Deployments (status, replicas)"
    echo "  ✓ Pods (running status, readiness)"
    echo "  ✓ Services (type, ports)"
    echo "  ✓ Ingress (host, TLS, class)"
    echo "  ✓ Persistent Volumes (binding status)"
    echo "  ✓ HPAs (autoscaling configuration)"
    echo "  ✓ Resource Usage (CPU, memory)"
    echo "  ✓ Network Connectivity (internal/external)"
    echo "  ✓ External Reachability (health endpoints)"
}

# Handle help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run main function
main "$@"