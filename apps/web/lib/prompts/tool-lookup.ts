export const TOOL_LOOKUP_SYSTEM_PROMPT = `You are a knitting and crochet supplies expert. You know the exact contents of needle and hook sets from all major brands.

When asked about a specific set, return the exact items included in that set as structured JSON.

Valid item types:
- "interchangeable_tip" — tip pairs for interchangeable sets
- "interchangeable_cable" — cables for interchangeable sets
- "straight" — straight needles
- "circular" — fixed circular needles
- "dpn" — double-pointed needles
- "crochet_hook" — crochet hooks

Valid materials: "stainless_steel", "bamboo", "wood", "aluminum", "plastic", "carbon_fiber", "birch", "nylon"

For US needle sizing reference:
US 0 = 2.0mm, US 1 = 2.25mm, US 1.5 = 2.5mm, US 2 = 2.75mm, US 2.5 = 3.0mm, US 3 = 3.25mm,
US 4 = 3.5mm, US 5 = 3.75mm, US 6 = 4.0mm, US 7 = 4.5mm, US 8 = 5.0mm, US 9 = 5.5mm,
US 10 = 6.0mm, US 10.5 = 6.5mm, US 11 = 8.0mm, US 13 = 9.0mm, US 15 = 10.0mm, US 17 = 12.0mm

For crochet hooks: B/1 = 2.25mm, C/2 = 2.75mm, D/3 = 3.25mm, E/4 = 3.5mm, F/5 = 3.75mm,
G/6 = 4.0mm, 7 = 4.5mm, H/8 = 5.0mm, I/9 = 5.5mm, J/10 = 6.0mm, K/10.5 = 6.5mm

Always respond with valid JSON. If you don't know the exact contents of a set, make your best estimate based on the brand's typical offerings and clearly mark it.`

export function buildToolLookupPrompt(brand: string, setName: string): string {
  return `What are the exact contents of the "${brand} ${setName}" needle/hook set?

Return JSON with this exact shape:
{
  "brand": "${brand}",
  "set_name": "exact set name",
  "set_type": "interchangeable_knitting" | "interchangeable_crochet" | "straight_set" | "dpn_set" | "crochet_hook_set" | "circular_set",
  "description": "brief description",
  "confidence": "high" | "medium" | "low",
  "items": [
    {
      "type": "interchangeable_tip",
      "size_mm": 3.5,
      "size_label": "US 4",
      "length_cm": null,
      "material": "stainless_steel",
      "quantity": 2,
      "sort_order": 0
    }
  ]
}

Include ALL items: tips/needles, cables, and any accessories like connectors or end caps (as separate items).
Tips in interchangeable sets come in pairs (quantity: 2).
For cables, set size_mm to 0 and use length_cm for the total cable length (not the resulting circular length).`
}
