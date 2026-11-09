import assert from "node:assert/strict";
import { calculatePricing, validatePricingSettings } from "./pricing.js";

const settings = {
  packSize: 100,
  minOrderTotal: 300,
  basePrice: 10,
  tiers: [
    { min_units: 300, unit_price: 9.5 },
    { min_units: 500, unit_price: 9 },
    { min_units: 1000, unit_price: 8.5 },
  ],
};

assert.equal(calculatePricing({ ...settings, totalUnits: 200 }).current_tier_index, -1);
assert.equal(calculatePricing({ ...settings, totalUnits: 300 }).current_tier_index, 0);
assert.equal(calculatePricing({ ...settings, totalUnits: 400 }).next_tier_min_units, 500);
assert.equal(calculatePricing({ ...settings, totalUnits: 1200 }).next_tier_min_units, null);
assert.equal(validatePricingSettings(settings), null);
assert.match(validatePricingSettings({ ...settings, tiers: [{ min_units: 250, unit_price: 9 }] }), /exactly three/);

console.log("Pricing tests passed.");
