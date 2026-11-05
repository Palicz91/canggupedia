import { showsInArea } from './areas';
import type { HubSection } from './hub';

export interface AreaBox {
  key: string;
  title: string;
  description: string;
  href: string;
  gradient: string;
  icon: string;
  subcategories: string[];
}

const COMING_SOON = 'Coming Soon';

/** Ivan's order, three to a row on a wide screen (2026-11-04). Canggu and Uluwatu use the same one. */
export const BOX_ORDER = [
  'food', 'byob', 'coffee-matcha',
  'hangout', 'wellness', 'co-working',
  'whats-on', 'deals', 'events',
  'happy-hour', 'fun-family', 'services',
];

const STYLES: Record<string, { gradient: string; icon: string }> = {
  food: {
    gradient: 'from-amber-400 to-orange-500',
    icon: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  },
  hangout: {
    gradient: 'from-pink-500 to-rose-500',
    icon: '<path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="m19 3-7 8-7-8Z"/>',
  },
  wellness: {
    gradient: 'from-green-400 to-teal-500',
    icon: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  },
  'fun-family': {
    gradient: 'from-blue-400 to-cyan-500',
    icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  },
  'coffee-matcha': {
    gradient: 'from-lime-500 to-emerald-700',
    icon: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
  },
  'co-working': {
    gradient: 'from-slate-500 to-slate-700',
    icon: '<rect width="18" height="12" x="3" y="4" rx="2"/><path d="M2 20h20"/>',
  },
  byob: {
    gradient: 'from-orange-400 to-red-500',
    icon: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7c0-2 2-2 2-4"/><path d="M14 7c0-2 2-2 2-4"/>',
  },
  services: {
    gradient: 'from-sky-500 to-indigo-600',
    icon: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.8-.6-.6-2.8Z"/>',
  },
};
const FALLBACK = { gradient: 'from-gray-400 to-gray-600', icon: '<circle cx="12" cy="12" r="10"/>' };

/** The boxes on an area page: venue sections from the CMS plus the fixed promo, deal and event pages. */
export function areaBoxes(area: string, sections: HubSection[], deals: { location: string }[]): AreaBox[] {
  const sectionBoxes = sections.map((sec) => ({
    key: sec.key,
    title: sec.title.toUpperCase(),
    description: sec.description,
    href: `/${area}/${sec.key}`,
    ...(STYLES[sec.key] ?? FALLBACK),
    subcategories: sec.types.length > 0 ? sec.types : [COMING_SOON],
  }));

  const hasDeals = deals.some((d) => showsInArea(d.location, area));
  const fixedBoxes: AreaBox[] = [
    {
      key: 'whats-on',
      title: "WHAT'S ON",
      description: 'Daily Promos',
      href: `/daily-promos?location=${area}`,
      gradient: 'from-purple-500 to-indigo-500',
      subcategories: ['Mon-Sun Specials'],
      icon: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    },
    {
      key: 'deals',
      title: 'DEALS',
      description: 'Find your everyday deals',
      href: `/deals?location=${area}`,
      gradient: 'from-fuchsia-500 to-purple-600',
      subcategories: [hasDeals ? 'Everyday & Limited Time' : COMING_SOON],
      icon: '<path d="M12 2H2v10l9.3 9.3a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><path d="M7 7h.01"/>',
    },
    {
      key: 'events',
      title: 'EVENTS',
      description: 'Upcoming Parties & Festivals',
      href: `/events?location=${area}`,
      gradient: 'from-red-500 to-pink-500',
      subcategories: ['Coming Soon'],
      icon: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    },
    {
      key: 'happy-hour',
      title: 'HAPPY HOUR',
      description: 'Best Drink Deals',
      href: `/happy-hour?location=${area}`,
      gradient: 'from-yellow-400 to-amber-500',
      subcategories: ['Daily Specials'],
      icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    },
  ];

  const rank = (key: string) => {
    const i = BOX_ORDER.indexOf(key);
    return i === -1 ? BOX_ORDER.length : i;
  };
  return [...sectionBoxes, ...fixedBoxes].sort((a, b) => rank(a.key) - rank(b.key));
}
