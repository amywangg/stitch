import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, XCircle, CheckCircle, Loader2, ChevronLeft, FileUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Text, Heading, Spinner, IconButton, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

// AI Service URL from environment variables
const aiServiceUrl = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001';

export default function PatternUploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [parsingStage, setParsingStage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Only PDF files are supported.');
        setSelectedFile(null);
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleUploadAndParse = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file to upload.');
      return;
    }

    setIsUploading(true);
    setIsParsing(true);
    setError(null);
    setUploadProgress(0);
    setParsingStage('Uploading PDF...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Progress tracking with realistic stages
    const updateProgress = (progress: number, stage: string) => {
      setUploadProgress(progress);
      setParsingStage(stage);
    };

    // Start with upload progress
    updateProgress(5, 'Uploading PDF...');
    
    // Simulate upload progress (5-15%)
    let uploadProgress = 5;
    progressIntervalRef.current = window.setInterval(() => {
      uploadProgress = Math.min(uploadProgress + 1, 15);
      updateProgress(uploadProgress, 'Uploading PDF...');
    }, 100);

    try {
      // Upload and parse PDF with timeout (5 minutes for complex patterns)
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 300000); // 5 minute timeout for complex patterns

      let response: Response;
      try {
        response = await fetch(`${aiServiceUrl}/api/pdf/parse`, {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 5 minutes. The PDF might be too large or complex. Try a smaller file or contact support.');
        }
        if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
          throw new Error(`Cannot connect to AI service at ${aiServiceUrl}. Make sure the AI service is running on port 8001.`);
        }
        throw fetchError;
      }

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Upload complete, now processing
      updateProgress(20, 'Extracting text from PDF...');

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || `Server error: ${response.status}` };
        }
        throw new Error(errorData.detail || errorData.message || `Server error: ${response.status}`);
      }

      // Reading response - this happens while backend is still processing
      // The actual parsing happens on the backend, so we estimate progress
      updateProgress(30, 'Extracting text from PDF...');
      
      // Wait a bit to let backend start processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateProgress(40, 'Parsing sizes and measurements...');
      
      // Simulate progress during parsing (this is an estimate since we can't get real-time updates)
      // Most time is spent in AI parsing
      const parsingProgressInterval = window.setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 85) {
            return Math.min(prev + 2, 85); // Gradually increase to 85%
          }
          return prev;
        });
      }, 2000); // Update every 2 seconds

      const result = await response.json();
      
      // Clear parsing progress interval
      clearInterval(parsingProgressInterval);
      
      updateProgress(90, 'Generating instructions...');

      if (!result.success) {
        throw new Error(result.errors?.[0] || 'Failed to parse PDF');
      }

      if (result.pattern) {
        updateProgress(95, 'Finalizing pattern...');
        
        // Check if this was a cached pattern (indicated by warnings)
        const isCached = result.warnings?.some((w: string) => w.includes('cached')) || false;
        
        if (isCached) {
          updateProgress(100, 'Using cached pattern!');
        }
        
        // Transform pattern data to match expected structure
        const transformedPattern = {
          ...result.pattern,
          // Handle sizes - can be string[] or PatternSize[]
          sizes: Array.isArray(result.pattern.sizes) 
            ? result.pattern.sizes.map((size: any, idx: number) => 
                typeof size === 'string' 
                  ? { name: size, display_order: idx, measurements: {} }
                  : size
              )
            : [],
          // Handle sizingChart - normalize from snake_case to camelCase if needed
          sizingChart: result.pattern.sizing_chart || result.pattern.sizingChart || null,
          // Mark if this was from cache
          _fromCache: isCached
        };
        
        updateProgress(100, isCached ? 'Using cached pattern!' : 'Complete!');
        
        // Small delay to show completion, then navigate
        setTimeout(() => {
          navigate('/patterns/review', { 
            state: { pattern: transformedPattern, fromCache: isCached } 
          });
        }, 300);
      } else {
        throw new Error('No pattern data returned');
      }
    } catch (err: any) {
      // Clear any progress intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (err.name === 'AbortError') {
        if (err.message?.includes('timed out')) {
          setError('Request timed out after 5 minutes. The PDF might be too large or complex. Try a smaller file or check if the AI service is running.');
        } else {
          setError('Upload cancelled');
        }
      } else {
        console.error('Upload error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload and parse PDF';
        
        // Provide helpful error messages
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          setError(`Cannot connect to AI service. Please check:\n1. Is the AI service running? (should be on port 8001)\n2. Check the console for connection errors\n3. Try refreshing the page`);
        } else {
          setError(errorMessage);
        }
      }
    } finally {
      setIsUploading(false);
      setIsParsing(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    setParsingStage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="px-4 py-6 pb-safe min-h-screen-safe bg-background">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <Link to="/patterns">
          <IconButton icon={<ChevronLeft />} aria-label="Back to patterns" variant="ghost" />
        </Link>
        <Heading level={1} variant="display-xs" className="flex-1 text-center -ml-8">
          Upload Pattern
        </Heading>
      </motion.div>

      <Card variant="elevated" padding="lg" className="mb-6">
        <div
          className={cn(
            "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors",
            isDragging ? "border-coral-500 bg-coral-50 dark:bg-coral-950" : "border-border-default bg-surface hover:border-coral-300"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp className={cn("w-12 h-12 mb-4", isDragging ? "text-coral-500" : "text-content-muted")} />
          <Text variant="body-md" className="text-center mb-2">
            {isDragging ? "Drop your PDF here" : "Drag & drop your PDF here, or click to select"}
          </Text>
          <Text variant="body-sm" color="muted">Max file size: 50MB</Text>
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf"
            onChange={(e) => handleFileChange(e.target.files)}
            className="hidden"
          />
        </div>

        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 rounded-xl bg-background-subtle border border-border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-content-muted" />
              <Text variant="body-sm" className="truncate max-w-[150px]">{selectedFile.name}</Text>
              <Text variant="body-xs" color="muted">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</Text>
            </div>
            <IconButton
              icon={<XCircle className="w-5 h-5" />}
              aria-label="Remove file"
              variant="ghost"
              onClick={handleRemoveFile}
            />
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-xl bg-status-error-subtle border border-status-error"
          >
            <Text variant="body-sm" className="text-status-error">{error}</Text>
          </motion.div>
        )}

        {/* Progress indicator */}
        {(isUploading || isParsing) && (
          <div className="mt-6 space-y-2">
            {parsingStage && (
              <Text variant="body-sm" color="muted" className="text-center">
                {parsingStage}
              </Text>
            )}
            <div className="w-full bg-background-muted rounded-full h-2.5">
              <div
                className="bg-coral-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <Text variant="body-xs" color="muted" className="text-center">
              {uploadProgress}% complete
            </Text>
          </div>
        )}

        <Button
          variant="primary"
          fullWidth
          className="mt-6"
          onClick={handleUploadAndParse}
          disabled={!selectedFile || isUploading || isParsing}
          loading={isUploading || isParsing}
          leftIcon={isParsing ? <Loader2 className="animate-spin" /> : <Upload />}
        >
          {isParsing ? 'Parsing Pattern...' : (isUploading ? 'Uploading...' : 'Upload & Parse PDF')}
        </Button>
      </Card>
    </div>
  );
}
