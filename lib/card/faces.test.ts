import { CARD_LINKS, linkAt } from './faces';

describe('the links on the back', () => {
  it('finds each printed row, url or label, and nothing between or beside them', () => {
    // Rows sit at 380, 476 and 572px of a 1600 × 1035 face, starting 96px in.
    const v = (y: number) => y / 1035;
    expect(linkAt(500 / 1600, v(365))).toBe(CARD_LINKS[0].href);
    expect(linkAt(130 / 1600, v(461))).toBe(CARD_LINKS[1].href);
    expect(linkAt(800 / 1600, v(557))).toBe(CARD_LINKS[2].href);
    expect(linkAt(500 / 1600, v(250))).toBeNull();
    expect(linkAt(1500 / 1600, v(365))).toBeNull();
    expect(linkAt(500 / 1600, v(900))).toBeNull();
  });
});
