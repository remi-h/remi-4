import { formatKr, isEmail, MAX_AMOUNT, parseAmount } from './investor';

describe('parseAmount', () => {
  it('accepts whole kronor from 1 up to the maximum', () => {
    expect(parseAmount('10')).toBe(10);
    expect(parseAmount(' 500 ')).toBe(500);
    expect(parseAmount('1')).toBe(1);
    expect(parseAmount(String(MAX_AMOUNT))).toBe(MAX_AMOUNT);
  });

  it('rejects empty, zero, negative, fractional, text and too-large values', () => {
    for (const value of ['', '0', '-5', '1.5', '10kr', 'abc', String(MAX_AMOUNT + 1)]) {
      expect(parseAmount(value)).toBeNull();
    }
  });
});

describe('formatKr', () => {
  it('groups thousands with a space', () => {
    expect(formatKr(10)).toBe('10 kr');
    expect(formatKr(12500)).toBe('12 500 kr');
  });
});

describe('isEmail', () => {
  it('needs something@something.tld', () => {
    expect(isEmail('a@b.se')).toBe(true);
    expect(isEmail(' a@b.se ')).toBe(true);
    for (const value of ['', 'a', 'a@b', '@b.se', 'a b@c.se']) expect(isEmail(value)).toBe(false);
  });
});
