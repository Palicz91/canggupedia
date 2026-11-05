import { subsOf } from './venues';

interface HubConfig {
  title: string;
  description: string;
  subcategories: { name: string; value: string }[];
}
interface HubVenue {
  location?: string;
  category?: string;
  subcategory?: string | string[];
}

export interface HubSection {
  key: string;
  title: string;
  description: string;
  types: string[];
}

/**
 * Area hub sections straight from the CMS category config. Types with no venues in the area are
 * dropped; a section with none stays, with no types, and its box says Coming Soon (Adam, 2026-11-05).
 */
export function hubSections(configs: Record<string, HubConfig>, venues: HubVenue[], area: string): HubSection[] {
  return Object.entries(configs).map(([key, cfg]) => {
    const inSection = venues.filter((v) => v.location === area && v.category === key);
    return {
      key,
      title: cfg.title,
      description: cfg.description,
      types: cfg.subcategories
        .filter((s) => inSection.some((v) => subsOf(v as never).includes(s.value)))
        .map((s) => s.name),
    };
  });
}
