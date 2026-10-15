import { bonsai, bonsaiMtime, dayOf, PLANTED } from './bonsai';

const DAY = 86400;
const planted = Date.parse(PLANTED) / 1000;
const at = (day: number) => planted + day * DAY + 3600;
/** The tree's wood (not leaves, snow or the pot) as a set of "x,y" cells, counted from the pot up. */
const wood = (text: string) => {
  const rows = text.split('\n');
  const pot = rows.findIndex((r) => r.includes('[___'));
  const cells = new Set<string>();
  rows
    .slice(0, pot)
    .forEach((row, i) => [...row].forEach((ch, x) => '|/\\_'.includes(ch) && cells.add(`${x},${pot - i}`)));
  return cells;
};

describe('the bonsai', () => {
  it('is the same tree for everyone on the same day', () => {
    expect(bonsai(at(12))).toBe(bonsai(at(12) + 7200));
  });

  it('starts as a sprout on the day it was planted', () => {
    expect(dayOf(at(0))).toBe(0);
    expect(wood(bonsai(at(0))).size).toBeLessThanOrEqual(3);
    expect(bonsai(at(0))).toContain('day 0 ·');
  });

  it('grows a little every day and never loses wood', () => {
    let last = wood(bonsai(at(0)));
    let grew = 0;
    for (let day = 1; day <= 160; day++) {
      const now = wood(bonsai(at(day)));
      for (const cell of last) expect(now.has(cell)).toBe(true);
      if (now.size > last.size) grew++;
      last = now;
    }
    expect(grew).toBeGreaterThan(15);
    expect(last.size).toBeGreaterThan(40);
  });

  it('changes with the seasons', () => {
    expect(bonsai(Date.parse('2027-04-20') / 1000)).toContain('@'); // blossom
    expect(bonsai(Date.parse('2027-07-20') / 1000)).not.toMatch(/[@%]/);
    expect(bonsai(Date.parse('2027-10-20') / 1000)).toContain('%'); // autumn leaves
    expect(bonsai(Date.parse('2027-01-20') / 1000)).not.toMatch(/[&@%]/); // bare in winter
  });

  it('fits a phone-width prompt and sits in its pot', () => {
    const text = bonsai(at(400));
    for (const row of text.split('\n')) expect(row.length).toBeLessThanOrEqual(70);
    expect(text).toContain("'-'                     '-'");
  });

  it('never shows a day before it was planted', () => {
    expect(dayOf(planted - 10 * DAY)).toBe(0);
  });

  it('last changed at the start of the day', () => {
    expect(bonsaiMtime(at(3))).toBe(planted + 3 * DAY);
  });
});
