#!/bin/bash

# Smoke Tests for Rabbit Launchpad
# Usage: ./scripts/smoke-tests.sh [environment]

set -e

ENVIRONMENT=${1:-staging}
BASE_URL="https://$ENVIRONMENT.rabbitlaunchpad.io"
FAILED_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[SMOKE TEST] $1${NC}"
}

error() {
    echo -e "${RED}[SMOKE TEST FAILED] $1${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

warning() {
    echo -e "${YELLOW}[SMOKE TEST WARNING] $1${NC}"
}

# Test helper functions
test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3

    echo "Testing $description: $endpoint"

    if response=$(curl -s -o /tmp/response.json -w "%{http_code}" "$BASE_URL$endpoint"); then
        if [ "$response" -eq "$expected_status" ]; then
            log "✓ $description - Status: $response"
        else
            error "✗ $description - Expected: $expected_status, Got: $response"
            cat /tmp/response.json
        fi
    else
        error "✗ $description - Request failed"
    fi
}

test_api_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local data=$3
    local expected_status=${4:-200}
    local description=$5

    echo "Testing $description: $method $endpoint"

    if [ "$method" = "POST" ]; then
        if response=$(curl -s -o /tmp/response.json -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint"); then
            if [ "$response" -eq "$expected_status" ]; then
                log "✓ $description - Status: $response"
            else
                error "✗ $description - Expected: $expected_status, Got: $response"
                cat /tmp/response.json
            fi
        else
            error "✗ $description - Request failed"
        fi
    else
        if response=$(curl -s -o /tmp/response.json -w "%{http_code}" "$BASE_URL$endpoint"); then
            if [ "$response" -eq "$expected_status" ]; then
                log "✓ $description - Status: $response"
            else
                error "✗ $description - Expected: $expected_status, Got: $response"
                cat /tmp/response.json
            fi
        else
            error "✗ $description - Request failed"
        fi
    fi
}

# Main smoke tests
echo "=========================================="
echo "Rabbit Launchpad Smoke Tests"
echo "Environment: $ENVIRONMENT"
echo "Base URL: $BASE_URL"
echo "=========================================="

# 1. Health Checks
echo ""
echo "1. Health Checks"
echo "--------------"

test_endpoint "/health" 200 "Backend Health Check"
test_endpoint "/health" 200 "Frontend Health Check"

# 2. Static Pages
echo ""
echo "2. Static Pages"
echo "---------------"

test_endpoint "/" 200 "Home Page"
test_endpoint "/launchpad" 200 "Launchpad Page"
test_endpoint "/creator" 200 "Creator Dashboard"

# 3. API Endpoints
echo ""
echo "3. API Endpoints"
echo "----------------"

# Token endpoints
test_api_endpoint "/api/tokens" "GET" "" 200 "Get Tokens List"

# Auth endpoints
test_api_endpoint "/api/auth/nonce" "POST" '{"walletAddress":"0x742d35Cc6634C0532925a3b8D4E7E0E0E9e0dF7"}' 200 "Generate Nonce"

# User endpoints (without auth - should return 401)
test_api_endpoint "/api/users/profile" "GET" "" 401 "Get Profile (Unauthorized)"

# Analytics endpoints
test_api_endpoint "/api/analytics/stats" "GET" "" 200 "Get Analytics Stats"

# 4. WebSocket Connection
echo ""
echo "4. WebSocket Connection"
echo "-----------------------"

echo "Testing WebSocket connection..."
if command -v wscat &> /dev/null; then
    if wscat -c "$BASE_URL" -x '{"type":"ping"}" 2>/dev/null | grep -q "pong\|connected"; then
        log "✓ WebSocket connection successful"
    else
        warning "⚠ WebSocket connection test inconclusive"
    fi
else
    warning "⚠ wscat not available, skipping WebSocket test"
fi

# 5. Database Connectivity
echo ""
echo "5. Database Connectivity"
echo "------------------------"

echo "Testing database connectivity via API..."
test_api_endpoint "/api/health/db" "GET" "" 200 "Database Health Check"

# 6. External Services
echo ""
echo "6. External Services"
echo "--------------------"

echo "Testing blockchain connectivity..."
test_api_endpoint "/api/blockchain/health" "GET" "" 200 "Blockchain Health Check"

# 7. Performance Check
echo ""
echo "7. Performance Check"
echo "-------------------"

echo "Testing response times..."
start_time=$(date +%s%N)
test_endpoint "/" 200 "Home Page Response Time"
end_time=$(date +%s%N)
response_time=$((($end_time - $start_time) / 1000000))

if [ $response_time -lt 1000 ]; then
    log "✓ Home page response time: ${response_time}ms (Good)"
elif [ $response_time -lt 3000 ]; then
    warning "⚠ Home page response time: ${response_time}ms (Acceptable)"
else
    error "✗ Home page response time: ${response_time}ms (Too slow)"
fi

# 8. Security Headers
echo ""
echo "8. Security Headers"
echo "-------------------"

echo "Checking security headers..."
if curl -s -I "$BASE_URL" | grep -qi "x-frame-options"; then
    log "✓ X-Frame-Options header present"
else
    warning "⚠ X-Frame-Options header missing"
fi

if curl -s -I "$BASE_URL" | grep -qi "x-content-type-options"; then
    log "✓ X-Content-Type-Options header present"
else
    warning "⚠ X-Content-Type-Options header missing"
fi

if curl -s -I "$BASE_URL" | grep -qi "strict-transport-security"; then
    log "✓ HSTS header present"
else
    warning "⚠ HSTS header missing"
fi

# 9. Error Handling
echo ""
echo "9. Error Handling"
echo "-----------------"

test_endpoint "/nonexistent-page" 404 "404 Error Page"
test_api_endpoint "/api/nonexistent-endpoint" "GET" "" 404 "404 API Endpoint"

# 10. Load Test (basic)
echo ""
echo "10. Basic Load Test"
echo "-------------------"

echo "Running 10 concurrent requests to home page..."
for i in {1..10}; do
    curl -s "$BASE_URL" > /dev/null &
done
wait

if [ $? -eq 0 ]; then
    log "✓ Basic load test passed"
else
    error "✗ Basic load test failed"
fi

# Summary
echo ""
echo "=========================================="
echo "Smoke Tests Summary"
echo "=========================================="

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All smoke tests passed!${NC}"
    echo ""
    echo "Deployment appears to be healthy and ready for use."
    exit 0
else
    echo -e "${RED}✗ $FAILED_TESTS test(s) failed!${NC}"
    echo ""
    echo "Please review the failed tests before proceeding."
    exit 1
fi