'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Shield, CreditCard, Download, Star, Users } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const sellerPerks = [
  { icon: CreditCard, text: 'Set your price, get paid via Stripe' },
  { icon: Shield, text: 'Watermarked PDFs protect your work' },
  { icon: Star, text: 'Community reviews build your reputation' },
]

const buyerPerks = [
  { icon: Download, text: 'Instant PDF download after purchase' },
  { icon: Users, text: 'Honest reviews from real makers' },
  { icon: ShoppingBag, text: 'Start a project directly from any pattern' },
]

const mockListings = [
  { title: 'Alpine Cable Pullover', designer: 'Wool & Pine', price: '$8.00', rating: 4.7, reviews: 23 },
  { title: 'Botanical Lace Shawl', designer: 'Thread & Thyme', price: '$6.50', rating: 4.9, reviews: 41 },
  { title: 'Everyday Beanie', designer: 'Knitwise Studio', price: '$4.00', rating: 4.5, reviews: 67 },
]

export default function MarketplaceSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-medium text-coral-500 mb-2">For makers and designers</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-content-default mb-5">
              Buy patterns, sell your own
            </h2>
            <p className="text-base sm:text-lg text-content-secondary leading-relaxed mb-8">
              A marketplace where independent designers sell directly to knitters. No middleman fees beyond payment processing. Every purchased PDF is watermarked to protect creators.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-coral-600 dark:text-coral-400 uppercase tracking-wider mb-3">For sellers</p>
                <div className="space-y-3">
                  {sellerPerks.map((perk) => (
                    <div key={perk.text} className="flex items-start gap-3">
                      <perk.icon size={16} className="text-coral-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-content-default">{perk.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-3">For buyers</p>
                <div className="space-y-3">
                  {buyerPerks.map((perk) => (
                    <div key={perk.text} className="flex items-start gap-3">
                      <perk.icon size={16} className="text-teal-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-content-default">{perk.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mock marketplace listings */}
          <motion.div
            className="space-y-3"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {mockListings.map((listing, i) => (
              <motion.div
                key={listing.title}
                className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-default hover:border-border-emphasis transition-colors"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-content-default truncate">{listing.title}</h4>
                    <p className="text-xs text-content-secondary mt-0.5">{listing.designer}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} size={10} className={s <= Math.round(listing.rating) ? 'text-coral-500 fill-coral-500' : 'text-border-default'} />
                        ))}
                      </div>
                      <span className="text-xs text-content-tertiary">{listing.rating} ({listing.reviews})</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-sm font-bold text-content-default">{listing.price}</span>
                    <p className="text-xs text-content-tertiary mt-0.5">PDF</p>
                  </div>
                </div>
              </motion.div>
            ))}
            <p className="text-center text-xs text-content-tertiary pt-2">
              Free for all users. Platform fee: 12% on sales.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
