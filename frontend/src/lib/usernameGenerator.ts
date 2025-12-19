// Knitting-themed username generator
// Generates unique usernames like "stitchmarker27" or "yarnaddict42"

const prefixes = [
  // Knitting actions
  'knit', 'purl', 'stitch', 'cast', 'bind', 'slip', 'yarn', 'loop',
  'twist', 'weave', 'sew', 'braid', 'knot', 'tangle', 'frog',
  
  // Tools & materials
  'needle', 'hook', 'bobbin', 'skein', 'hank', 'wool', 'fiber',
  'cable', 'gauge', 'swatch', 'notions',
  
  // Pattern elements
  'lace', 'rib', 'moss', 'seed', 'fair', 'isle', 'intarsia', 'brioche',
  'stripe', 'motif', 'chart', 'repeat',
  
  // Items
  'sock', 'scarf', 'shawl', 'cowl', 'mitten', 'hat', 'beanie', 'sweater',
  'cardigan', 'blanket', 'afghan',
];

const suffixes = [
  // Knitting terms
  'maker', 'crafter', 'addict', 'lover', 'nerd', 'geek', 'ninja',
  'wizard', 'master', 'pro', 'queen', 'king', 'fairy',
  
  // Tools
  'needle', 'hook', 'marker', 'holder', 'counter', 'keeper',
  
  // Yarn related
  'yarn', 'fiber', 'wool', 'stash', 'ball', 'skein',
  
  // Actions
  'knitter', 'purler', 'stitcher', 'looper', 'crocheter',
  
  // Fun
  'cat', 'bee', 'bird', 'panda', 'bunny', 'fox',
];

// Cute compound words specific to knitting
const compoundWords = [
  'stitchmarker',
  'yarnball',
  'knitpurl',
  'woolwinder',
  'cablequeen',
  'sockaddict',
  'shawlmaker',
  'laceninja',
  'purlwizard',
  'knitgeek',
  'fiberlover',
  'stashhoarder',
  'yarnover',
  'castingon',
  'bindingoff',
  'froggit',
  'knitpicks',
  'happyknitter',
  'cozymaker',
  'warmstitches',
  'softknits',
  'woollove',
  'craftymittens',
  'stitchnerd',
  'yarnaddict',
  'knitninja',
  'purlqueen',
  'cozyknits',
  'loopyarn',
  'sockmonster',
];

/**
 * Generates a random knitting-themed username
 */
export function generateUsername(): string {
  const useCompound = Math.random() > 0.5;
  
  if (useCompound) {
    // Use a compound word + number
    const word = compoundWords[Math.floor(Math.random() * compoundWords.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    return `${word}${number}`;
  } else {
    // Combine prefix + suffix + number
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const number = Math.floor(Math.random() * 99) + 1;
    return `${prefix}${suffix}${number}`;
  }
}

/**
 * Generates multiple username suggestions
 */
export function generateUsernameSuggestions(count: number = 5): string[] {
  const suggestions = new Set<string>();
  
  while (suggestions.size < count) {
    suggestions.add(generateUsername());
  }
  
  return Array.from(suggestions);
}

/**
 * Validates username format
 * Must be 3-30 characters, alphanumeric and underscores only
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or less' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  // Reserved usernames
  const reserved = ['admin', 'root', 'system', 'stitch', 'support', 'help', 'mod', 'moderator'];
  if (reserved.includes(username.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }
  
  return { valid: true };
}


