/**
 * Knitting Terms and Abbreviations
 * Includes style-specific instructions for different knitting styles
 */

export type KnittingStyle = 'continental' | 'english' | 'russian' | 'portuguese' | 'combination';

export interface KnittingTerm {
  abbreviation: string;
  fullName: string;
  description: string;
  category: 'basic' | 'increase' | 'decrease' | 'special' | 'finishing';
  instructions: {
    [key in KnittingStyle]?: string;
  };
  defaultInstruction: string; // Fallback if style-specific not available
}

export const knittingTerms: KnittingTerm[] = [
  {
    abbreviation: 'k',
    fullName: 'knit',
    description: 'Knit stitch',
    category: 'basic',
    instructions: {
      continental: 'Insert right needle from left to right through the front of the stitch. Wrap yarn counterclockwise around right needle. Pull through.',
      english: 'Insert right needle from left to right through the front of the stitch. Wrap yarn counterclockwise around right needle with right hand. Pull through.',
      russian: 'Insert right needle from left to right through the front of the stitch. Wrap yarn counterclockwise around right needle. Pull through.',
      portuguese: 'Insert right needle from left to right through the front of the stitch. Wrap yarn around neck or pin, then around right needle. Pull through.',
    },
    defaultInstruction: 'Insert right needle from left to right through the front of the stitch. Wrap yarn counterclockwise around right needle. Pull through.',
  },
  {
    abbreviation: 'p',
    fullName: 'purl',
    description: 'Purl stitch',
    category: 'basic',
    instructions: {
      continental: 'Insert right needle from right to left through the front of the stitch. Wrap yarn counterclockwise around right needle. Pull through.',
      english: 'Insert right needle from right to left through the front of the stitch. Wrap yarn counterclockwise around right needle with right hand. Pull through.',
      russian: 'Insert right needle from right to left through the front of the stitch. Wrap yarn counterclockwise around right needle. Pull through.',
      portuguese: 'Insert right needle from right to left through the front of the stitch. Wrap yarn around neck or pin, then around right needle. Pull through.',
    },
    defaultInstruction: 'Insert right needle from right to left through the front of the stitch. Wrap yarn counterclockwise around right needle. Pull through.',
  },
  {
    abbreviation: 'M1L',
    fullName: 'Make 1 Left',
    description: 'Make one stitch leaning to the left',
    category: 'increase',
    instructions: {
      continental: 'Pick up the bar between stitches from front to back with left needle. Knit through the back loop.',
      english: 'Pick up the bar between stitches from front to back with left needle. Knit through the back loop.',
      russian: 'Pick up the bar between stitches from front to back with left needle. Knit through the back loop.',
      portuguese: 'Pick up the bar between stitches from front to back with left needle. Knit through the back loop.',
    },
    defaultInstruction: 'Pick up the bar between stitches from front to back with left needle. Knit through the back loop.',
  },
  {
    abbreviation: 'M1R',
    fullName: 'Make 1 Right',
    description: 'Make one stitch leaning to the right',
    category: 'increase',
    instructions: {
      continental: 'Pick up the bar between stitches from back to front with left needle. Knit through the front loop.',
      english: 'Pick up the bar between stitches from back to front with left needle. Knit through the front loop.',
      russian: 'Pick up the bar between stitches from back to front with left needle. Knit through the front loop.',
      portuguese: 'Pick up the bar between stitches from back to front with left needle. Knit through the front loop.',
    },
    defaultInstruction: 'Pick up the bar between stitches from back to front with left needle. Knit through the front loop.',
  },
  {
    abbreviation: 'kfb',
    fullName: 'Knit Front and Back',
    description: 'Increase by knitting into the front and back of the same stitch',
    category: 'increase',
    instructions: {
      continental: 'Knit into the front of the stitch but do not drop it. Knit into the back loop of the same stitch, then drop it.',
      english: 'Knit into the front of the stitch but do not drop it. Knit into the back loop of the same stitch, then drop it.',
      russian: 'Knit into the front of the stitch but do not drop it. Knit into the back loop of the same stitch, then drop it.',
      portuguese: 'Knit into the front of the stitch but do not drop it. Knit into the back loop of the same stitch, then drop it.',
    },
    defaultInstruction: 'Knit into the front of the stitch but do not drop it. Knit into the back loop of the same stitch, then drop it.',
  },
  {
    abbreviation: 'k2tog',
    fullName: 'Knit 2 Together',
    description: 'Decrease by knitting two stitches together',
    category: 'decrease',
    instructions: {
      continental: 'Insert right needle through the front loops of the next two stitches. Knit them together as one stitch.',
      english: 'Insert right needle through the front loops of the next two stitches. Knit them together as one stitch.',
      russian: 'Insert right needle through the front loops of the next two stitches. Knit them together as one stitch.',
      portuguese: 'Insert right needle through the front loops of the next two stitches. Knit them together as one stitch.',
    },
    defaultInstruction: 'Insert right needle through the front loops of the next two stitches. Knit them together as one stitch.',
  },
  {
    abbreviation: 'ssk',
    fullName: 'Slip Slip Knit',
    description: 'Decrease by slipping two stitches and knitting them together',
    category: 'decrease',
    instructions: {
      continental: 'Slip next stitch knitwise, slip following stitch knitwise. Insert left needle into front of both slipped stitches. Knit them together.',
      english: 'Slip next stitch knitwise, slip following stitch knitwise. Insert left needle into front of both slipped stitches. Knit them together.',
      russian: 'Slip next stitch knitwise, slip following stitch knitwise. Insert left needle into front of both slipped stitches. Knit them together.',
      portuguese: 'Slip next stitch knitwise, slip following stitch knitwise. Insert left needle into front of both slipped stitches. Knit them together.',
    },
    defaultInstruction: 'Slip next stitch knitwise, slip following stitch knitwise. Insert left needle into front of both slipped stitches. Knit them together.',
  },
  {
    abbreviation: 'skp',
    fullName: 'Slip Knit Pass',
    description: 'Decrease by slipping, knitting, and passing over',
    category: 'decrease',
    instructions: {
      continental: 'Slip one stitch knitwise, knit one stitch, pass slipped stitch over.',
      english: 'Slip one stitch knitwise, knit one stitch, pass slipped stitch over.',
      russian: 'Slip one stitch knitwise, knit one stitch, pass slipped stitch over.',
      portuguese: 'Slip one stitch knitwise, knit one stitch, pass slipped stitch over.',
    },
    defaultInstruction: 'Slip one stitch knitwise, knit one stitch, pass slipped stitch over.',
  },
  {
    abbreviation: 'yo',
    fullName: 'Yarn Over',
    description: 'Wrap yarn around needle to create a new stitch',
    category: 'increase',
    instructions: {
      continental: 'Bring yarn to the front (if knitting) or back (if purling), then wrap it over the right needle.',
      english: 'Bring yarn to the front (if knitting) or back (if purling), then wrap it over the right needle.',
      russian: 'Bring yarn to the front (if knitting) or back (if purling), then wrap it over the right needle.',
      portuguese: 'Bring yarn to the front (if knitting) or back (if purling), then wrap it over the right needle.',
    },
    defaultInstruction: 'Bring yarn to the front (if knitting) or back (if purling), then wrap it over the right needle.',
  },
  {
    abbreviation: 'sl',
    fullName: 'Slip',
    description: 'Slip a stitch from left to right needle without working it',
    category: 'basic',
    instructions: {
      continental: 'Insert right needle into stitch as if to knit (or purl if specified), and slip it to right needle without working it.',
      english: 'Insert right needle into stitch as if to knit (or purl if specified), and slip it to right needle without working it.',
      russian: 'Insert right needle into stitch as if to knit (or purl if specified), and slip it to right needle without working it.',
      portuguese: 'Insert right needle into stitch as if to knit (or purl if specified), and slip it to right needle without working it.',
    },
    defaultInstruction: 'Insert right needle into stitch as if to knit (or purl if specified), and slip it to right needle without working it.',
  },
  {
    abbreviation: 'pm',
    fullName: 'Place Marker',
    description: 'Place a stitch marker on the needle',
    category: 'special',
    instructions: {
      continental: 'Place a stitch marker on the right needle.',
      english: 'Place a stitch marker on the right needle.',
      russian: 'Place a stitch marker on the right needle.',
      portuguese: 'Place a stitch marker on the right needle.',
    },
    defaultInstruction: 'Place a stitch marker on the right needle.',
  },
  {
    abbreviation: 'sm',
    fullName: 'Slip Marker',
    description: 'Slip the marker from left to right needle',
    category: 'special',
    instructions: {
      continental: 'Slip the marker from left needle to right needle.',
      english: 'Slip the marker from left needle to right needle.',
      russian: 'Slip the marker from left needle to right needle.',
      portuguese: 'Slip the marker from left needle to right needle.',
    },
    defaultInstruction: 'Slip the marker from left needle to right needle.',
  },
  {
    abbreviation: 'co',
    fullName: 'Cast On',
    description: 'Create initial stitches on the needle',
    category: 'basic',
    instructions: {
      continental: 'Long-tail cast on: Make a slip knot, leaving a long tail. Hold both yarns, insert thumb and index finger, pull loop through.',
      english: 'Long-tail cast on: Make a slip knot, leaving a long tail. Hold both yarns, insert thumb and index finger, pull loop through.',
      russian: 'Long-tail cast on: Make a slip knot, leaving a long tail. Hold both yarns, insert thumb and index finger, pull loop through.',
      portuguese: 'Long-tail cast on: Make a slip knot, leaving a long tail. Hold both yarns, insert thumb and index finger, pull loop through.',
    },
    defaultInstruction: 'Long-tail cast on: Make a slip knot, leaving a long tail. Hold both yarns, insert thumb and index finger, pull loop through.',
  },
  {
    abbreviation: 'bo',
    fullName: 'Bind Off',
    description: 'Finish the edge by removing stitches from the needle',
    category: 'finishing',
    instructions: {
      continental: 'Knit two stitches. Pass first stitch over second. Knit one more stitch. Repeat until all stitches are bound off.',
      english: 'Knit two stitches. Pass first stitch over second. Knit one more stitch. Repeat until all stitches are bound off.',
      russian: 'Knit two stitches. Pass first stitch over second. Knit one more stitch. Repeat until all stitches are bound off.',
      portuguese: 'Knit two stitches. Pass first stitch over second. Knit one more stitch. Repeat until all stitches are bound off.',
    },
    defaultInstruction: 'Knit two stitches. Pass first stitch over second. Knit one more stitch. Repeat until all stitches are bound off.',
  },
  {
    abbreviation: 'st',
    fullName: 'Stitch',
    description: 'A single stitch',
    category: 'basic',
    instructions: {},
    defaultInstruction: 'A single loop on the needle.',
  },
  {
    abbreviation: 'sts',
    fullName: 'Stitches',
    description: 'Multiple stitches',
    category: 'basic',
    instructions: {},
    defaultInstruction: 'Multiple loops on the needle.',
  },
  {
    abbreviation: 'rep',
    fullName: 'Repeat',
    description: 'Repeat the instruction',
    category: 'special',
    instructions: {},
    defaultInstruction: 'Do the instruction again.',
  },
  {
    abbreviation: 'rnd',
    fullName: 'Round',
    description: 'One complete round in circular knitting',
    category: 'basic',
    instructions: {},
    defaultInstruction: 'One complete round when knitting in the round.',
  },
  {
    abbreviation: 'inc',
    fullName: 'Increase',
    description: 'Add a stitch',
    category: 'increase',
    instructions: {},
    defaultInstruction: 'Add one or more stitches to the work.',
  },
  {
    abbreviation: 'dec',
    fullName: 'Decrease',
    description: 'Remove a stitch',
    category: 'decrease',
    instructions: {},
    defaultInstruction: 'Remove one or more stitches from the work.',
  },
];

/**
 * Extract abbreviations from pattern text
 */
export function extractAbbreviations(patternText: string): string[] {
  const abbreviations = new Set<string>();
  const termAbbrevs = knittingTerms.map(t => t.abbreviation.toLowerCase());
  
  // Simple regex to find common abbreviations
  const abbrevPattern = /\b(k|p|k2tog|ssk|m1l|m1r|kfb|yo|sl|pm|sm|co|bo|st|sts|rep|rnd|inc|dec)\b/gi;
  const matches = patternText.match(abbrevPattern);
  
  if (matches) {
    matches.forEach(match => {
      const lower = match.toLowerCase();
      if (termAbbrevs.includes(lower)) {
        abbreviations.add(lower);
      }
    });
  }
  
  return Array.from(abbreviations);
}

/**
 * Get term by abbreviation
 */
export function getTermByAbbreviation(abbrev: string): KnittingTerm | undefined {
  return knittingTerms.find(t => t.abbreviation.toLowerCase() === abbrev.toLowerCase());
}

/**
 * Get instruction for a term based on knitting style
 */
export function getTermInstruction(term: KnittingTerm, style: KnittingStyle): string {
  return term.instructions[style] || term.defaultInstruction;
}


