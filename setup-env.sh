#!/bin/bash
# Setup script to copy .env.example files to .env

set -e

echo "🧶 Stitch - Environment Setup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to copy env file
copy_env() {
    local dir=$1
    local file="$dir/.env"
    local example="$dir/.env.example"
    
    if [ -f "$example" ]; then
        if [ -f "$file" ]; then
            echo -e "${YELLOW}⚠️  $file already exists, skipping...${NC}"
        else
            cp "$example" "$file"
            echo -e "${GREEN}✅ Created $file${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  $example not found, skipping...${NC}"
    fi
}

# Copy env files for each service
echo "Copying .env.example files to .env..."
echo ""

copy_env "ai-service"
copy_env "backend"
copy_env "frontend"

echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit each .env file and fill in your API keys and secrets"
echo "2. See docs/ENVIRONMENT_SETUP.md for detailed instructions"
echo ""
echo "Required:"
echo "  - OpenAI API Key (ai-service/.env)"
echo "  - JWT Secrets (backend/.env)"
echo ""
echo "Optional:"
echo "  - Google OAuth (backend/.env and frontend/.env)"
echo "  - Apple OAuth (backend/.env)"
echo ""


