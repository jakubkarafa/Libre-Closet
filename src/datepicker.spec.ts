// The date picker's date maths (public/js/datepicker.js, a browser script that also exports its helpers for this test).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dp = require('../public/js/datepicker.js') as {
  iso: (d: Date) => string;
  parse: (v: string) => Date | null;
  addMonths: (d: Date, n: number) => Date;
  clamp: (d: Date, min: Date | null, max: Date | null) => Date;
  monthGrid: (year: number, month: number, firstDay: number) => Date[][];
};

describe('datepicker', () => {
  it('reads and writes YYYY-MM-DD only', () => {
    expect(dp.iso(dp.parse('2026-02-03')!)).toBe('2026-02-03');
    expect(dp.parse('03/02/2026')).toBeNull();
    expect(dp.parse('')).toBeNull();
  });

  it('starts the month grid on the locale first weekday', () => {
    // October 2026 starts on a Thursday
    const monday = dp.monthGrid(2026, 9, 1);
    expect(dp.iso(monday[0][0])).toBe('2026-09-28');
    expect(monday).toHaveLength(5);
    const sunday = dp.monthGrid(2026, 9, 0);
    expect(dp.iso(sunday[0][0])).toBe('2026-09-27');
    expect(sunday.every((week) => week.length === 7)).toBe(true);
    expect(dp.iso(sunday[sunday.length - 1][6])).toBe('2026-10-31');
  });

  it('moves by months without spilling into the next one', () => {
    expect(dp.iso(dp.addMonths(dp.parse('2026-01-31')!, 1))).toBe('2026-02-28');
    expect(dp.iso(dp.addMonths(dp.parse('2026-03-15')!, -12))).toBe(
      '2025-03-15',
    );
  });

  it('keeps a day inside min and max', () => {
    const min = dp.parse('2026-10-10');
    const max = dp.parse('2026-10-20');
    expect(dp.iso(dp.clamp(dp.parse('2026-10-01')!, min, max))).toBe(
      '2026-10-10',
    );
    expect(dp.iso(dp.clamp(dp.parse('2026-10-25')!, min, max))).toBe(
      '2026-10-20',
    );
    expect(dp.iso(dp.clamp(dp.parse('2026-10-15')!, null, null))).toBe(
      '2026-10-15',
    );
  });
});
