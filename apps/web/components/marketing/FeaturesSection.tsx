'use client'

import { motion } from 'framer-motion'
import {
  Hash,
  FileText,
  Package,
  RefreshCw,
  Users,
  CalendarDays,
  Sparkles,
  ShoppingBag,
  Compass,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

interface Feature {
  icon: LucideIcon
  tag: string
  tagColor: 'coral' | 'teal'
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: Hash, tag: 'Free', tagColor: 'teal',
    title: 'Row counter with instructions',
    description: 'Tap to count rows while following step-by-step pattern instructions. Track multiple sections — front, back, sleeves — each with their own counter. Full undo history so mistakes are never permanent.',
  },
  {
    icon: FileText, tag: 'Free / Pro', tagColor: 'coral',
    title: 'PDF upload and AI parsing',
    description: 'Upload any knitting or crochet PDF. AI extracts sections, row-by-row instructions, stitch counts, and available sizes. Free users can upload PDFs manually; Pro unlocks AI parsing.',
  },
  {
    icon: Sparkles, tag: 'Free / Pro', tagColor: 'coral',
    title: 'Pattern builder',
    description: 'Create original patterns from scratch with a guided questionnaire. Pick project type, yarn, and options — the math engine handles cast-ons, decreases, and shaping. Free gets instant templates; Pro gets AI-polished prose.',
  },
  {
    icon: Package, tag: 'Free', tagColor: 'teal',
    title: 'Yarn stash and tools',
    description: 'Catalog every skein with photos, colorways, and yardage. Track needles, hooks, and notions. Link yarn to projects so you always know what went where and what you have left.',
  },
  {
    icon: ShoppingBag, tag: 'Free', tagColor: 'teal',
    title: 'Pattern marketplace',
    description: 'Buy and sell knitting patterns. Designers set their price, buyers get a watermarked PDF. Stripe Connect handles payments. Browse, purchase, and start knitting — all in one place.',
  },
  {
    icon: Compass, tag: 'Free', tagColor: 'teal',
    title: 'Pattern discovery',
    description: 'Search the Ravelry catalog by craft, category, weight, and difficulty. Save patterns to your library, add them to your queue, or start a project directly. Discover your next cast-on.',
  },
  {
    icon: RefreshCw, tag: 'Free import', tagColor: 'teal',
    title: 'Ravelry import and sync',
    description: 'Connect your Ravelry account to import projects, stash, queue, and needles in one tap. Optional write-back keeps both platforms in sync. First import is free for everyone.',
  },
  {
    icon: Users, tag: 'Free', tagColor: 'teal',
    title: 'Social feed and reviews',
    description: 'Share progress, celebrate finishes, and see what friends are making. Rate patterns Letterboxd-style with star ratings and written reviews. A community built for makers, not algorithms.',
  },
  {
    icon: CalendarDays, tag: 'Free', tagColor: 'teal',
    title: 'Crafting activity heatmap',
    description: 'Track sessions with a built-in timer, manual entry, or auto-tracking from the row counter. See your crafting year at a glance with a GitHub-style activity calendar. Streaks and totals included.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-content-default">
            Everything you need to craft
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-content-secondary max-w-2xl mx-auto">
            From your first cast-on to your hundredth finished object, Stitch keeps track of it all. Most features are free — forever.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="p-5 sm:p-6 rounded-2xl bg-surface border border-border-default hover:border-border-emphasis hover:shadow-md transition-all duration-200"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-coral-50 dark:bg-coral-500/10 flex items-center justify-center">
                  <feature.icon size={22} className="text-coral-500" />
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  feature.tagColor === 'coral'
                    ? 'bg-coral-50 dark:bg-coral-500/10 text-coral-600 dark:text-coral-400'
                    : 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400'
                }`}>
                  {feature.tag}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-content-default mb-1.5 sm:mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-content-secondary leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
