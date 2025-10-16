#!/bin/bash

echo "🚀 Rabbit Launchpad Provider Setup"
echo "=================================="

echo ""
echo "Pilih Provider Stack:"
echo "1) Production-Ready Stack (Recommended for scaling)"
echo "2) Budget-Friendly Stack (Good for MVP)"
echo ""

read -p "Pilih (1 atau 2): " choice

case $choice in
    1)
        echo "🎯 Setting up Production-Ready Stack..."
        echo ""
        echo "📋 Required API Keys:"
        echo "1. Alchemy API Key: https://dashboard.alchemy.com/"
        echo "2. Moralis API Key: https://admin.moralis.io/"
        echo "3. CoinGecko API Key: https://www.coingecko.com/en/api"
        echo "4. Supabase Project: https://supabase.com/"
        echo "5. Upstash Redis: https://upstash.com/"
        echo "6. Pusher Channels: https://pusher.com/"
        echo ""
        read -p "Tekan Enter untuk setup environment files..."

        # Copy production templates
        cp backend/.env.local backend/.env.production.backup
        cp frontend/.env.local frontend/.env.production.backup

        echo "✅ Environment files created!"
        echo "📝 Update API keys di .env.local files"
        ;;

    2)
        echo "💰 Setting up Budget-Friendly Stack..."
        echo ""
        echo "📋 Required API Keys:"
        echo "1. Moralis Free API Key: https://admin.moralis.io/"
        echo "2. CoinGecko Free API Key: https://www.coingecko.com/en/api"
        echo "3. Railway Account: https://railway.app/"
        echo ""
        read -p "Tekan Enter untuk setup environment files..."

        # Copy budget templates
        cp backend/.env.budget backend/.env
        cp frontend/.env.budget frontend/.env.local

        echo "✅ Budget environment files created!"
        echo "📝 Update minimal API keys di .env files"
        ;;

    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "🔧 Next Steps:"
echo "1. Update API keys di environment files"
echo "2. Jalankan: npm install (install additional dependencies)"
echo "3. Start development servers"
echo ""
echo "📚 Documentation:"
echo "- Alchemy Docs: https://docs.alchemy.com/"
echo "- Moralis Docs: https://docs.moralis.io/"
echo "- Supabase Docs: https://supabase.com/docs"
echo ""