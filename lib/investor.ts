// The mock investor checkout: nothing is charged, stored or sent. Amounts are whole kronor.

export const PRESETS = [10, 50, 100, 500] as const;

/** The largest pledge the form accepts, so a stray extra digit is caught. */
export const MAX_AMOUNT = 1_000_000;

/** Whole kronor from what was typed, or null when it is not an amount between 1 and MAX_AMOUNT. */
export const parseAmount = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return amount >= 1 && amount <= MAX_AMOUNT ? amount : null;
};

export const formatKr = (amount: number) => `${amount.toLocaleString('en-US').replace(/,/g, ' ')} kr`;

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
