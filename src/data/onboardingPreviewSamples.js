/** Fixed seed URLs so previews stay consistent across template switches. */
export const ONBOARDING_SAMPLE_ARTWORKS = [
  {
    id: 'ob-s1',
    title: 'Morning Study',
    category: 'Photography',
    mediaUrl: 'https://picsum.photos/seed/igob1/900/1100',
    media_type: 'image',
  },
  {
    id: 'ob-s2',
    title: 'Glass & Brick',
    category: 'Architecture',
    mediaUrl: 'https://picsum.photos/seed/igob2/1000/700',
    media_type: 'image',
  },
  {
    id: 'ob-s3',
    title: 'Late Tide',
    category: 'Painting',
    mediaUrl: 'https://picsum.photos/seed/igob3/800/800',
    media_type: 'image',
  },
  {
    id: 'ob-s4',
    title: 'Signal III',
    category: 'Mixed Media',
    mediaUrl: 'https://picsum.photos/seed/igob4/700/1000',
    media_type: 'image',
  },
  {
    id: 'ob-s5',
    title: 'Notes from the Field',
    category: 'Illustration',
    mediaUrl: 'https://picsum.photos/seed/igob5/1000/900',
    media_type: 'image',
  },
];

export const ONBOARDING_SAMPLE_USER = {
  name: 'Maya Chen',
  portfolio_template: 'minimalist',
  artworks: ONBOARDING_SAMPLE_ARTWORKS,
};
