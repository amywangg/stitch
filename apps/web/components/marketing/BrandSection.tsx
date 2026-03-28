'use client'

import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export default function BrandSection() {
  return (
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
  )
}
