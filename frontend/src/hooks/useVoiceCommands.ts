import { useState, useCallback, useEffect, useRef } from 'react';

interface VoiceCommandsOptions {
  onNext?: () => void;
  onBack?: () => void;
  onUndo?: () => void;
  onRepeat?: () => void;
  onWhereAmI?: () => void;
}

// Voice command mappings
const COMMANDS: Record<string, keyof VoiceCommandsOptions> = {
  'next': 'onNext',
  'next row': 'onNext',
  'done': 'onNext',
  'finished': 'onNext',
  'complete': 'onNext',
  'back': 'onBack',
  'go back': 'onBack',
  'previous': 'onBack',
  'undo': 'onUndo',
  'oops': 'onUndo',
  'mistake': 'onUndo',
  'repeat': 'onRepeat',
  'again': 'onRepeat',
  'read again': 'onRepeat',
  'where am i': 'onWhereAmI',
  'what row': 'onWhereAmI',
  'current row': 'onWhereAmI',
};

export function useVoiceCommands(options: VoiceCommandsOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if speech recognition is supported
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const text = result[0].transcript.toLowerCase().trim();
      
      setTranscript(text);

      // Only process final results
      if (result.isFinal) {
        processCommand(text);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (isListening && recognitionRef.current) {
        recognitionRef.current.start();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [isSupported]);

  // Process recognized command
  const processCommand = useCallback((text: string) => {
    // Find matching command
    for (const [phrase, handler] of Object.entries(COMMANDS)) {
      if (text.includes(phrase)) {
        const callback = options[handler];
        if (callback) {
          // Haptic feedback on command recognition
          if ('vibrate' in navigator) {
            navigator.vibrate([50, 50, 50]);
          }
          callback();
          return;
        }
      }
    }
  }, [options]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // Already started
    }
  }, [isSupported]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
    setIsListening(false);
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
  };
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}


