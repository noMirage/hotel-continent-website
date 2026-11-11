export function getEffectivePrice(
  prices: { guest_count: number; price_per_night: number }[],
  guestCount: number,
  basePrice: number,
): number {
  const match = prices.find(p => p.guest_count === guestCount);
  return match ? match.price_per_night : basePrice;
}

export function getMinPrice(
  prices: { guest_count: number; price_per_night: number }[],
  basePrice: number,
): number {
  if (!prices.length) return basePrice;
  return Math.min(...prices.map(p => p.price_per_night));
}
