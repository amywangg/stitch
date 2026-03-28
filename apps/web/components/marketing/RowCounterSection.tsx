'use client'

import { motion } from 'framer-motion'
import { Layers, RotateCcw, Smartphone, Activity } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const highlights = [
  { icon: Layers, title: 'Multi-section tracking', text: 'Front, back, sleeves, collar — each section has its own counter with independent progress.' },
  { icon: RotateCcw, title: 'Full undo history', text: 'Every increment and decrement is recorded. Undo a tap, undo ten. Never lose your place.' },
  { icon: Smartphone, title: 'Cross-device sync', text: 'Pick up on another device right where you left off. Realtime sync via Supabase keeps counters in lockstep.' },
  { icon: Activity, title: 'Haptic feedback', text: 'Satisfying tactile feedback on every row. The counter is designed to be used without looking at the screen.' },
]

export default function RowCounterSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-medium text-coral-500 mb-2">The daily companion</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-content-default mb-5">
              A row counter that knows your pattern
            </h2>
            <p className="text-base sm:text-lg text-content-secondary leading-relaxed mb-8">
              Most row counters are just a number. Stitch connects your counter to actual pattern instructions — so you always know what to do on the current row, not just which row you are on.
            </p>
            <div className="space-y-5">
              {highlights.map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-coral-50 dark:bg-coral-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon size={20} className="text-coral-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-content-default">{item.title}</h4>
                    <p className="text-sm text-content-secondary mt-0.5 leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Mock iOS counter screen */}
          <motion.div
            className="bg-background rounded-3xl border border-border-default overflow-hidden"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Header */}
            <div className="px-6 py-3 border-b border-border-default bg-background-muted flex items-center justify-between">
              <div>
                <p className="text-xs text-content-tertiary">Cozy Cardigan</p>
                <p className="text-sm font-medium text-content-default">Back panel</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-xs text-content-tertiary tabular-nums">23:14</span>
              </div>
            </div>

            {/* Counter */}
            <div className="p-8 sm:p-10 text-center">
              <div className="text-8xl sm:text-9xl font-bold text-coral-500 tabular-nums leading-none">47</div>
              <p className="text-lg text-content-secondary mt-3 font-medium">of 76 rows</p>
              <div className="mt-5 mx-auto max-w-xs">
                <div className="w-full bg-border-default rounded-full h-2">
                  <div className="bg-coral-500 h-2 rounded-full transition-all" style={{ width: '62%' }} />
                </div>
              </div>
            </div>

            {/* Current instruction */}
            <div className="mx-6 mb-4 p-4 bg-surface rounded-xl border border-border-default">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-content-tertiary uppercase tracking-wider">Row 47 — RS</p>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">84 sts</span>
              </div>
              <p className="text-sm text-content-default">Knit across all 84 stitches. Place marker at stitch 42.</p>
            </div>

            {/* Previous/next preview */}
            <div className="mx-6 mb-6 flex gap-2">
              <div className="flex-1 p-2.5 bg-background-muted rounded-lg">
                <p className="text-[10px] text-content-tertiary">Row 46</p>
                <p className="text-xs text-content-secondary truncate">Purl across (84 sts)</p>
              </div>
              <div className="flex-1 p-2.5 bg-background-muted rounded-lg">
                <p className="text-[10px] text-content-tertiary">Row 48</p>
                <p className="text-xs text-content-secondary truncate">K2, *yo, k2tog* to last 2, k2</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
