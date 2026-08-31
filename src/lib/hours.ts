/**
 * Turns a free-text opening-hours string into a day-by-day list.
 *
 * Ivan's actual workflow is to copy the hours block straight out of Google and paste it into
 * the single "Opening hours" box, which arrives tab-separated and all on one line:
 *
 *   "Monday\t11.00 am–11.00 pm Tuesday\t11.00 am–11.00 pm ... Sunday\t11.00 am–11.00 pm"
 *
 * The website rendered that verbatim, as one run-on paragraph. Rather than make him retype
 * seven days into seven new boxes, we parse what he already pastes and render it like the
 * Google panel he asked for.
 *
 * This is deliberately conservative. Anything it is not confident about returns null and the
 * caller falls back to printing the original string unchanged, which is the old behaviour.
 * 111 venues already hold hand-typed hours in every imaginable format; none of them may be
 * mangled to make one venue look nicer.
 */

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type DayName = (typeof DAYS)[number];

export interface DayHours {
  day: DayName;
  hours: string;
}

/**
 * Longest-first alternation: "monday" must win before "mon", or the regex engine takes the
 * short branch and leaves a stray "day" in the hours text.
 */
const DAY_PATTERN =
  /\b(monday|mon|tuesday|tues|tue|wednesday|wednes|weds|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat|sunday|sun)\b/gi;

const CANONICAL: Record<string, DayName> = {
  mon: 'Monday',
  monday: 'Monday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  tuesday: 'Tuesday',
  wed: 'Wednesday',
  weds: 'Wednesday',
  wednes: 'Wednesday',
  wednesday: 'Wednesday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  thursday: 'Thursday',
  fri: 'Friday',
  friday: 'Friday',
  sat: 'Saturday',
  saturday: 'Saturday',
  sun: 'Sunday',
  sunday: 'Sunday',
};

/**
 * Real hours contain a digit. "Closed" is the one exception.
 *
 * This is what rejects day names that appear inside prose rather than as list headings:
 *   "Friday & Saturday: 22:00 – late"      -> Friday's text is "&"
 *   "...often until ~02:00 on Wed/Thu/Sat" -> Wednesday's and Thursday's text is "/"
 * Both used to slice into a table that was actively wrong and dropped the real hours. Now
 * they fail this check, the whole parse is abandoned, and the original line is printed.
 */
function looksLikeHours(text: string): boolean {
  return /\d/.test(text) || text.toLowerCase() === 'closed';
}

/** Strip the separators that sit between a day name and its hours, plus trailing punctuation. */
function cleanHours(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[\s:\-–—,;|]+/, '')
    .replace(/[\s,;|]+$/, '')
    .trim();
}

/**
 * Returns one entry per day in Monday-to-Sunday order, or null when the string does not
 * cleanly describe per-day hours.
 *
 * Returns null when:
 *   - fewer than two day names appear (e.g. "8AM – 10PM"), or
 *   - the same day appears twice (ambiguous), or
 *   - any matched day has no hours text after it.
 *
 * That last rule is what rejects ranges such as "Monday–Friday 9AM–5PM": "Monday" is followed
 * by nothing but a dash, so the whole parse is abandoned rather than rendered as a table
 * claiming Monday has no hours.
 */
export function parseOpeningHours(input: string | null | undefined): DayHours[] | null {
  if (!input) return null;

  const matches = [...input.matchAll(DAY_PATTERN)];
  if (matches.length < 2) return null;

  const found = new Map<DayName, string>();

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? input.length) : input.length;
    const hours = cleanHours(input.slice(start, end));

    if (!hours || !looksLikeHours(hours)) return null;

    const day = CANONICAL[match[1].toLowerCase()];
    if (found.has(day)) return null;
    found.set(day, hours);
  }

  return DAYS.filter((day) => found.has(day)).map((day) => ({ day, hours: found.get(day)! }));
}

/** Monday-based index for the browser's current day, matching the order of DAYS. */
export function todayName(now: Date = new Date()): DayName {
  return DAYS[(now.getDay() + 6) % 7];
}
