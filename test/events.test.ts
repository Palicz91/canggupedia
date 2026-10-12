import { describe, it, expect } from 'vitest';
import { baliToday, upcomingEvents } from '../src/lib/events';

describe('baliToday', () => {
  it('uses Bali time, not UTC', () => {
    // 17:30 UTC on the 11th is already 01:30 on the 12th in Bali
    expect(baliToday(new Date('2026-10-11T17:30:00Z'))).toBe('2026-10-12');
    expect(baliToday(new Date('2026-10-11T15:59:00Z'))).toBe('2026-10-11');
  });
});

describe('upcomingEvents', () => {
  const ev = (date: string, endDate?: string) => ({ date, endDate });
  it('drops past events and sorts the rest ascending', () => {
    const out = upcomingEvents([ev('2026-12-01'), ev('2025-11-20'), ev('2026-10-12'), ev('2026-10-11')], '2026-10-12');
    expect(out.map((e) => e.date)).toEqual(['2026-10-12', '2026-12-01']);
  });
  it('keeps a multi-day event until its end date', () => {
    expect(upcomingEvents([ev('2026-10-10', '2026-10-13')], '2026-10-12')).toHaveLength(1);
    expect(upcomingEvents([ev('2026-10-10', '2026-10-11')], '2026-10-12')).toHaveLength(0);
  });
  it('handles an empty list and does not mutate the input', () => {
    expect(upcomingEvents([], '2026-10-12')).toEqual([]);
    const input = [ev('2026-12-01'), ev('2026-11-01')];
    upcomingEvents(input, '2026-10-12');
    expect(input[0].date).toBe('2026-12-01');
  });
});
