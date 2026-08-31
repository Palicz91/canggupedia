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
 * A day's text must be a time range and nothing else. "Closed" is the one exception.
 *
 * Requiring merely "contains a digit" was not enough. It rejected the pure-punctuation cases
 * ("Friday & Saturday: ..." leaving Friday as "&") but still accepted prose that happens to
 * carry a number, which slices into a table that is confidently wrong:
 *
 *   "Happy hour Fri 5-7pm. Open daily 11am-11pm, Sat until 1am"
 *      -> Friday "5-7pm. Open daily 11am-11pm", Saturday "until 1am"
 *      -> a two-day table for a venue that is open seven days.
 *
 *   "Mon 9-5 ... Sun 9-5. Hours might differ · Holiday hours"   (Google's own panel suffix)
 *      -> Sunday "9-5. Hours might differ · Holiday hours"
 *
 * Anchoring the whole string to a time shape rejects both, so the original line is printed
 * unchanged instead. Being wrong here is worse than doing nothing.
 */
const CLOCK = String.raw`\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?`;
const DASH = String.raw`(?:[-–—−‐]+|to|till|til|until)`;
const OPEN_ENDED = String.raw`(?:late(?:\s*night)?|midnight|close|closing)`;
const RANGE = String.raw`${CLOCK}\s*${DASH}\s*(?:${CLOCK}|${OPEN_ENDED})`;
const SEPARATOR = String.raw`(?:[,&/;+]|and)`;
const HOURS_TEXT = new RegExp(
  String.raw`^(?:closed|${RANGE}(?:\s*${SEPARATOR}\s*${RANGE})*)$`,
  'i',
);

function looksLikeHours(text: string): boolean {
  return HOURS_TEXT.test(text);
}

/** Strip the separators that sit between a day name and its hours, plus trailing punctuation. */
function cleanHours(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    // U+2212 MINUS and U+2010 HYPHEN both turn up in text pasted out of Google.
    .replace(/^[\s:\-–—−‐,;|]+/, '')
    .replace(/[\s,;|.]+$/, '')
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

  // Anything written before the first day name is not part of any day's hours and has nowhere
  // to go in a table, so it would simply vanish from the page:
  //   "Kitchen closes 22:00. Monday 11-23 Tuesday 11-23"  -> the kitchen note disappears.
  // Silently dropping something Ivan typed is worse than printing the line as he wrote it.
  if (/[a-z0-9]/i.test(input.slice(0, matches[0].index ?? 0))) return null;

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
