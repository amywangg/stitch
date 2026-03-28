/**
 * Agreement texts for the pattern marketplace.
 * Displayed during creator onboarding and buyer checkout.
 */

export const BUYER_AGREEMENT = {
  version: '1.0',
  title: 'Pattern purchase agreement',
  sections: [
    {
      heading: 'License grant',
      body: 'By purchasing a pattern on Stitch, you receive a personal, non-transferable, non-exclusive license to use the pattern for your own personal knitting and crochet projects. This license is for one individual and may not be shared, resold, or redistributed.',
    },
    {
      heading: 'Watermarking',
      body: 'All purchased pattern PDFs are digitally watermarked with your account information. This watermark is a unique identifier tied to your purchase and is used to protect the creator\'s intellectual property. Removing, altering, or obscuring the watermark is a violation of this agreement.',
    },
    {
      heading: 'Prohibited uses',
      body: 'You may not: (a) share, redistribute, or resell the pattern PDF or its contents; (b) upload the pattern to any other platform or file-sharing service; (c) use the pattern for commercial production of finished items for sale unless the creator explicitly grants commercial use rights; (d) claim the pattern as your own work; (e) remove or alter the digital watermark.',
    },
    {
      heading: 'Enforcement',
      body: 'Violation of this agreement may result in immediate account termination and legal action. Since each PDF is uniquely watermarked, unauthorized distribution can be traced back to the purchasing account.',
    },
    {
      heading: 'Refunds',
      body: 'Digital pattern purchases are generally non-refundable. If you experience a technical issue accessing your purchase, contact support within 14 days of purchase for assistance.',
    },
  ],
} as const

export const CREATOR_AGREEMENT = {
  version: '1.0',
  title: 'Pattern seller agreement',
  sections: [
    {
      heading: 'Eligibility',
      body: 'To sell patterns on Stitch, you must complete Stripe Connect onboarding and verify your identity. You must be at least 18 years old or the age of majority in your jurisdiction.',
    },
    {
      heading: 'Original work',
      body: 'By listing a pattern for sale, you represent and warrant that: (a) the pattern is your original work or you have the legal right to sell it; (b) it does not infringe on any third party\'s copyright, trademark, or other intellectual property rights; (c) it is not a copy, derivative, or unauthorized reproduction of another designer\'s work.',
    },
    {
      heading: 'Content requirements',
      body: 'Patterns listed for sale must include: a descriptive title, at least one cover photo, a pattern description, and the pattern PDF. Patterns must be complete and usable — incomplete drafts or placeholder content are not permitted.',
    },
    {
      heading: 'Pricing and fees',
      body: 'You set the price for your patterns (minimum $1.00 USD, maximum $100.00 USD). Stitch retains a 12% platform fee on each sale. The remaining 88% is transferred to your connected Stripe account. Stripe\'s standard processing fees also apply and are deducted from your payout.',
    },
    {
      heading: 'PDF protection',
      body: 'All pattern PDFs sold through Stitch are automatically watermarked with the buyer\'s information before delivery. Original uploaded PDFs are stored encrypted and never served directly. Stitch provides reasonable technical measures to protect your work, but cannot guarantee against all forms of piracy.',
    },
    {
      heading: 'Payouts',
      body: 'Payouts are handled by Stripe according to your Stripe Express account settings. Stitch does not hold funds — payments are transferred directly to Stripe for processing. You can manage your payout schedule and banking details through the Stripe Express dashboard.',
    },
    {
      heading: 'Takedowns and disputes',
      body: 'Stitch reserves the right to remove any listing that violates this agreement or receives valid DMCA takedown notices. In the event of a copyright dispute, the pattern may be temporarily delisted pending resolution. Repeated violations will result in permanent removal from the marketplace.',
    },
    {
      heading: 'Termination',
      body: 'You may remove your patterns from the marketplace at any time. Existing purchases remain valid — buyers retain access to patterns they have already purchased. Stitch may terminate your seller account for violations of this agreement.',
    },
  ],
} as const

export const DMCA_POLICY = {
  version: '1.0',
  title: 'DMCA and copyright policy',
  contact_email: 'copyright@stitch.app',
  sections: [
    {
      heading: 'Reporting infringement',
      body: 'If you believe a pattern listed on Stitch infringes your copyright, submit a DMCA takedown notice to copyright@stitch.app. Include: (1) identification of the copyrighted work, (2) the URL of the infringing content, (3) your contact information, (4) a statement of good faith belief, (5) a statement under penalty of perjury that the information is accurate, and (6) your physical or electronic signature.',
    },
    {
      heading: 'Counter-notification',
      body: 'If your pattern was removed due to a DMCA notice and you believe this was an error, you may submit a counter-notification. The pattern will be restored within 10-14 business days unless the original complainant files a court action.',
    },
    {
      heading: 'Repeat infringers',
      body: 'Stitch will terminate the accounts of users who are repeat infringers. Three valid DMCA takedown notices against a seller will result in permanent marketplace ban.',
    },
  ],
} as const
