# Testing PDF Parser

Guide to test the AI PDF parsing feature.

## Prerequisites

1. **AI Service Running**
   ```bash
   cd ai-service
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8001
   ```

2. **OpenAI API Key Set**
   - Make sure `OPENAI_API_KEY` is set in `ai-service/.env`
   - You can test with: `python3 -c "from app.config import settings; print('Key set:', bool(settings.openai_api_key))"`

3. **Frontend Running**
   ```bash
   cd frontend
   yarn dev
   ```

## Testing Steps

### 1. Start the AI Service

```bash
cd ai-service
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete.
```

### 2. Test the AI Service Directly

You can test the endpoint directly with curl:

```bash
curl -X POST http://localhost:8001/api/pdf/parse \
  -F "file=@/path/to/your/pattern.pdf" \
  -H "Content-Type: multipart/form-data"
```

Or use a tool like Postman or httpie.

### 3. Test via Frontend

1. Navigate to http://localhost:5173/patterns/upload
2. Click "Upload Pattern" or drag and drop a PDF
3. Click "Parse Pattern"
4. Wait for the AI to process (may take 30-60 seconds)
5. Review the parsed results

## What to Expect

The parser will extract:
- ✅ Pattern title and description
- ✅ Difficulty level
- ✅ Gauge information
- ✅ Available sizes
- ✅ **Sizing chart with all measurements** (flexible for any item type)
- ✅ Pattern sections with row-by-row instructions
- ✅ Abbreviations

## Troubleshooting

### "Failed to parse PDF"

**Check:**
- Is the AI service running? (`curl http://localhost:8001/health`)
- Is the OpenAI API key set? (Check `ai-service/.env`)
- Does the PDF contain text? (Scanned PDFs may need OCR)
- Check browser console for errors
- Check AI service logs for detailed errors

### "OpenAI API key not configured"

1. Make sure `ai-service/.env` exists
2. Add `OPENAI_API_KEY=your_key_here`
3. Restart the AI service

### "Connection refused" or CORS errors

1. Check that AI service is running on port 8001
2. Verify `CORS_ORIGINS` in `ai-service/.env` includes `http://localhost:5173`
3. Check browser console for CORS errors

### Slow parsing

- Large PDFs (10+ pages) may take 1-2 minutes
- This is normal - the AI needs to read and understand the entire pattern
- Progress indicator will show parsing status

### Partial results

- Some patterns may not have all fields (e.g., missing sizing chart)
- Check the parsing confidence score
- Review the raw text extraction if needed

## Example Test PDF

You can test with any knitting pattern PDF. The parser works best with:
- Text-based PDFs (not just images)
- Clear formatting
- Standard knitting abbreviations
- Sizing charts in table format

## Next Steps

Once parsing works:
1. Review the extracted data
2. Click "Save to Library" to store the pattern
3. Create a project from the parsed pattern
4. Use the row counter with the extracted instructions


