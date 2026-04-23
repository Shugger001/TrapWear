export function formatMoneyCents(cents: number): string {
  return `GH₵${(cents / 100).toFixed(2)}`;
}

/** Major currency units (e.g. 12.50) for form inputs — no currency symbol. */
export function centsToMajorInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parseMajorToCents(input: string): { ok: true; cents: number } | { ok: false; error: string } {
  const t = input.trim().replace(/,/g, "");
  if (t === "") return { ok: false, error: "Amount is required." };
  const n = Number.parseFloat(t);
  if (Number.isNaN(n) || !Number.isFinite(n)) return { ok: false, error: "Enter a valid number." };
  const cents = Math.round(n * 100);
  if (!Number.isSafeInteger(cents)) return { ok: false, error: "Amount is too large." };
  return { ok: true, cents };
}
