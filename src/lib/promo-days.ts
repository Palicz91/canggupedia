/**
 * Which days a daily promo runs, and the order of one day's promos.
 *
 * Since 2026-11-10 a promo can run on several days (Ivan: live music at Uma Garden is Tuesday and
 * Thursday), stored as `days: [...]`. Promos saved before then, or from an admin tab opened before
 * the change, still carry a single `day`, so both are read.
 *
 * A promo on two days needs its own place on each day, which one file order cannot give, so each
 * day's order is stored as `promo_order: { Thursday: [ids] }` in the promo file. Promos not in a
 * day's list follow the listed ones in file order.
 *
 * public/admin/helpers.js (promoDays, promosForDay) is a line-for-line mirror for the admin.
 * Change one, change both; test/promo-days.test.ts runs both.
 */
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface DayPromo { id?: string; day?: string; days?: string[] }

export function promoDays(promo: DayPromo): string[] {
  const list = Array.isArray(promo.days) && promo.days.length ? promo.days : promo.day ? [promo.day] : [];
  return DAYS.filter((d) => list.includes(d));
}

export function promosForDay<T extends DayPromo>(
  promos: T[],
  order: Record<string, string[] | undefined> | undefined,
  day: string,
): T[] {
  const ids = (order && order[day]) || [];
  const rank = (p: T) => {
    const i = p.id ? ids.indexOf(p.id) : -1;
    return i === -1 ? ids.length : i;
  };
  return promos
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => promoDays(p).includes(day))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
    .map(({ p }) => p);
}
