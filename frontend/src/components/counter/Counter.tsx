import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, RotateCcw, Mic, MicOff, Volume2, VolumeX, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCounterStore } from '@/stores/counterStore';
import { CircularProgress } from '@/components/ui/Progress';
import InstructionCard from './InstructionCard';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { IconButton, Text, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface CounterProps {
  projectId: string;
  projectTitle: string;
  sectionName: string;
}

export default function Counter({ projectId, projectTitle, sectionName }: CounterProps) {
  const {
    currentRow,
    totalRows,
    currentInstruction,
    needsMeasurement,
    measurementReminder,
    settings,
    increment,
    decrement,
    reset,
    updateSettings,
  } = useCounterStore();

  const { isListening, startListening, stopListening, isSupported } = useVoiceCommands({
    onNext: increment,
    onBack: decrement,
    onUndo: decrement,
  });

  // Progress percentage
  const progress = totalRows ? Math.min((currentRow / totalRows) * 100, 100) : 0;
  const isComplete = totalRows !== null && currentRow >= totalRows;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        increment();
      } else if (e.key === 'ArrowDown' || e.key === 'Backspace') {
        e.preventDefault();
        decrement();
      } else if (e.key === 'r' && e.metaKey) {
        e.preventDefault();
        reset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [increment, decrement, reset]);

  const handleIncrement = useCallback(() => {
    increment();
  }, [increment]);

  const handleDecrement = useCallback(() => {
    decrement();
  }, [decrement]);

  return (
    <div className="h-screen-safe flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 pt-safe">
        <Link to={`/projects/${projectId}`}>
          <IconButton
            icon={<ChevronLeft className="w-5 h-5" />}
            aria-label="Back"
            variant="ghost"
          />
        </Link>

        <div className="flex items-center gap-1">
          {isSupported && (
            <IconButton
              icon={isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              aria-label={isListening ? 'Stop listening' : 'Start voice commands'}
              variant={isListening ? 'soft-secondary' : 'ghost'}
              onClick={() => isListening ? stopListening() : startListening()}
            />
          )}

          <IconButton
            icon={settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            aria-label={settings.soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            variant="ghost"
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
          />

          <IconButton
            icon={<RotateCcw className="w-5 h-5" />}
            aria-label="Reset counter"
            variant="ghost"
            onClick={reset}
          />
        </div>
      </header>

      {/* Project & Section info */}
      <div className="text-center px-4 pb-4">
        <Text variant="heading-sm" color="subtle" truncate>{projectTitle}</Text>
        <Text variant="body-sm" color="muted">{sectionName}</Text>
      </div>

      {/* Main counter display */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <CircularProgress value={progress} size={280} strokeWidth={14}>
            <div className="flex flex-col items-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentRow}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-8xl font-display font-bold text-content tabular-nums"
                >
                  {currentRow}
                </motion.span>
              </AnimatePresence>
              {totalRows && (
                <Text variant="heading-md" color="muted">of {totalRows}</Text>
              )}
            </div>
          </CircularProgress>

          {/* Complete indicator */}
          {isComplete && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-14 h-14 rounded-2xl bg-teal-500 flex items-center justify-center shadow-secondary"
            >
              <span className="text-3xl">🎉</span>
            </motion.div>
          )}
        </motion.div>

        {/* Measurement reminder */}
        <AnimatePresence>
          {needsMeasurement && measurementReminder && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card variant="secondary" padding="md" className="mt-6">
                <Text variant="body-sm" className="text-teal-700 dark:text-teal-300 text-center">
                  📏 {measurementReminder}
                </Text>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Current instruction */}
      {currentInstruction && (
        <div className="px-4 pb-4">
          <InstructionCard instruction={currentInstruction} rowNumber={currentRow} />
        </div>
      )}

      {/* Counter buttons */}
      <div className="flex items-center justify-center gap-6 px-4 pb-8 pb-safe">
        {/* Decrement */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleDecrement}
          disabled={currentRow === 0}
          className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center',
            'bg-surface border-2 border-border shadow-md',
            'active:scale-95 transition-all',
            currentRow === 0 && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Minus className="w-8 h-8 text-content-subtle" />
        </motion.button>

        {/* Increment - Big button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleIncrement}
          disabled={isComplete}
          className={cn(
            'w-36 h-36 rounded-3xl flex items-center justify-center',
            'bg-coral-500 shadow-primary',
            'active:scale-95 transition-all',
            isComplete && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Plus className="w-14 h-14 text-white" />
        </motion.button>

        {/* Spacer for symmetry */}
        <div className="w-20 h-20" />
      </div>

      {/* Voice listening indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-36 left-1/2 -translate-x-1/2"
          >
            <Card variant="secondary" padding="sm" className="bg-teal-500 border-0 shadow-secondary">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <Text variant="label-sm" className="text-white">Listening...</Text>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
