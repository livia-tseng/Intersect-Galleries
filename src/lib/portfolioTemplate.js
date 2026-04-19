/** DB + UI template ids (Supabase check constraint). Legacy ids kept for older rows / mocks. */
const LEGACY_MAP = {
  grid: 'minimalist',
  masonry: 'artsy',
  spotlight: 'bold',
};

const ALLOWED = new Set(['minimalist', 'bold', 'artsy']);

export function normalizePortfolioTemplate(value) {
  if (!value) return 'minimalist';
  if (LEGACY_MAP[value]) return LEGACY_MAP[value];
  if (ALLOWED.has(value)) return value;
  return 'minimalist';
}

export const TEMPLATE_OPTIONS = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    blurb: 'Maya-style Figma portfolio: lead image, two-column grid, light type.',
  },
  {
    id: 'bold',
    name: 'Bold',
    blurb: 'Full-width hero and high-contrast frames for statement pieces.',
  },
  {
    id: 'artsy',
    name: 'Artsy',
    blurb: 'Editorial rhythm with varied tile sizes and organic flow.',
  },
];
