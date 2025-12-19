#!/bin/bash
# Quick test script for AI service

echo "🧶 Testing AI Service..."
echo ""

# Check if service is running
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ AI Service is running"
else
    echo "❌ AI Service is NOT running"
    echo "   Start it with: cd ai-service && source venv/bin/activate && uvicorn app.main:app --reload --port 8001"
    exit 1
fi

# Check OpenAI key
cd ai-service
if [ -f .env ]; then
    source .env 2>/dev/null || true
    if [ -n "$OPENAI_API_KEY" ]; then
        echo "✅ OpenAI API Key is set"
    else
        echo "⚠️  OpenAI API Key is NOT set in .env"
    fi
else
    echo "⚠️  .env file not found in ai-service/"
fi

echo ""
echo "Test the service:"
echo "  curl http://localhost:8001/health"
echo ""
