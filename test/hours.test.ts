import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOpeningHours, todayName, DAYS } from '../src/lib/hours';

const VENUES_DIR = 'src/data/venues';
const CATEGORIES = ['food', 'hangout', 'wellness', 'fun-family'];

function allOpeningHours() {
  const out: { path: string; hours: string }[] = [];
  for (const cat of CATEGORIES) {
    const dir = join(VENUES_DIR, cat);
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const path = join(dir, f);
      const data = JSON.parse(readFileSync(path, 'utf8'));
      if (typeof data.openingHours === 'string' && data.openingHours.trim()) {
        out.push({ path, hours: data.openingHours });
      }
    }
  }
  return out;
}

describe('parseOpeningHours', () => {
  it('parses the tab-separated block Ivan pastes out of Google', () => {
    // Verbatim from src/data/venues/food/canggu-billy-ho.json — the venue that prompted this.
    const billyHo =
      'Monday\t11.00 am–11.00 pm Tuesday\t11.00 am–11.00 pm Wednesday\t11.00 am–11.00 pm ' +
      'Thursday\t11.00 am–11.00 pm Friday\t11.00 am–11.00 pm Saturday\t11.00 am–11.00 pm ' +
      'Sunday\t11.00 am–11.00 pm';

    expect(parseOpeningHours(billyHo)).toEqual([
      { day: 'Monday', hours: '11.00 am–11.00 pm' },
      { day: 'Tuesday', hours: '11.00 am–11.00 pm' },
      { day: 'Wednesday', hours: '11.00 am–11.00 pm' },
      { day: 'Thursday', hours: '11.00 am–11.00 pm' },
      { day: 'Friday', hours: '11.00 am–11.00 pm' },
      { day: 'Saturday', hours: '11.00 am–11.00 pm' },
      { day: 'Sunday', hours: '11.00 am–11.00 pm' },
    ]);
  });

  it('returns null for a single all-week range, so it renders as before', () => {
    expect(parseOpeningHours('8AM – 10PM')).toBeNull();
    expect(parseOpeningHours('5PM - 2AM')).toBeNull();
    expect(parseOpeningHours('Open daily 7am to 11pm')).toBeNull();
  });

  it('refuses day ranges rather than inventing empty days', () => {
    // "Monday" is followed only by a dash. Rendering this as a table would claim Monday has
    // no hours, so the whole parse is abandoned.
    expect(parseOpeningHours('Monday–Friday 9AM–5PM')).toBeNull();
    expect(parseOpeningHours('Mon-Fri 9-5, Sat 10-2')).toBeNull();
  });

  it('refuses day names used inside prose rather than as headings', () => {
    // Both strings are verbatim from live venue files. Before the "hours must contain a digit"
    // rule, the first rendered as Friday: "&" and the second as Wednesday: "/", Thursday: "/",
    // Saturday: ")" — throwing away the real hours in the process.
    expect(parseOpeningHours('Friday & Saturday: 22:00 – late (until 04:00)')).toBeNull();
    expect(
      parseOpeningHours(
        'Daily: 12:00 – late (until ~01:00, and often until ~02:00 on Wed/Thu/Sat) ',
      ),
    ).toBeNull();
  });

  it('refuses prose that happens to contain numbers', () => {
    // "Contains a digit" was not a strict enough test for a day's hours. This one used to give
    // Friday "5-7pm. Open daily 11am-11pm" and Saturday "until 1am" — a two-day table for a
    // venue open all week.
    expect(
      parseOpeningHours('Happy hour Fri 5-7pm. Open daily 11am-11pm, Sat until 1am'),
    ).toBeNull();
  });

  it("refuses Google's own trailing note rather than gluing it onto Sunday", () => {
    // The guide tells Ivan to copy the week straight out of Google, and Google's panel often
    // carries this suffix. It used to land inside Sunday's hours.
    expect(
      parseOpeningHours(
        'Mon 9-5 Tue 9-5 Wed 9-5 Thu 9-5 Fri 9-5 Sat 9-5 Sun 9-5. Hours might differ · Holiday hours',
      ),
    ).toBeNull();
  });

  it('refuses input with text before the first day, instead of dropping it', () => {
    // A table has nowhere to put this note, so it would silently disappear from the page.
    expect(parseOpeningHours('Kitchen closes 22:00. Monday 11-23 Tuesday 11-23')).toBeNull();
  });

  it('accepts the unicode dashes that come with pasted text', () => {
    // U+2212 MINUS between the day and its hours.
    expect(parseOpeningHours('Monday − 9am-5pm Tuesday − 9am-5pm')).toEqual([
      { day: 'Monday', hours: '9am-5pm' },
      { day: 'Tuesday', hours: '9am-5pm' },
    ]);
  });

  it('accepts open-ended and split hours', () => {
    expect(parseOpeningHours('Friday 22:00 – late Saturday 22:00 – late')).toEqual([
      { day: 'Friday', hours: '22:00 – late' },
      { day: 'Saturday', hours: '22:00 – late' },
    ]);
    expect(parseOpeningHours('Monday 9-12, 14-18 Tuesday 9-12, 14-18')).toEqual([
      { day: 'Monday', hours: '9-12, 14-18' },
      { day: 'Tuesday', hours: '9-12, 14-18' },
    ]);
  });

  it('refuses input that names the same day twice', () => {
    expect(parseOpeningHours('Monday 9-5 Monday 6-9 Tuesday 9-5')).toBeNull();
  });

  it('keeps Closed as the day text', () => {
    expect(parseOpeningHours('Monday Closed Tuesday 9am-5pm')).toEqual([
      { day: 'Monday', hours: 'Closed' },
      { day: 'Tuesday', hours: '9am-5pm' },
    ]);
  });

  it('returns days in Monday-to-Sunday order whatever order they were typed in', () => {
    const parsed = parseOpeningHours('Sunday 10-4, Saturday 9-6, Friday 8-8');
    expect(parsed?.map((d) => d.day)).toEqual(['Friday', 'Saturday', 'Sunday']);
  });

  it('handles short day names and colon separators', () => {
    expect(parseOpeningHours('Mon: 9-5 Tue: 9-5')).toEqual([
      { day: 'Monday', hours: '9-5' },
      { day: 'Tuesday', hours: '9-5' },
    ]);
  });

  it('handles empty and missing input', () => {
    expect(parseOpeningHours('')).toBeNull();
    expect(parseOpeningHours(null)).toBeNull();
    expect(parseOpeningHours(undefined)).toBeNull();
  });

  // The safety net that matters. Every venue already on the site must either parse into a
  // well-formed table or be left completely alone. A half-parsed venue is worse than the
  // run-on line we are fixing.
  it('never produces a malformed table for any venue currently on the site', () => {
    for (const { path, hours } of allOpeningHours()) {
      const parsed = parseOpeningHours(hours);
      if (parsed === null) continue;

      expect(parsed.length, `${path} parsed to an empty table`).toBeGreaterThan(1);

      const days = parsed.map((d) => d.day);
      expect(new Set(days).size, `${path} repeated a day`).toBe(days.length);

      const canonical = DAYS.filter((d) => days.includes(d));
      expect(days, `${path} is not in Monday-to-Sunday order`).toEqual(canonical);

      for (const { day, hours: text } of parsed) {
        expect(text.trim(), `${path} has empty hours for ${day}`).not.toBe('');
        // The assertion that would have caught "&", "/" and ")" being rendered as opening
        // times. Anything that is not a time and not "Closed" means the split went wrong.
        expect(
          /\d/.test(text) || text.toLowerCase() === 'closed',
          `${path} shows "${text}" as ${day}'s hours, which is not a time`,
        ).toBe(true);
        // A day name leaking into the hours text means the split went wrong.
        expect(text.toLowerCase(), `${path} leaked a day name into ${day}'s hours`).not.toMatch(
          /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
        );
      }
    }
  });
});

describe('todayName', () => {
  it('maps Sunday to the end of the week, not the start', () => {
    expect(todayName(new Date('2026-08-31T12:00:00'))).toBe('Monday');
    expect(todayName(new Date('2026-09-06T12:00:00'))).toBe('Sunday');
    expect(todayName(new Date('2026-09-05T12:00:00'))).toBe('Saturday');
  });
});
