export interface EventLike {
  date: string;
  endDate?: string;
}

/** Today's date in Bali (Asia/Makassar, UTC+8) as YYYY-MM-DD. */
export function baliToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** The last day an event is still on: its end date when it has one, otherwise its date. */
export function lastDay(event: EventLike): string {
  return (event.endDate || event.date || '').slice(0, 10);
}

/** Events that have not finished yet (last day >= todayIso), soonest first. Input is not mutated. */
export function upcomingEvents<T extends EventLike>(events: T[], todayIso: string): T[] {
  return events
    .filter((e) => lastDay(e) >= todayIso)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
