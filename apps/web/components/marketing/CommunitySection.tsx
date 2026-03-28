'use client'

import { motion } from 'framer-motion'
import { Users, Star, CalendarDays } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const feedEvents = [
  { user: 'Sarah K.', action: 'finished knitting', item: 'Weekender Sweater', emoji: '🧶' },
  { user: 'Maya R.', action: 'hit row 200 on', item: 'Lace Shawl', emoji: '🔥' },
  { user: 'Jules P.', action: 'started', item: 'Baby Blanket', emoji: '🎉' },
]

const heatmapLevels = [0,0,1,0,2,1,0,3,2,1,0,0,1,2,3,2,1,0,0,1,0,2,3,3,2,1,0,0,1,2,1,0,0,2,3,2,1,0,1,2,3,2,0,0,1,2,1,0]
const heatmapColors = ['bg-background-muted', 'bg-teal-200 dark:bg-teal-900', 'bg-teal-400 dark:bg-teal-700', 'bg-teal-600 dark:bg-teal-500']

export default function CommunitySection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-surface">
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
            A crafting community, not a content platform
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-content-secondary max-w-2xl mx-auto">
            See what friends are making, review patterns you have finished, and track your crafting streak. All free.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Social feed */}
          <motion.div
            className="p-6 rounded-2xl bg-background border border-border-default"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Users size={28} className="text-coral-500 mb-4" />
            <h3 className="text-lg font-semibold text-content-default mb-3">Social feed</h3>
            <p className="text-sm text-content-secondary leading-relaxed mb-5">
              A Letterboxd-style feed of crafting activity. Automatic events when you start or finish a project, hit a milestone, or add to your stash. Plus manual posts with photos for everything in between.
            </p>
            <div className="space-y-3 p-4 bg-background-muted rounded-xl">
              {feedEvents.map((e) => (
                <div key={e.user + e.item} className="flex items-start gap-2.5 text-xs">
                  <span className="text-base leading-none mt-0.5">{e.emoji}</span>
                  <p className="text-content-default">
                    <span className="font-semibold">{e.user}</span>
                    {' '}<span className="text-content-secondary">{e.action}</span>
                    {' '}<span className="font-medium">{e.item}</span>
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pattern reviews */}
          <motion.div
            className="p-6 rounded-2xl bg-background border border-border-default"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Star size={28} className="text-coral-500 mb-4" />
            <h3 className="text-lg font-semibold text-content-default mb-3">Pattern reviews</h3>
            <p className="text-sm text-content-secondary leading-relaxed mb-5">
              Rate patterns Letterboxd-style when you finish a project. Overall rating, difficulty rating, written review, and &ldquo;would make again.&rdquo; Help the community find great patterns through honest reviews.
            </p>
            <div className="p-4 bg-background-muted rounded-xl">
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={16} className={s <= 4 ? 'text-coral-500 fill-coral-500' : 'text-border-default'} />
                ))}
                <span className="text-xs text-content-secondary ml-2">4.0</span>
              </div>
              <p className="text-xs text-content-default leading-relaxed">
                &ldquo;Clear instructions, well-graded sizes. The short rows section was tricky but the result is beautiful. Would definitely make again in a different colorway.&rdquo;
              </p>
              <p className="text-xs text-content-tertiary mt-2">— Sarah K. on Weekender Sweater</p>
            </div>
          </motion.div>

          {/* Heatmap */}
          <motion.div
            className="p-6 rounded-2xl bg-background border border-border-default"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CalendarDays size={28} className="text-teal-500 mb-4" />
            <h3 className="text-lg font-semibold text-content-default mb-3">Activity heatmap</h3>
            <p className="text-sm text-content-secondary leading-relaxed mb-5">
              A GitHub-contributions-style calendar of your crafting year. See busy weeks, track streaks, and watch your making add up over time. Powered by a built-in timer, manual entry, or auto-tracking from the counter.
            </p>
            <div className="p-4 bg-background-muted rounded-xl">
              <div className="grid grid-cols-12 gap-1 mb-3">
                {heatmapLevels.map((level, i) => (
                  <div key={i} className={`aspect-square rounded-sm ${heatmapColors[level]}`} />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-content-tertiary">
                <span>142 hours this year</span>
                <span>12 day streak</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
