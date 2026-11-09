import assert from "node:assert/strict";
import { calculateSellPrice, calculateSellSavings } from "./sellPricing.js";

const price = (soldUnits) => calculateSellPrice({ basePrice: 100, initialUnits: 1000, soldUnits }).current_price;

assert.equal(price(99), 100);
assert.equal(price(100), 95);
assert.equal(price(500), 90);
assert.equal(price(750), 85);
assert.equal(calculateSellPrice({ basePrice: 100, initialUnits: 1000, soldUnits: 500 }).next_price, 85);
assert.equal(
  calculateSellSavings({ basePrice: 100, unitPrice: 90, quantity: 10 }),
  100,
);
assert.equal(
  calculateSellSavings({ basePrice: 100, unitPrice: 100, quantity: 10 }),
  0,
);

console.log("Sell pricing tests passed.");
