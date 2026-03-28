'use client'

import { motion } from 'framer-motion'
import { FileText, Check } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL']
const sections = [
  'Back panel — 76 rows',
  'Front panel (left) — 68 rows',
  'Front panel (right) — 68 rows',
  'Sleeves — 54 rows',
  'Collar — 12 rows',
]
const highlights = ['Any PDF pattern', 'Size-aware parsing', 'Row-by-row extraction', 'Gauge detection', 'Review before saving']

export default function PatternParsingSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Mock parsed PDF result */}
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
                  {sizes.map((s) => (
                    <span key={s} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                      s === 'M' ? 'bg-coral-500 text-white border-coral-500' : 'bg-surface border-border-default text-content-secondary'
                    }`}>{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-content-tertiary uppercase tracking-wider mb-1">Sections extracted</p>
                <div className="space-y-2">
                  {sections.map((s) => (
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
              {highlights.map((h) => (
                <span key={h} className="text-xs font-medium px-3 py-1.5 rounded-full bg-coral-50 dark:bg-coral-500/10 text-coral-600 dark:text-coral-400">
                  {h}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
