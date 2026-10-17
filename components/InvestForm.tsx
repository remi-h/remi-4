'use client';

import { type FormEvent, useState } from 'react';
import { Window } from '@/components/Window';
import { formatKr, isEmail, parseAmount, PRESETS } from '@/lib/investor';

const fieldClass = 'w-full border border-line bg-ink px-3 py-2.5 text-fg placeholder:text-muted';

/** A mock checkout: it validates, then says plainly that nothing was charged, stored or sent. */
export const InvestForm = () => {
  const [preset, setPreset] = useState<number | null>(10);
  const [custom, setCustom] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<number | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amount = preset ?? parseAmount(custom);
    if (amount === null) return setError('Enter a whole amount in kronor, 1 to 1 000 000.');
    if (!isEmail(email)) return setError('Enter an email address for the quarterly report.');
    setError('');
    setReceipt(amount);
  };

  if (receipt !== null) {
    return (
      <Window title="receipt" meta="mock">
        <div className="space-y-3 p-5 text-sm" data-testid="invest-receipt" role="status">
          <p className="text-cyan">
            invested {formatKr(receipt)} <span className="text-muted">→ quarterly report to {email.trim()}</span>
          </p>
          <p className="font-grotesk text-base text-body">
            Thank you. This is a mock checkout, so nothing was charged and your email was not saved or sent anywhere.
          </p>
          <button className="text-cyan hover:underline" onClick={() => setReceipt(null)} type="button">
            [ invest again ]
          </button>
        </div>
      </Window>
    );
  }

  return (
    <Window title="invest" meta="mock checkout · nothing is charged">
      <form className="space-y-6 p-5 text-sm" noValidate onSubmit={submit}>
        <fieldset>
          <legend className="mb-3 text-muted"># amount</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((amount) => (
              <button
                aria-pressed={preset === amount}
                className={`border px-4 py-2 ${
                  preset === amount ? 'border-hot bg-hot font-bold text-ink' : 'border-line text-body hover:text-cyan'
                }`}
                key={amount}
                onClick={() => {
                  setPreset(amount);
                  setCustom('');
                }}
                type="button"
              >
                {formatKr(amount)}
              </button>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-muted">or any other amount, in kr</span>
            <input
              className={fieldClass}
              inputMode="numeric"
              onChange={(event) => {
                setCustom(event.target.value);
                setPreset(null);
              }}
              placeholder="25"
              value={custom}
            />
          </label>
        </fieldset>
        <label className="block">
          <span className="mb-1 block text-muted"># email, for the quarterly report</span>
          <input
            autoComplete="email"
            className={fieldClass}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </label>
        {error ? (
          <p className="text-hot" role="alert">
            {error}
          </p>
        ) : null}
        <button className="bg-cyan px-5 py-2.5 font-bold text-ink hover:bg-fg" type="submit">
          [ invest ]
        </button>
      </form>
    </Window>
  );
};
