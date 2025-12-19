# Quick Start: Testing PDF Parser

## Step 1: Start the AI Service

```bash
cd ai-service

# Create virtual environment (first time only)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the service
uvicorn app.main:app --reload --port 8001
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete.
```

## Step 2: Verify Setup

In a new terminal:
```bash
# Test the service is running
curl http://localhost:8001/health

# Should return: {"status":"healthy"}
```

## Step 3: Test PDF Upload

1. **Start the frontend** (if not already running):
   ```bash
   cd frontend
   yarn dev
   ```

2. **Navigate to upload page**:
   - Go to http://localhost:5173/patterns/upload
   - Or click "Upload Pattern" from the Patterns page

3. **Upload a PDF**:
   - Click the upload area or drag & drop a PDF file
   - Click "Parse Pattern"
   - Wait 30-60 seconds for AI processing

4. **Review results**:
   - Check the parsed pattern data
   - Verify sizing chart is extracted (if present in PDF)
   - Review sections and instructions

## What Gets Extracted

✅ Pattern title and description  
✅ Difficulty level  
✅ Gauge information  
✅ Available sizes  
✅ **Sizing chart** (flexible - works for sweaters, socks, mittens, etc.)  
✅ Pattern sections with row-by-row instructions  
✅ Abbreviations  

## Troubleshooting

### "Failed to upload and parse PDF"

**Check:**
- Is AI service running? (`curl http://localhost:8001/health`)
- Is OpenAI API key set? (Check `ai-service/.env`)
- Check browser console for errors
- Check AI service terminal for detailed errors

### "Connection refused"

- Make sure AI service is running on port 8001
- Check `VITE_AI_SERVICE_URL` in `frontend/.env` (defaults to `http://localhost:8001`)

### Slow or timeout

- Large PDFs may take 1-2 minutes
- This is normal - AI needs to read entire pattern
- Progress bar will show status

## Next Steps

Once parsing works:
1. Review extracted data
2. Click "Save to Library" (coming soon - will save to database)
3. Create a project from parsed pattern
4. Use row counter with extracted instructions


