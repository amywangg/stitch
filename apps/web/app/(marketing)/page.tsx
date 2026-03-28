'use client'

import HeroSection from '@/components/marketing/HeroSection'
import TrustBar from '@/components/marketing/TrustBar'
import FeaturesSection from '@/components/marketing/FeaturesSection'
import RowCounterSection from '@/components/marketing/RowCounterSection'
import PatternParsingSection from '@/components/marketing/PatternParsingSection'
import PatternBuilderSection from '@/components/marketing/PatternBuilderSection'
import MarketplaceSection from '@/components/marketing/MarketplaceSection'
import CommunitySection from '@/components/marketing/CommunitySection'
import AIToolsSection from '@/components/marketing/AIToolsSection'
import PricingSection from '@/components/marketing/PricingSection'
import BrandSection from '@/components/marketing/BrandSection'
import DownloadSection from '@/components/marketing/DownloadSection'

export default function LandingPage() {
  return (
    <main>
      <HeroSection />
      <TrustBar />
      <FeaturesSection />
      <RowCounterSection />
      <PatternParsingSection />
      <PatternBuilderSection />
      <MarketplaceSection />
      <CommunitySection />
      <AIToolsSection />
      <PricingSection />
      <BrandSection />
      <DownloadSection />
    </main>
  )
}
