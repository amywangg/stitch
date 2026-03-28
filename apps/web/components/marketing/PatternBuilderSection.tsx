'use client'

import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const projectTypes = [
  { emoji: '🧢', name: 'Hat', detail: 'Beanie, slouchy, beret, watch cap' },
  { emoji: '🧥', name: 'Sweater', detail: 'Raglan, yoke, set-in, drop shoulder' },
  { emoji: '🧦', name: 'Socks', detail: 'Cuff-down, toe-up, 4 heel types' },
  { emoji: '🧤', name: 'Mittens', detail: 'Full, fingerless, convertible' },
  { emoji: '🧣', name: 'Scarf / Cowl', detail: 'Flat, circular, bias, mobius' },
  { emoji: '🛏️', name: 'Blanket', detail: 'Single piece, mitered, log cabin' },
]

const steps = [
  { num: '1', label: 'Pick a project', desc: 'Tap one of six project types' },
  { num: '2', label: 'Choose your yarn', desc: 'From your stash or by weight' },
  { num: '3', label: 'Set options', desc: 'Construction, neckline, heel — all buttons' },
  { num: '4', label: 'Pick a size', desc: 'Or let your measurements decide' },
]

export default function PatternBuilderSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Mock questionnaire */}
          <motion.div
            className="bg-background rounded-3xl border border-border-default overflow-hidden order-2 md:order-1"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="px-6 py-4 border-b border-border-default">
              <p className="text-xs text-content-tertiary uppercase tracking-wider">Step 1 of 5</p>
              <p className="text-sm font-medium text-content-default mt-0.5">What are you making?</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {projectTypes.map((type, i) => (
                <motion.div
                  key={type.name}
                  className={`p-3.5 rounded-xl border text-center cursor-default transition-colors ${
                    i === 0
                      ? 'border-coral-500 bg-coral-50 dark:bg-coral-500/10'
                      : 'border-border-default bg-surface hover:border-border-emphasis'
                  }`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <p className={`text-xs font-semibold mt-1 ${i === 0 ? 'text-coral-600 dark:text-coral-400' : 'text-content-default'}`}>
                    {type.name}
                  </p>
                  <p className="text-[10px] text-content-tertiary mt-0.5 leading-tight">{type.detail}</p>
                </motion.div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-border-default flex items-center justify-between">
              <div className="flex gap-1">
                {[1,2,3,4,5].map((s) => (
                  <div key={s} className={`w-8 h-1 rounded-full ${s === 1 ? 'bg-coral-500' : 'bg-border-default'}`} />
                ))}
              </div>
              <span className="text-xs font-medium text-coral-500">Next</span>
            </div>
          </motion.div>

          <motion.div
            className="order-1 md:order-2"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <p className="text-sm font-medium text-coral-500 mb-2">Create, not just follow</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-content-default mb-5">
              Build a pattern in under a minute
            </h2>
            <p className="text-base sm:text-lg text-content-secondary leading-relaxed mb-6">
              A guided questionnaire turns your choices into a complete pattern — with precise stitch counts, decrease schedules, and shaping math. No knitting math required. Just tap through the options.
            </p>

            <div className="space-y-4 mb-6">
              {steps.map((s) => (
                <div key={s.num} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-coral-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {s.num}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-content-default">{s.label}</p>
                    <p className="text-sm text-content-secondary">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                Free: instant templates
              </span>
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-coral-50 dark:bg-coral-500/10 text-coral-600 dark:text-coral-400">
                Pro: AI-polished prose
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
