/** Discount in cents from a percent-off promotion (floored). */
export function percentDiscountCents(subtotalCents: number, percent: number): number {
  if (percent <= 0 || percent > 100) return 0;
  return Math.floor((subtotalCents * percent) / 100);
}

/**
 * Split product subtotal after discount across lines (integer cents), preserving sum.
 * `lineTotalsCents` are per-line totals (unit × qty).
 */
export function lineTotalsAfterDiscount(lineTotalsCents: number[], discountCents: number): number[] {
  const sub = lineTotalsCents.reduce((a, b) => a + b, 0);
  if (lineTotalsCents.length === 0 || sub === 0) return lineTotalsCents.slice();
  const target = Math.max(0, sub - discountCents);
  if (target === 0) return lineTotalsCents.map(() => 0);

  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < lineTotalsCents.length - 1; i++) {
    const t = Math.floor((lineTotalsCents[i] * target) / sub);
    out.push(t);
    sum += t;
  }
  out.push(target - sum);
  return out;
}
