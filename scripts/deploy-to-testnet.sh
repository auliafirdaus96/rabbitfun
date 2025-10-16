#!/bin/bash

# Rabbit Launchpad Enhanced Contract Testnet Deployment Script
# Usage: ./scripts/deploy-to-testnet.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTRACT_NAME="RabbitLaunchpad_Security_Enhanced"
NETWORK="bscTestnet"
SCRIPT_DIR="smartcontract"
DEPLOYMENT_SCRIPT="deploy-testnet.ts"
VERIFICATION_SCRIPT="verify-testnet-deployment.ts"

# Logging functions
log() {
    echo -e "${BLUE}[DEPLOY] $1${NC}"
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
    echo "🚀 Rabbit Launchpad Enhanced - Testnet Deployment"
    echo "=================================================="
    echo "Network: BSC Testnet (Chain ID: 97)"
    echo "Contract: $CONTRACT_NAME"
    echo "Version: 1.1.0-enhanced"
    echo "=================================================="
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if we're in the right directory
    if [ ! -d "$SCRIPT_DIR" ]; then
        error "Script directory not found: $SCRIPT_DIR"
        error "Please run this script from the project root directory"
        exit 1
    fi

    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi

    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi

    # Check if Hardhat is available
    if ! cd "$SCRIPT_DIR" && npm list hardhat &> /dev/null; then
        error "Hardhat is not installed"
        error "Run: cd $SCRIPT_DIR && npm install"
        exit 1
    fi

    # Check environment variables
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        error ".env file not found in $SCRIPT_DIR"
        error "Please create .env file with necessary environment variables"
        exit 1
    fi

    # Check for required environment variables
    source "$SCRIPT_DIR/.env"
    if [ -z "$PRIVATE_KEY" ]; then
        error "PRIVATE_KEY not found in .env file"
        exit 1
    fi

    if [ -z "$TREASURY_ADDRESS" ]; then
        error "TREASURY_ADDRESS not found in .env file"
        exit 1
    fi

    success "All prerequisites satisfied"
}

# Compile contracts
compile_contracts() {
    log "Compiling contracts..."

    cd "$SCRIPT_DIR"

    if npm run compile; then
        success "Contracts compiled successfully"
    else
        error "Contract compilation failed"
        exit 1
    fi

    # Check if enhanced contract exists
    if [ ! -f "contracts/$CONTRACT_NAME.sol" ]; then
        error "Enhanced contract not found: contracts/$CONTRACT_NAME.sol"
        exit 1
    fi

    success "Enhanced contract found: $CONTRACT_NAME"
}

# Deploy to testnet
deploy_to_testnet() {
    log "Deploying to BSC Testnet..."

    cd "$SCRIPT_DIR"

    echo "Deployment Configuration:"
    echo "  Treasury: $TREASURY_ADDRESS"
    echo "  Network: $NETWORK"
    echo "  Verify: ${VERIFY_CONTRACTS:-false}"
    echo ""

    # Run deployment
    if npx hardhat run scripts/$DEPLOYMENT_SCRIPT --network $NETWORK; then
        success "Contract deployed to testnet successfully"
    else
        error "Testnet deployment failed"
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."

    cd "$SCRIPT_DIR"

    # Run verification script
    if npx hardhat run scripts/$VERIFICATION_SCRIPT --network $NETWORK; then
        success "Deployment verification completed"
    else
        warning "Verification had some issues, but deployment may still be successful"
    fi
}

# Display deployment results
display_results() {
    log "Deployment Results:"

    if [ -f "deployments/testnet/enhanced.json" ]; then
        echo "✅ Testnet deployment completed successfully!"
        echo ""

        # Extract key information
        CONTRACT_ADDRESS=$(grep -o '"address":"[^"]*"' deployments/testnet/enhanced.json | cut -d'"' -f4)
        TRANSACTION_HASH=$(grep -o '"transactionHash":"[^"]*"' deployments/testnet/enhanced.json | cut -d'"' -f4)
        BLOCK_NUMBER=$(grep -o '"blockNumber":[^,]*' deployments/testnet/enhanced.json | cut -d':' -f2)

        echo "📍 Contract Address: $CONTRACT_ADDRESS"
        echo "🔗 Transaction: $TRANSACTION_HASH"
        echo "📦 Block: $BLOCK_NUMBER"
        echo ""

        echo "🌐 Links:"
        echo "  BSCScan: https://testnet.bscscan.com/address/$CONTRACT_ADDRESS"
        echo "  Transaction: https://testnet.bscscan.com/tx/$TRANSACTION_HASH"
        echo ""

        # Check if verification report exists
        if [ -f "reports/testnet/verification-report-$(date +%Y%m%d)*.json" ]; then
            echo "📋 Verification Report: Available in reports/testnet/"
        fi

    else
        error "Deployment results not found"
        exit 1
    fi
}

# Test basic functionality
test_functionality() {
    log "Testing basic functionality..."

    cd "$SCRIPT_DIR"

    # Simple test to check if contract is accessible
    if [ -f "deployments/testnet/enhanced.json" ]; then
        CONTRACT_ADDRESS=$(grep -o '"address":"[^"]*"' deployments/testnet/enhanced.json | cut -d'"' -f4)

        echo "Testing contract at: $CONTRACT_ADDRESS"

        # Create a simple test script
        cat > test-basic-functionality.js << 'EOF'
const { ethers } = require("hardhat");

async function main() {
    const contractAddress = process.argv[2];
    const [deployer] = await ethers.getSigners();

    const contract = await ethers.getContractAt("RabbitLaunchpad_Security_Enhanced", contractAddress, deployer);

    try {
        const treasury = await contract.treasury();
        const paused = await contract.paused();
        const emergencyMode = await contract.isEmergencyMode();

        console.log("✅ Contract is accessible");
        console.log(`  Treasury: ${treasury}`);
        console.log(`  Paused: ${paused}`);
        console.log(`  Emergency Mode: ${emergencyMode}`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Contract test failed:", error.message);
        process.exit(1);
    }
}

main().catch(console.error);
EOF

        if node test-basic-functionality.js "$CONTRACT_ADDRESS"; then
            success "Basic functionality test passed"
        else
            error "Basic functionality test failed"
            rm -f test-basic-functionality.js
            exit 1
        fi

        rm -f test-basic-functionality.js
    fi
}

# Create testnet environment file for frontend
create_frontend_env() {
    log "Creating frontend environment file..."

    if [ -f "deployments/testnet/enhanced.json" ]; then
        CONTRACT_ADDRESS=$(grep -o '"address":"[^"]*"' deployments/testnet/enhanced.json | cut -d'"' -f4)

        cat > frontend/.env.testnet << EOF
# Testnet Environment Variables
NEXT_PUBLIC_ENHANCED_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
NEXT_PUBLIC_NETWORK_NAME=bscTestnet
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_RPC_URL=https://bsc-testnet.public.blastapi.io
NEXT_PUBLIC_EXPLORER_URL=https://testnet.bscscan.com
NEXT_PUBLIC_VERSION=1.1.0-enhanced
EOF

        success "Frontend .env.testnet created"
    fi
}

# Main deployment function
main() {
    print_header

    # Ask for confirmation
    echo "This script will deploy the Enhanced RabbitLaunchpad contract to BSC Testnet."
    echo "Make sure you have sufficient BNB testnet funds in your deployer account."
    echo ""
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi

    # Set environment variable for verification
    export VERIFY_CONTRACTS=${VERIFY_CONTRACTS:-true}

    # Run deployment steps
    check_prerequisites
    compile_contracts
    deploy_to_testnet
    verify_deployment
    display_results
    test_functionality
    create_frontend_env

    echo ""
    echo "🎉 Testnet deployment completed successfully!"
    echo "📋 Next steps:"
    echo "  1. View contract on BSCScan Testnet"
    echo "  2. Run comprehensive tests"
    echo "  3. Test token creation and trading"
    echo "  4. Verify security features"
    echo "  5. Prepare for mainnet deployment"
    echo ""
    echo "📞 For support, check the deployment reports or contact the development team."
}

# Handle help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Rabbit Launchpad Enhanced - Testnet Deployment Script"
    echo "======================================================="
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo "  --verify      Skip deployment and only verify existing contract"
    echo "  --test        Run tests on existing deployed contract"
    echo ""
    echo "Environment Variables:"
    echo "  PRIVATE_KEY        Your testnet private key"
    echo "  TREASURY_ADDRESS   Treasury address for the contract"
    echo "  BSC_API_KEY         BSCScan API key for verification"
    echo "  VERIFY_CONTRACTS    Set to 'true' to verify on BSCScan"
    echo ""
    echo "Prerequisites:"
    echo "  - Node.js and npm installed"
    echo "  - Hardhat installed locally"
    echo "  - .env file with required environment variables"
    echo "  - Sufficient BNB testnet funds"
    echo ""
    exit 0
fi

# Handle specific commands
case "$1" in
    --verify)
        log "Verifying existing deployment..."
        verify_deployment
        display_results
        ;;
    --test)
        log "Testing existing deployment..."
        test_functionality
        ;;
    *)
        main
        ;;
esac