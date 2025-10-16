#!/bin/bash

# Rabbit Launchpad Vercel Deployment Script
# This script deploys the investor presentation site to Vercel

set -e

echo "🚀 Deploying Rabbit Launchpad Investor Site to Vercel"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
BUILD_DIR="dist"
PROJECT_NAME="rabbit-launchpad-investors"

echo -e "${BLUE}📁 Frontend Directory: ${FRONTEND_DIR}${NC}"
echo -e "${BLUE}📦 Build Directory: ${BUILD_DIR}${NC}"
echo -e "${BLUE}🌐 Project Name: ${PROJECT_NAME}${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Frontend directory not found! Make sure you're in the project root."
    exit 1
fi

# Navigate to frontend directory
cd "$FRONTEND_DIR"
print_status "Changed to frontend directory"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not found. Installing..."
    npm install -g vercel
    print_status "Vercel CLI installed"
fi

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    print_error "vercel.json not found!"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
    print_status "Dependencies installed"
fi

# Clean previous build
print_info "Cleaning previous build..."
rm -rf "$BUILD_DIR"

# Set environment variables for investor site
print_info "Setting environment variables for Vercel deployment"
export NODE_ENV=production
export VITE_INVESTOR_MODE=true
export VITE_APP_TITLE="Rabbit Launchpad - Investor Presentation"
export VITE_APP_DESCRIPTION="Enterprise-Grade Token Launch Platform Seeking Strategic Investment"

# Build the application
print_info "Building investor site for Vercel deployment..."
npm run build

# Check if build was successful
if [ ! -d "$BUILD_DIR" ]; then
    print_error "Build failed! No dist directory found."
    exit 1
fi

print_status "Build completed successfully!"

# Create Vercel-specific files
print_info "Creating Vercel-specific configuration files..."

# Create .vercelignore file
cat > .vercelignore << 'EOF'
# Dependencies
node_modules
package-lock.json
yarn.lock
pnpm-lock.yaml

# Development files
.env.local
.env.development
.env.test

# Build artifacts
.cache
.temp

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode
.idea
*.swp
*.swo

# Git
.git
.gitignore

# Documentation
README.md
CHANGELOG.md
*.md

# Scripts
scripts

# Config files
.eslintrc*
.prettierrc*
.editorconfig

# Tests
tests
__tests__
*.test.js
*.spec.js
coverage

# Temporary files
*.tmp
*.temp
*.bak
*.backup
EOF

# Create robots.txt for SEO
cat > "$BUILD_DIR/robots.txt" << 'EOF'
User-agent: *
Allow: /
Sitemap: https://your-domain.com/sitemap.xml

# Block AI crawlers if needed
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /
EOF

# Create sitemap.xml
cat > "$BUILD_DIR/sitemap.xml" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://your-domain.com/</loc>
        <lastmod>$(date -u +"%Y-%m-%dT%H:%M:%SZ")</last-mod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://your-domain.com/investors</loc>
        <last-modified>$(date -u +"%Y-%m-%dT%H:%M:%SZ")</last-mod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
</urlset>
EOF

# Create investor-specific meta tags file
print_info "Creating investor-specific meta configuration..."

# Build size analysis
print_info "Analyzing build size..."
BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
print_status "Total build size: $BUILD_SIZE"

# Check if user is logged in to Vercel
print_info "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    print_warning "You are not logged in to Vercel. Please login:"
    vercel login
    print_status "Logged in to Vercel"
fi

# Deploy to Vercel
print_info "Deploying to Vercel..."
echo ""

# Check if this is first deployment or update
if vercel ls --scope "$PROJECT_NAME" 2>/dev/null | grep -q "$PROJECT_NAME"; then
    print_info "Updating existing project..."
    vercel --prod --confirm
else
    print_info "Creating new project..."
    vercel --prod
fi

echo ""
print_status "Deployment completed successfully!"

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --scope "$PROJECT_NAME" 2>/dev/null | head -1 | awk '{print $2}' | sed 's/\x1b\[[0-9;]*m//g')

if [ -n "$DEPLOYMENT_URL" ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment Summary:${NC}"
    echo -e "   • Project: ${PROJECT_NAME}"
    echo -e "   • Build Size: ${BUILD_SIZE}"
    echo -e "   • Deployment URL: ${BLUE}${DEPLOYMENT_URL}${NC}"
    echo -e "   • Investor Page: ${BLUE}${DEPLOYMENT_URL}/investors${NC}"
    echo ""
    echo -e "${BLUE}📱 Next Steps:${NC}"
    echo "1. Visit your investor site: $DEPLOYMENT_URL/investors"
    echo "2. Test all investor features and interactive demos"
    echo "3. Share the URL with potential investors"
    echo "4. Monitor deployment logs in Vercel dashboard"
    echo ""
    echo -e "${YELLOW}💡 Pro Tips:${NC}"
    echo "• Set up custom domain in Vercel dashboard"
    echo "• Configure analytics and monitoring"
    echo "• Enable automatic deployments from git"
    echo "• Set up environment variables for production"
    echo ""
    echo -e "${GREEN}✨ Your Rabbit Launchpad investor site is live!${NC}"
else
    print_warning "Could not retrieve deployment URL. Please check Vercel dashboard."
fi

# Show deployment logs if requested
echo ""
read -p "Do you want to view deployment logs? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Recent deployment logs:"
    vercel logs --since=1h
fi

echo ""
print_status "Vercel deployment process completed!"