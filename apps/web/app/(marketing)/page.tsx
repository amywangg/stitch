'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Hash,
  FileText,
  Package,
  RefreshCw,
  Users,
  CalendarDays,
  Check,
  X,
  ArrowRight,
  Sparkles,
  Ruler,
  Clock,
  Palette,
  Star,
  Heart,
  BookOpen,
  Zap,
  Shield,
  Award,
  Flame,
  Smartphone,
  RotateCcw,
  Layers,
  Activity,
} from 'lucide-react'

// ─── Hero images ─────────────────────────────────────────────────────────────

const heroImages = [
  {
    src: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400&h=500&fit=crop',
    alt: 'Colorful yarn skeins',
    position: 'top-[8%] -left-4 md:left-[2%]',
    size: 'w-28 h-36 sm:w-36 sm:h-44 md:w-48 md:h-60',
    rotate: '-rotate-6',
    mobile: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=400&h=500&fit=crop',
    alt: 'Knitting needles and yarn',
    position: 'top-[4%] left-[18%]',
    size: 'w-44 h-52',
    rotate: 'rotate-3',
    mobile: false,
  },
  {
    src: 'https://images.unsplash.com/photo-1585399058947-f68f22781564?w=400&h=500&fit=crop',
    alt: 'Hand-knit sweater',
    position: 'top-[10%] -right-4 md:right-[2%]',
    size: 'w-28 h-36 sm:w-36 sm:h-44 md:w-48 md:h-60',
    rotate: 'rotate-6',
    mobile: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1597843786411-a7fa8ad44a95?w=400&h=500&fit=crop',
    alt: 'Knitting in progress',
    position: 'top-[6%] right-[20%]',
    size: 'w-40 h-48',
    rotate: '-rotate-3',
    mobile: false,
  },
  {
    src: 'https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?w=400&h=500&fit=crop',
    alt: 'Wool yarn balls',
    position: 'bottom-[14%] -left-6 md:left-[3%]',
    size: 'w-24 h-32 sm:w-32 sm:h-40 md:w-44 md:h-52',
    rotate: 'rotate-3',
    mobile: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400&h=500&fit=crop',
    alt: 'Crochet project',
    position: 'bottom-[8%] left-[20%]',
    size: 'w-40 h-48',
    rotate: '-rotate-6',
    mobile: false,
  },
  {
    src: 'https://images.unsplash.com/photo-1590767950092-42b8362368da?w=400&h=500&fit=crop',
    alt: 'Stacked yarn skeins',
    position: 'bottom-[16%] -right-6 md:right-[3%]',
    size: 'w-24 h-32 sm:w-36 sm:h-44 md:w-48 md:h-56',
    rotate: '-rotate-3',
    mobile: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=500&fit=crop',
    alt: 'Knitting pattern detail',
    position: 'bottom-[6%] right-[22%]',
    size: 'w-36 h-44',
    rotate: 'rotate-6',
    mobile: false,
  },
]

// ─── Animation ───────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-16">
        {heroImages.map((img, i) => (
          <motion.div
            key={i}
            className={`absolute ${img.position} ${img.size} ${img.rotate} z-0 ${
              img.mobile ? 'opacity-40 md:opacity-100' : 'hidden md:block'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: img.mobile ? undefined : 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 * i, ease: 'easeOut' }}
          >
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 120px, (max-width: 768px) 150px, 200px"
                priority={i < 4}
              />
            </div>
          </motion.div>
        ))}

        <div className="absolute inset-0 z-[1] bg-radial-gradient md:hidden pointer-events-none" />

        <motion.div
          className="relative z-10 text-center px-6 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-content-default leading-[1.1]">
            Where every stitch
            <br />
            <span className="text-coral-500">finds its place</span>
          </h1>
          <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-content-secondary max-w-lg mx-auto leading-relaxed">
            Track projects, parse patterns with AI, manage your stash, and connect with fellow makers. The modern knitting companion.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href="#download"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 sm:px-8 sm:py-4 bg-coral-500 text-white font-semibold rounded-full hover:bg-coral-600 transition-colors text-base sm:text-lg shadow-lg shadow-coral-500/20"
            >
              Download for iOS
              <ArrowRight size={18} />
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 sm:px-8 sm:py-4 bg-surface border border-border-default text-content-default font-semibold rounded-full hover:bg-background-muted transition-colors text-base sm:text-lg"
            >
              See what&apos;s inside
            </a>
          </div>
          <p className="mt-6 text-sm text-content-tertiary">
            Free to download. 14-day Pro trial included — no credit card needed.
          </p>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-20" />
      </section>

      {/* ── Trust bar ───────────────────────────────────────────────────── */}
      <section className="py-8 sm:py-10 px-4 sm:px-6 border-b border-border-default">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-content-secondary">
          <span className="flex items-center gap-2"><Shield size={16} className="text-teal-500" /> Ravelry data import</span>
          <span className="flex items-center gap-2"><Sparkles size={16} className="text-coral-500" /> AI-powered tools</span>
          <span className="flex items-center gap-2"><Heart size={16} className="text-coral-400" /> Social crafting feed</span>
          <span className="flex items-center gap-2"><Award size={16} className="text-teal-500" /> 14-day free trial</span>
        </div>
      </section>

      {/* ── Core features grid ──────────────────────────────────────────── */}
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
            {[
              {
                icon: Hash, tag: 'Free', tagColor: 'teal',
                title: 'Row counter with instructions',
                description: 'Tap to count rows while following step-by-step pattern instructions. Track multiple sections — front, back, sleeves — each with their own counter. Full undo history so mistakes are never permanent.',
              },
              {
                icon: FileText, tag: 'Pro', tagColor: 'coral',
                title: 'AI-powered pattern parsing',
                description: 'Upload any knitting or crochet PDF. AI extracts sections, row-by-row instructions, stitch counts, and available sizes. Pick your size, review the result, and your counter is ready to go.',
              },
              {
                icon: Package, tag: 'Free', tagColor: 'teal',
                title: 'Yarn stash and tools',
                description: 'Catalog every skein with photos, colorways, and yardage. Track needles, hooks, and notions. Link yarn to projects so you always know what went where and what you have left.',
              },
              {
                icon: RefreshCw, tag: 'Free import', tagColor: 'teal',
                title: 'Ravelry import and sync',
                description: 'Connect your Ravelry account to import projects, stash, queue, and needles in one tap. Optional write-back keeps both platforms in sync. First import is free for everyone.',
              },
              {
                icon: Users, tag: 'Free', tagColor: 'teal',
                title: 'Social feed and activity',
                description: 'Share progress, celebrate finishes, and see what friends are making. Auto-generated activity events, photo posts, emoji reactions, comments, and bookmarks. A feed built for makers.',
              },
              {
                icon: CalendarDays, tag: 'Free', tagColor: 'teal',
                title: 'Crafting activity heatmap',
                description: 'Track sessions with a built-in timer, manual entry, or auto-tracking from the row counter. See your crafting year at a glance with a GitHub-style activity calendar. Streaks and totals included.',
              },
            ].map((feature, i) => (
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

      {/* ── Deep dive: Row counter ──────────────────────────────────────── */}
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
                {[
                  { icon: Layers, title: 'Multi-section tracking', text: 'Front, back, sleeves, collar — each section has its own counter with independent progress.' },
                  { icon: RotateCcw, title: 'Full undo history', text: 'Every increment and decrement is recorded. Undo a tap, undo ten. Never lose your place.' },
                  { icon: Smartphone, title: 'Cross-device sync', text: 'Pick up on another device right where you left off. Realtime sync via Supabase keeps counters in lockstep.' },
                  { icon: Activity, title: 'Haptic feedback', text: 'Satisfying tactile feedback on every row. The counter is designed to be used without looking at the screen.' },
                ].map((item) => (
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

            {/* TODO: Replace with app screenshot of row counter */}
            <motion.div
              className="bg-background-muted rounded-3xl p-8 sm:p-12 text-center"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="text-8xl sm:text-9xl font-bold text-coral-500 tabular-nums">47</div>
              <p className="text-lg sm:text-xl text-content-secondary mt-2 font-medium">rows completed</p>
              <div className="mt-6 mx-auto max-w-xs">
                <div className="w-full bg-border-default rounded-full h-2.5">
                  <div className="bg-coral-500 h-2.5 rounded-full" style={{ width: '62%' }} />
                </div>
                <p className="text-xs text-content-tertiary mt-2">47 of 76 rows — Back panel</p>
              </div>
              <div className="mt-8 p-4 bg-surface rounded-xl border border-border-default text-left">
                <p className="text-xs text-content-tertiary uppercase tracking-wider mb-1">Row 47</p>
                <p className="text-sm text-content-default">Knit across all 84 stitches. Place marker at stitch 42.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Deep dive: Pattern parsing ──────────────────────────────────── */}
      <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* TODO: Replace with app screenshot of PDF parsing flow */}
            <motion.div
              className="bg-surface rounded-3xl border border-border-default overflow-hidden order-2 md:order-1"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="px-6 py-4 border-b border-border-default bg-background-muted">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-coral-500" />
                  <span className="text-sm font-medium text-content-default">cozy-cardigan-pattern.pdf</span>
                  <span className="text-xs text-teal-500 ml-auto font-medium">Parsed</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-content-tertiary uppercase tracking-wider mb-1">Sizes detected</p>
                  <div className="flex gap-2 flex-wrap">
                    {['XS', 'S', 'M', 'L', 'XL', '2XL'].map((s) => (
                      <span key={s} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                        s === 'M' ? 'bg-coral-500 text-white border-coral-500' : 'bg-surface border-border-default text-content-secondary'
                      }`}>{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-content-tertiary uppercase tracking-wider mb-1">Sections extracted</p>
                  <div className="space-y-2">
                    {['Back panel — 76 rows', 'Front panel (left) — 68 rows', 'Front panel (right) — 68 rows', 'Sleeves — 54 rows', 'Collar — 12 rows'].map((s) => (
                      <div key={s} className="flex items-center gap-2 text-sm text-content-default">
                        <Check size={14} className="text-teal-500 shrink-0" /> {s}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-content-tertiary uppercase tracking-wider mb-1">Gauge</p>
                  <p className="text-sm text-content-default">20 stitches and 28 rows = 10 cm in stockinette on 4.0mm needles</p>
                </div>
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
              <p className="text-sm font-medium text-coral-500 mb-2">AI pattern parsing</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-content-default mb-5">
                Drop in a PDF, start knitting
              </h2>
              <p className="text-base sm:text-lg text-content-secondary leading-relaxed mb-6">
                Upload any knitting pattern PDF and AI extracts the structure in seconds — sections, row-by-row instructions, stitch counts, and all available sizes. Pick your size, review the parsed result, and your counter is ready to go.
              </p>
              <p className="text-base sm:text-lg text-content-secondary leading-relaxed mb-6">
                No more squinting at a PDF on your phone while trying to count rows. The pattern becomes interactive — every row is a tap.
              </p>
              <div className="flex flex-wrap gap-3">
                {['Any PDF pattern', 'Size-aware parsing', 'Row-by-row extraction', 'Gauge detection', 'Review before saving'].map((h) => (
                  <span key={h} className="text-xs font-medium px-3 py-1.5 rounded-full bg-coral-50 dark:bg-coral-500/10 text-coral-600 dark:text-coral-400">
                    {h}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Deep dive: Social + Reviews + Heatmap ───────────────────────── */}
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
                {[
                  { user: 'Sarah K.', action: 'finished knitting', item: 'Weekender Sweater', emoji: '🧶' },
                  { user: 'Maya R.', action: 'hit row 200 on', item: 'Lace Shawl', emoji: '🔥' },
                  { user: 'Jules P.', action: 'started', item: 'Baby Blanket', emoji: '🎉' },
                ].map((e) => (
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
                  {Array.from({ length: 48 }, (_, i) => {
                    const levels = [0,0,1,0,2,1,0,3,2,1,0,0,1,2,3,2,1,0,0,1,0,2,3,3,2,1,0,0,1,2,1,0,0,2,3,2,1,0,1,2,3,2,0,0,1,2,1,0]
                    const colors = ['bg-background-muted', 'bg-teal-200 dark:bg-teal-900', 'bg-teal-400 dark:bg-teal-700', 'bg-teal-600 dark:bg-teal-500']
                    return <div key={i} className={`aspect-square rounded-sm ${colors[levels[i]]}`} />
                  })}
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

      {/* ── AI tools spotlight ──────────────────────────────────────────── */}
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
            {[
              { icon: Sparkles, name: 'Stash-to-pattern match', description: 'Find patterns that work with yarn you already own, based on weight, yardage, and fiber content.' },
              { icon: Ruler, name: 'Size recommendation', description: 'Enter your body measurements and get the best size for any pattern, with ease preferences by garment type.' },
              { icon: Palette, name: 'Yarn substitution', description: 'Swap yarn in a pattern and get adjusted needle size, gauge, and yardage calculations automatically.' },
              { icon: Clock, name: 'Time estimator', description: 'Predicted finish date based on your crafting pace from session tracking. Adjusts as you knit.' },
              { icon: BookOpen, name: 'Row explainer', description: 'Confused by an instruction? Get a plain-English breakdown of any pattern row. Free for everyone.' },
              { icon: Zap, name: 'Gauge conversion', description: 'Knitting at a different gauge than the pattern? AI rewrites the row counts and stitch counts for you.' },
            ].map((tool, i) => (
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
            AI tools included with Pro. Row explainer is free for everyone.
          </p>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
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
                  {[
                    'Unlimited row counter',
                    'Unlimited stash and needles',
                    '3 active projects',
                    '15 saved patterns',
                    '2 PDF uploads per month',
                    'Social feed and posting',
                    'Gauge calculator',
                    'Activity heatmap and streaks',
                    'Pattern reviews',
                    'First Ravelry import',
                    'Row instruction explainer',
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm">
                      <Check size={16} className="text-teal-500 mt-0.5 shrink-0" />
                      <span className="text-content-default">{text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-4 border-t border-border-default">
                  <p className="text-xs text-content-tertiary">Not included:</p>
                  <ul className="mt-2 space-y-2">
                    {['Cross-device sync', 'AI tools', 'Ravelry auto-sync'].map((t) => (
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
                  {[
                    'Unlimited active projects',
                    'Unlimited saved patterns',
                    '5 PDF uploads per month',
                    'Cross-device realtime sync',
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm">
                      <Check size={16} className="text-teal-500 mt-0.5 shrink-0" />
                      <span className="text-content-default">{text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-4 border-t border-border-default">
                  <p className="text-xs text-content-tertiary">Not included:</p>
                  <ul className="mt-2 space-y-2">
                    {['AI tools', 'Ravelry auto re-sync', 'Unlimited PDFs'].map((t) => (
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
              <p className="text-xs text-content-tertiary mt-1">or $39.99/year (save 33%)</p>
              <div className="mt-6 flex-1">
                <p className="text-xs font-semibold text-coral-600 dark:text-coral-400 mb-3 uppercase tracking-wider">Everything in Plus, plus:</p>
                <ul className="space-y-3">
                  {[
                    'AI-powered pattern parsing',
                    'Stash-to-pattern matching',
                    'Size recommendation engine',
                    'Yarn substitution calculator',
                    'Time-to-finish estimator',
                    'Gauge conversion tool',
                    'Unlimited PDF uploads',
                    'Ravelry auto re-sync',
                  ].map((text) => (
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

      {/* ── Brand statement ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Flame size={32} className="text-coral-500 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-content-default mb-5">
              Made by a knitter, for knitters
            </h2>
            <p className="text-base sm:text-lg text-content-secondary leading-relaxed mb-4">
              Stitch was built because Ravelry deserves a modern companion — one that works offline, respects your data, and puts your projects front and center. Not a social media platform with crafting bolted on. A crafting app with community built in.
            </p>
            <p className="text-base sm:text-lg text-content-secondary leading-relaxed">
              No ads. No algorithmic feed. No dark patterns. Just a calm, focused place for your making.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Download CTA ────────────────────────────────────────────────── */}
      <section id="download" className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
        <motion.div
          className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-coral-500 to-coral-600 p-8 sm:p-12 md:p-16 text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Start tracking every stitch
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/80 max-w-xl mx-auto">
            Free to download. 14 days of Pro included. Your projects, patterns, and stash — all in one place.
          </p>
          <div className="mt-8 sm:mt-10">
            <a
              href="#"
              className="inline-flex items-center gap-3 px-6 py-3.5 sm:px-8 sm:py-4 bg-white text-coral-600 font-semibold rounded-full hover:bg-white/90 transition-colors text-base sm:text-lg shadow-lg"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor">
                <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.89C10.1 6.87 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
              </svg>
              Download on the App Store
            </a>
          </div>
          <p className="mt-4 text-sm text-white/60">
            Requires iOS 17 or later
          </p>
        </motion.div>
      </section>
    </main>
  )
}
