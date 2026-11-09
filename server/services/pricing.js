export function validatePricingSettings({ packSize, minOrderTotal, basePrice, tiers }) {
  if (!Number.isInteger(packSize) || packSize <= 0) return "Pack size must be a positive whole number.";
  if (!Number.isInteger(minOrderTotal) || minOrderTotal <= 0) return "Minimum order total must be a positive whole number.";
  if (minOrderTotal % packSize !== 0) return "Minimum order total must be a multiple of the pack size.";
  if (!Number.isFinite(basePrice) || basePrice <= 0) return "Base price must be greater than zero.";
  if (!Array.isArray(tiers) || tiers.length !== 3) return "Add exactly three pricing tiers.";
  for (let index = 0; index < tiers.length; index += 1) {
    const tier = tiers[index];
    if (!Number.isInteger(tier.min_units) || tier.min_units < minOrderTotal || tier.min_units % packSize !== 0) return "Every tier minimum must be a multiple of the pack size and at least the minimum order total.";
    if (!Number.isFinite(tier.unit_price) || tier.unit_price <= 0 || tier.unit_price >= basePrice) return "Every tier price must be below the base price.";
    if (index > 0 && (tier.min_units <= tiers[index - 1].min_units || tier.unit_price >= tiers[index - 1].unit_price)) return "Tier minimums must ascend and tier prices must descend.";
  }
  return null;
}

export function calculatePricing({ totalUnits, packSize, minOrderTotal, basePrice, tiers }) {
  const units = Math.max(Number(totalUnits) || 0, 0);
  const sortedTiers = [...tiers].sort((first, second) => first.min_units - second.min_units);
  let currentTierIndex = -1;
  sortedTiers.forEach((tier, index) => {
    if (units >= tier.min_units) currentTierIndex = index;
  });
  const currentUnitPrice = currentTierIndex >= 0 ? sortedTiers[currentTierIndex].unit_price : basePrice;
  const nextTier = sortedTiers[currentTierIndex + 1] || null;
  const minOrderProgress = Math.min(units / minOrderTotal, 1);
  return {
    current_unit_price: currentUnitPrice,
    current_tier_index: currentTierIndex,
    next_tier_min_units: nextTier?.min_units ?? null,
    units_needed_for_next_tier: nextTier ? Math.max(nextTier.min_units - units, 0) : 0,
    next_tier_price: nextTier?.unit_price ?? null,
    percent_off_base: basePrice ? Math.max(0, ((basePrice - currentUnitPrice) / basePrice) * 100) : 0,
    min_order_progress: minOrderProgress,
  };
}
