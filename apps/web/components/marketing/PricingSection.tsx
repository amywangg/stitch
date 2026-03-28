'use client'

import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const freeFeatures = [
  'Unlimited row counter',
  'Unlimited stash and needles',
  '3 active projects',
  '15 saved patterns',
  'PDF upload (manual metadata)',
  '2 AI PDF parses per month',
  'Pattern builder (instant templates)',
  'Buy and sell patterns',
  'Pattern reviews and ratings',
  'Social feed and posting',
  'Ravelry search and first import',
  'Row instruction explainer',
  'Activity heatmap and streaks',
]

const freeExclusions = ['Cross-device sync', 'AI tools', 'Ravelry auto-sync']

const plusFeatures = [
  'Unlimited active projects',
  'Unlimited saved patterns',
  '5 AI PDF parses per month',
  'Cross-device realtime sync',
]

const plusExclusions = ['AI tools (9 routes)', 'Ravelry auto re-sync', 'Unlimited PDF parsing']

const proFeatures = [
  'AI pattern builder (polished prose)',
  'Stash planner and pattern matching',
  'Size recommendation engine',
  'Yarn substitution and equivalence',
  'Time-to-finish estimator',
  'Gauge conversion tool',
  'AI colorway identification',
  'Unlimited AI PDF parsing',
  'Ravelry auto re-sync',
]

export default function PricingSection() {
  return (
    <section id="pricing" className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-content-default">
            Start free, grow when you are ready
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-content-secondary max-w-2xl mx-auto">
            Every new account starts with 14 days of full Pro access. No credit card, no commitment. After that, choose what works for you.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
          {/* Free */}
          <motion.div
            className="p-6 sm:p-8 rounded-2xl bg-background border border-border-default flex flex-col"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-bold text-content-default">Free</h3>
            <p className="mt-1 text-content-secondary text-sm">The essentials</p>
            <p className="mt-5 text-4xl font-bold text-content-default">$0</p>
            <p className="text-xs text-content-tertiary mt-1">Forever</p>
            <div className="mt-6 flex-1">
              <ul className="space-y-3">
                {freeFeatures.map((text) => (
                  <li key={text} className="flex items-start gap-2.5 text-sm">
                    <Check size={16} className="text-teal-500 mt-0.5 shrink-0" />
                    <span className="text-content-default">{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-4 border-t border-border-default">
                <p className="text-xs text-content-tertiary">Not included:</p>
                <ul className="mt-2 space-y-2">
                  {freeExclusions.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-sm">
                      <X size={16} className="text-content-tertiary mt-0.5 shrink-0" />
                      <span className="text-content-tertiary">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <a href="#download" className="mt-6 block w-full text-center px-6 py-3 rounded-xl border border-border-default text-content-default font-semibold hover:bg-background-muted transition-colors text-sm">
              Get started free
            </a>
          </motion.div>

          {/* Plus */}
          <motion.div
            className="p-6 sm:p-8 rounded-2xl bg-background border-2 border-teal-500 relative flex flex-col"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="absolute -top-3 left-6 sm:left-8 px-3 py-1 bg-teal-500 text-white text-xs font-semibold rounded-full">
              Popular
            </div>
            <h3 className="text-xl font-bold text-content-default">Plus</h3>
            <p className="mt-1 text-content-secondary text-sm">For active makers</p>
            <p className="mt-5">
              <span className="text-4xl font-bold text-content-default">$1.99</span>
              <span className="text-content-secondary text-sm">/month</span>
            </p>
            <p className="text-xs text-content-tertiary mt-1">or $14.99/year (save 37%)</p>
            <div className="mt-6 flex-1">
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mb-3 uppercase tracking-wider">Everything in Free, plus:</p>
              <ul className="space-y-3">
                {plusFeatures.map((text) => (
                  <li key={text} className="flex items-start gap-2.5 text-sm">
                    <Check size={16} className="text-teal-500 mt-0.5 shrink-0" />
                    <span className="text-content-default">{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-4 border-t border-border-default">
                <p className="text-xs text-content-tertiary">Not included:</p>
                <ul className="mt-2 space-y-2">
                  {plusExclusions.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-sm">
                      <X size={16} className="text-content-tertiary mt-0.5 shrink-0" />
                      <span className="text-content-tertiary">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <a href="#download" className="mt-6 block w-full text-center px-6 py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors text-sm">
              Start 14-day trial
            </a>
          </motion.div>

          {/* Pro */}
          <motion.div
            className="p-6 sm:p-8 rounded-2xl bg-background border-2 border-coral-500 relative flex flex-col"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="absolute -top-3 left-6 sm:left-8 px-3 py-1 bg-coral-500 text-white text-xs font-semibold rounded-full">
              Most powerful
            </div>
            <h3 className="text-xl font-bold text-content-default">Pro</h3>
            <p className="mt-1 text-content-secondary text-sm">For dedicated crafters</p>
            <p className="mt-5">
              <span className="text-4xl font-bold text-content-default">$4.99</span>
              <span className="text-content-secondary text-sm">/month</span>
            </p>
            <p className="text-xs text-content-tertiary mt-1">or $34.99/year (save 42%)</p>
            <div className="mt-6 flex-1">
              <p className="text-xs font-semibold text-coral-600 dark:text-coral-400 mb-3 uppercase tracking-wider">Everything in Plus, plus:</p>
              <ul className="space-y-3">
                {proFeatures.map((text) => (
                  <li key={text} className="flex items-start gap-2.5 text-sm">
                    <Check size={16} className="text-coral-500 mt-0.5 shrink-0" />
                    <span className="text-content-default">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <a href="#download" className="mt-6 block w-full text-center px-6 py-3 rounded-xl bg-coral-500 text-white font-semibold hover:bg-coral-600 transition-colors text-sm shadow-lg shadow-coral-500/20">
              Start 14-day trial
            </a>
          </motion.div>
        </div>

        {/* Pricing footer */}
        <motion.div
          className="mt-10 sm:mt-12 max-w-3xl mx-auto text-center space-y-4"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm text-content-secondary">
            <span className="font-semibold text-content-default">Lifetime option:</span> $99.99 one-time purchase — all Pro features, no subscription, forever.
          </p>
          <p className="text-sm text-content-secondary">
            All plans include the 14-day Pro trial. Your data is never deleted when a trial ends or a plan changes — you just lose access to the gated features until you upgrade.
          </p>
          <p className="text-xs text-content-tertiary">
            Prices in USD. iOS subscriptions managed through the App Store. Cancel anytime.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
