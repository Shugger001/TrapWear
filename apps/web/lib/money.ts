export function formatMoneyCents(cents: number): string {
  return `GH₵${(cents / 100).toFixed(2)}`;
}
