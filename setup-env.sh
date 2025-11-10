#!/bin/bash

# Vanguard Environment Setup Script
# This script helps you set up environment variables for development

echo "🚀 Vanguard Environment Setup"
echo "=============================="
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Copy template to .env.local
echo "📋 Creating .env.local from template..."
cp env.local.template .env.local

echo ""
echo "✅ Environment file created: .env.local"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env.local with your Firebase project credentials"
echo "2. Get your Firebase config from: https://console.firebase.google.com/"
echo "3. Replace the placeholder values in .env.local"
echo ""
echo "🔧 To edit the file:"
echo "   - Windows: notepad .env.local"
echo "   - Mac/Linux: nano .env.local"
echo ""
echo "⚠️  Important: Never commit .env.local to version control!"
echo ""
echo "📖 For more details, see docs/PRODUCTION_DEPLOYMENT_GUIDE.md"






