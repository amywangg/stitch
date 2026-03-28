'use client'

import { Shield, Sparkles, Heart, Award, ShoppingBag } from 'lucide-react'

export default function TrustBar() {
  return (
    <section className="py-8 sm:py-10 px-4 sm:px-6 border-b border-border-default">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-content-secondary">
        <span className="flex items-center gap-2"><Shield size={16} className="text-teal-500" /> Ravelry import and sync</span>
        <span className="flex items-center gap-2"><Sparkles size={16} className="text-coral-500" /> 9 AI-powered tools</span>
        <span className="flex items-center gap-2"><ShoppingBag size={16} className="text-teal-500" /> Pattern marketplace</span>
        <span className="flex items-center gap-2"><Heart size={16} className="text-coral-400" /> Social feed and reviews</span>
        <span className="flex items-center gap-2"><Award size={16} className="text-teal-500" /> 14-day Pro trial</span>
      </div>
    </section>
  )
}
