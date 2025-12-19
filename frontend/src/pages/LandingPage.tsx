import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Minus, RotateCcw,
  ChevronRight, Heart, MessageCircle,
  Mic, MicOff, Users, Sparkles
} from 'lucide-react';
import { Button, Text, Card, Avatar, Badge } from '@/components/ui';

// Sample pattern instructions
const patternInstructions = [
  { row: 1, instruction: 'Cast on 120 stitches. Join to work in the round, being careful not to twist.', type: 'setup' },
  { row: 2, instruction: 'Knit all stitches.', type: 'knit' },
  { row: 3, instruction: '*K2, P2* repeat to end.', type: 'ribbing' },
  { row: 4, instruction: '*K2, P2* repeat to end.', type: 'ribbing' },
  { row: 5, instruction: '*K2, P2* repeat to end.', type: 'ribbing' },
  { row: 6, instruction: 'Knit all stitches.', type: 'knit' },
  { row: 7, instruction: 'Knit all stitches.', type: 'knit' },
  { row: 8, instruction: '*K4, P4* repeat to end.', type: 'pattern' },
  { row: 9, instruction: '*K4, P4* repeat to end.', type: 'pattern' },
  { row: 10, instruction: 'Knit all stitches. Place marker for sleeve.', type: 'marker' },
];

// Voice commands for demo - what you can say to control the app
const voiceCommands = [
  { text: '"Next row"', action: 'Increments your row counter' },
  { text: '"Undo"', action: 'Goes back one row' },
  { text: '"What row am I on?"', action: 'Shows your current row' },
  { text: '"How many rows left?"', action: 'Shows remaining rows' },
];

// Counter colors
const counterColors = {
  total: { bg: 'bg-coral-500', text: 'text-white', ring: 'ring-coral-300', shadow: 'shadow-coral-500/30' },
  body: { bg: 'bg-teal-500', text: 'text-white', ring: 'ring-teal-300', shadow: 'shadow-teal-500/30' },
  sleeve1: { bg: 'bg-amber-500', text: 'text-white', ring: 'ring-amber-300', shadow: 'shadow-amber-500/30' },
  sleeve2: { bg: 'bg-violet-500', text: 'text-white', ring: 'ring-violet-300', shadow: 'shadow-violet-500/30' },
};

// Digital Stitch Counter Component - looks like physical counter
function StitchCounter({ 
  label, 
  count, 
  onIncrement, 
  onDecrement,
  color,
  size = 'md',
  isTotal = false,
}: { 
  label: string; 
  count: number; 
  onIncrement: () => void; 
  onDecrement: () => void;
  color: typeof counterColors.total;
  size?: 'sm' | 'md' | 'lg';
  isTotal?: boolean;
}) {
  const sizes = {
    sm: { counter: 'w-20 h-20', text: 'text-2xl', label: 'text-xs' },
    md: { counter: 'w-28 h-28', text: 'text-4xl', label: 'text-sm' },
    lg: { counter: 'w-36 h-36', text: 'text-5xl', label: 'text-base' },
  };
  const s = sizes[size];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Counter body - mimics physical stitch counter */}
      <div className={`relative ${s.counter}`}>
        {/* Outer ring - like the barrel of a stitch counter */}
        <div className={`
          absolute inset-0 rounded-full 
          ${color.bg} ${color.shadow}
          shadow-lg ring-4 ${color.ring} ring-opacity-30
        `}>
          {/* Inner display - the number window */}
          <div className="absolute inset-2 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center shadow-inner">
            <motion.span 
              key={count}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`${s.text} font-bold font-mono text-neutral-800 dark:text-neutral-100`}
            >
              {count.toString().padStart(2, '0')}
            </motion.span>
          </div>
        </div>
        
        {/* Click areas - left to decrement, right to increment */}
        <button 
          onClick={onDecrement}
          disabled={isTotal}
          className="absolute left-0 top-0 w-1/2 h-full rounded-l-full hover:bg-black/5 active:bg-black/10 transition-colors disabled:pointer-events-none"
          aria-label="Decrease"
        />
        <button 
          onClick={onIncrement}
          disabled={isTotal}
          className="absolute right-0 top-0 w-1/2 h-full rounded-r-full hover:bg-black/5 active:bg-black/10 transition-colors disabled:pointer-events-none"
          aria-label="Increase"
        />
        
        {/* Plus/Minus indicators */}
        {!isTotal && (
          <>
            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <Minus className="w-2.5 h-2.5 text-white/70" />
            </div>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="w-2.5 h-2.5 text-white/70" />
            </div>
          </>
        )}
      </div>
      
      {/* Label */}
      <Text variant="label-sm" className={`${s.label} font-medium text-content-muted uppercase tracking-wide`}>
        {label}
      </Text>
    </div>
  );
}

// Social feed preview
function SocialPreview() {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(47);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden max-w-sm">
      {/* Header */}
      <div className="p-3 flex items-center gap-3">
        <Avatar name="Sarah K." size="sm" variant="primary" />
        <div>
          <Text variant="label-sm">Sarah K.</Text>
          <Text variant="body-xs" color="muted">Just now</Text>
        </div>
      </div>
      
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-coral-100 to-teal-100 dark:from-coral-900 dark:to-teal-900 flex items-center justify-center">
        <span className="text-8xl">🧥</span>
      </div>
      
      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={handleLike} className="flex items-center gap-1 group">
            <Heart className={`w-5 h-5 transition-colors ${liked ? 'fill-coral-500 text-coral-500' : 'text-content-muted group-hover:text-coral-500'}`} />
            <Text variant="label-sm">{likeCount}</Text>
          </button>
          <button className="flex items-center gap-1 group">
            <MessageCircle className="w-5 h-5 text-content-muted group-hover:text-teal-500 transition-colors" />
            <Text variant="label-sm">12</Text>
          </button>
        </div>
        <Text variant="body-sm">
          <span className="font-semibold">Sarah K.</span> Finally finished my first sweater! 🎉 3 months in the making but so worth it.
        </Text>
      </div>
    </Card>
  );
}

export default function LandingPage() {
  const [counters, setCounters] = useState({ body: 7, sleeve1: 0, sleeve2: 0 });
  const [currentRow, setCurrentRow] = useState(7);
  const [isListening, setIsListening] = useState(false);

  // Total is sum of all section counters
  const total = counters.body + counters.sleeve1 + counters.sleeve2;

  const updateCounter = (section: keyof typeof counters, delta: number) => {
    setCounters(prev => ({
      ...prev,
      [section]: Math.max(0, prev[section] + delta)
    }));
    
    // Update current row based on body counter
    if (section === 'body') {
      setCurrentRow(prev => Math.max(1, Math.min(10, prev + delta)));
    }
  };

  const resetCounters = () => {
    setCounters({ body: 0, sleeve1: 0, sleeve2: 0 });
    setCurrentRow(1);
  };

  // Toggle listening demo
  const toggleListening = () => {
    setIsListening(!isListening);
    // Auto turn off after 3 seconds for demo
    if (!isListening) {
      setTimeout(() => setIsListening(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-coral-200/20 dark:bg-coral-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-teal-200/20 dark:bg-teal-900/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-coral-500 flex items-center justify-center shadow-primary">
              <span className="text-lg">🧶</span>
            </div>
            <span className="text-xl font-bold font-display text-content">Stitch</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link to="/register">Sign up free</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Hero text */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-content mb-4">
            Track every stitch,{' '}
            <span className="text-coral-500">hands-free</span>
          </h1>
          <p className="text-lg text-content-muted max-w-2xl mx-auto">
            Try it out — tap the counters, use voice commands, see how Stitch makes knitting easier
          </p>
        </motion.div>

        {/* Main interactive demo area */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Left: Pattern instructions */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card variant="elevated" padding="none" className="overflow-hidden">
              <div className="p-4 border-b border-border-subtle bg-gradient-to-r from-coral-50 to-teal-50 dark:from-coral-950/50 dark:to-teal-950/50">
                <Text variant="label-lg">Cozy Cable Sweater</Text>
                <Text variant="body-xs" color="muted">Body Section • Row {currentRow} of 64</Text>
                <div className="mt-2 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-coral-500 to-teal-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentRow / 64) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
              
              <div className="p-4 max-h-80 overflow-y-auto">
                {patternInstructions.map((row, i) => (
                  <motion.div
                    key={row.row}
                    initial={{ opacity: 0.5 }}
                    animate={{ 
                      opacity: row.row === currentRow ? 1 : 0.5,
                      scale: row.row === currentRow ? 1 : 0.98,
                    }}
                    className={`
                      p-3 rounded-xl mb-2 transition-all
                      ${row.row === currentRow 
                        ? 'bg-coral-50 dark:bg-coral-950/50 border-2 border-coral-200 dark:border-coral-800' 
                        : row.row < currentRow 
                          ? 'bg-neutral-100 dark:bg-neutral-800/50 opacity-60'
                          : 'bg-white dark:bg-neutral-800/30'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${row.row === currentRow 
                          ? 'bg-coral-500 text-white' 
                          : row.row < currentRow
                            ? 'bg-teal-500 text-white'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-content-muted'
                        }
                      `}>
                        {row.row < currentRow ? '✓' : row.row}
                      </span>
                      <Text variant="body-sm" className={row.row === currentRow ? 'font-medium' : ''}>
                        {row.instruction}
                      </Text>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Center: Counters */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-6">
                <Text variant="label-lg">Row Counters</Text>
                <button 
                  onClick={resetCounters}
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Reset all counters"
                >
                  <RotateCcw className="w-4 h-4 text-content-muted" />
                </button>
              </div>
              
              {/* Total counter - larger */}
              <div className="flex justify-center mb-8">
                <StitchCounter
                  label="Total Rows"
                  count={total}
                  onIncrement={() => {}}
                  onDecrement={() => {}}
                  color={counterColors.total}
                  size="lg"
                  isTotal
                />
              </div>
              
              {/* Section counters */}
              <div className="flex justify-center gap-4 flex-wrap">
                <StitchCounter
                  label="Body"
                  count={counters.body}
                  onIncrement={() => updateCounter('body', 1)}
                  onDecrement={() => updateCounter('body', -1)}
                  color={counterColors.body}
                  size="sm"
                />
                <StitchCounter
                  label="Left Sleeve"
                  count={counters.sleeve1}
                  onIncrement={() => updateCounter('sleeve1', 1)}
                  onDecrement={() => updateCounter('sleeve1', -1)}
                  color={counterColors.sleeve1}
                  size="sm"
                />
                <StitchCounter
                  label="Right Sleeve"
                  count={counters.sleeve2}
                  onIncrement={() => updateCounter('sleeve2', 1)}
                  onDecrement={() => updateCounter('sleeve2', -1)}
                  color={counterColors.sleeve2}
                  size="sm"
                />
              </div>
              
              <Text variant="body-xs" color="muted" className="text-center mt-6">
                Tap left side to decrease, right side to increase
              </Text>
            </Card>
          </motion.div>

          {/* Right: Voice commands */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            <Card variant="elevated" padding="lg">
              <div className="flex items-center gap-2 mb-6">
                <Mic className="w-5 h-5 text-coral-500" />
                <Text variant="label-lg">Voice Commands</Text>
              </div>
              
              <Text variant="body-sm" color="muted" className="mb-6">
                Keep your hands on your needles. Tap the mic and say a command:
              </Text>
              
              {/* Mic button */}
              <div className="flex justify-center mb-6">
                <motion.button
                  onClick={toggleListening}
                  className={`
                    w-20 h-20 rounded-full flex items-center justify-center
                    transition-all shadow-lg
                    ${isListening 
                      ? 'bg-coral-500 text-white shadow-coral-500/30 ring-4 ring-coral-200' 
                      : 'bg-neutral-100 dark:bg-neutral-800 text-content-muted hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }
                  `}
                  animate={isListening ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
                >
                  {isListening ? (
                    <Mic className="w-8 h-8" />
                  ) : (
                    <MicOff className="w-8 h-8" />
                  )}
                </motion.button>
              </div>
              
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center mb-6"
                  >
                    <Text variant="label-sm" className="text-coral-500">
                      Listening...
                    </Text>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Commands list */}
              <div className="space-y-2">
                {voiceCommands.map((cmd, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    <Text variant="label-sm" className="text-coral-600 dark:text-coral-400">
                      {cmd.text}
                    </Text>
                    <Text variant="body-xs" color="muted">
                      {cmd.action}
                    </Text>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <Text variant="body-xs" className="text-teal-700 dark:text-teal-300">
                    Also works with Siri and Google Assistant
                  </Text>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Social section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <Badge variant="secondary" size="lg" className="mb-4">
              <Users className="w-4 h-4 mr-1" />
              Join the community
            </Badge>
            <h2 className="text-2xl font-bold font-display text-content">
              50,000+ knitters sharing their journey
            </h2>
          </div>
          
          <div className="flex justify-center gap-6 flex-wrap">
            <SocialPreview />
            
            {/* Stats cards */}
            <div className="flex flex-col gap-4 justify-center">
              <Card variant="filled" padding="md" className="text-center">
                <Text variant="display-xs" className="text-coral-500">200K+</Text>
                <Text variant="body-xs" color="muted">Projects tracked</Text>
              </Card>
              <Card variant="filled" padding="md" className="text-center">
                <Text variant="display-xs" className="text-teal-500">10M+</Text>
                <Text variant="body-xs" color="muted">Rows counted</Text>
              </Card>
              <Card variant="filled" padding="md" className="text-center">
                <Text variant="display-xs" className="text-amber-500">5K+</Text>
                <Text variant="body-xs" color="muted">Patterns</Text>
              </Card>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center pb-12"
        >
          <Card 
            variant="elevated" 
            padding="xl" 
            className="max-w-lg mx-auto bg-gradient-to-br from-coral-500 to-coral-600 border-0"
          >
            <span className="text-5xl mb-4 block">🧶</span>
            <h2 className="text-2xl font-bold font-display text-white mb-2">
              Ready to start your project?
            </h2>
            <p className="text-white/80 mb-6">
              Free forever. No credit card required.
            </p>
            <Button 
              variant="outline" 
              size="xl"
              className="bg-white text-coral-600 border-white hover:bg-white/90"
              asChild
            >
              <Link to="/register">
                Create free account
                <ChevronRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
            <p className="text-white/60 text-sm mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-white underline hover:no-underline">
                Log in
              </Link>
            </p>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-coral-500 flex items-center justify-center">
              <span className="text-sm">🧶</span>
            </div>
            <Text variant="label-sm">Stitch</Text>
            <Text variant="body-xs" color="muted">• Knitting & Crochet Tracker</Text>
          </div>
          <Text variant="body-xs" color="muted">
            © 2024 Stitch App
          </Text>
        </div>
      </footer>

      {/* Hidden SEO */}
      <div className="sr-only">
        <h1>Stitch - Knitting & Crochet Project Tracker App with Row Counter</h1>
        <p>
          Stitch is the best knitting app and crochet tracker. Features include digital row counter, 
          stitch counter, voice commands, pattern organizer, and knitting community.
        </p>
      </div>
    </div>
  );
}
