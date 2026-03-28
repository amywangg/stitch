'use client'

import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export default function DownloadSection() {
  return (
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
  )
}
