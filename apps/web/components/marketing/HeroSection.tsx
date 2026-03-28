'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

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

export default function HeroSection() {
  return (
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
          Track projects, build patterns, manage your stash, buy and sell designs, and connect with fellow makers. The modern knitting companion.
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
  )
}
