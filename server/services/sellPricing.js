const sellTiers = [
  { soldPercent: 0.75, pricePercent: 0.85 },
  { soldPercent: 0.5, pricePercent: 0.9 },
  { soldPercent: 0.1, pricePercent: 0.95 },
];

export function calculateSellSavings({ basePrice, unitPrice, quantity }) {
  const savingPerUnit = Number(basePrice) - Number(unitPrice);
  const savings = Math.max(0, savingPerUnit * Number(quantity || 0));
  return Number(savings.toFixed(2));
}

export function calculateSellPrice({ basePrice, initialUnits, soldUnits }) {
  const soldPercent = initialUnits > 0 ? Math.min(Math.max(soldUnits / initialUnits, 0), 1) : 0;
  const reachedTier = sellTiers.find((tier) => soldPercent >= tier.soldPercent);
  const pricePercent = reachedTier?.pricePercent || 1;
  const nextTier = [...sellTiers].reverse().find((tier) => soldPercent < tier.soldPercent) || null;
  return {
    current_price: Number((basePrice * pricePercent).toFixed(2)),
    price_percent: pricePercent,
    percent_off_base: Number(((1 - pricePercent) * 100).toFixed(2)),
    sold_percent: Number((soldPercent * 100).toFixed(2)),
    next_price: nextTier ? Number((basePrice * nextTier.pricePercent).toFixed(2)) : null,
    next_sold_percent: nextTier ? nextTier.soldPercent * 100 : null,
  };
}
