'use client'

import { motion } from 'framer-motion'
import { Sparkles, Ruler, Palette, Clock, BookOpen, Zap, Package, Pipette, PenTool } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const tools = [
  { icon: PenTool, name: 'AI pattern builder', description: 'Generate original patterns from a guided questionnaire. Deterministic math for construction, AI for polished prose instructions. Hats, sweaters, socks, mittens, scarves, blankets.' },
  { icon: Sparkles, name: 'Stash-to-pattern match', description: 'Find patterns that work with yarn you already own, based on weight, yardage, and fiber content.' },
  { icon: Package, name: 'Stash planner', description: 'Pick a pattern and see which yarns in your stash are compatible — with multi-strand combo suggestions.' },
  { icon: Ruler, name: 'Size recommendation', description: 'Enter your body measurements and get the best size for any pattern, with ease preferences by garment type.' },
  { icon: Palette, name: 'Yarn substitution', description: 'Swap yarn in a pattern and get adjusted needle size, gauge, and yardage calculations. Handles multi-strand combos.' },
  { icon: Pipette, name: 'Yarn equivalence', description: 'Find yarns similar to one you love. Fiber-aware matching with drop-in, close, and workable verdicts.' },
  { icon: Clock, name: 'Time estimator', description: 'Predicted finish date based on your crafting pace from session tracking. Adjusts as you knit.' },
  { icon: BookOpen, name: 'Row explainer', description: 'Confused by an instruction? Get a plain-English breakdown of any pattern row. Free for everyone.' },
  { icon: Zap, name: 'Gauge conversion', description: 'Knitting at a different gauge than the pattern? AI rewrites the row counts and stitch counts for you.' },
]

export default function AIToolsSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-coral-500 mb-3">
            <Sparkles size={16} />
            Powered by AI
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-content-default">
            Smart tools, not a chatbot
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-content-secondary max-w-2xl mx-auto">
            AI works behind the scenes — no typing prompts, no chat windows. Tap a button and get answers built from your stash, your gauge, and your projects. Context-aware recommendations, not generic suggestions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.name}
              className="flex items-start gap-4 p-4 sm:p-5 rounded-xl bg-surface border border-border-default"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <div className="w-10 h-10 rounded-lg bg-coral-50 dark:bg-coral-500/10 flex items-center justify-center shrink-0">
                <tool.icon size={20} className="text-coral-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-content-default">{tool.name}</h4>
                <p className="text-xs text-content-secondary mt-1 leading-relaxed">{tool.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-content-tertiary mt-8">
          9 AI tools included with Pro. Row explainer and pattern builder templates are free for everyone.
        </p>
      </div>
    </section>
  )
}
