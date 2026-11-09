import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { parsePositiveInteger, requiredFields } from "../middleware/validation.js";
import { calculateSellPrice } from "../services/sellPricing.js";
import {
  closeSellListing,
  createSellListing,
  findOpenSellListing,
  getSellListingJoined,
  listProducts,
  listSellListings,
  placeSellOrder,
} from "../db/repositories.js";

const router = express.Router();

function withPricing(listing) {
  return {
    ...listing,
    ...calculateSellPrice({
      basePrice: listing.base_price ?? listing.price_per_unit,
      initialUnits: listing.initial_units || listing.available_units,
      soldUnits: (listing.initial_units || listing.available_units) - listing.available_units,
    }),
  };
}

router.get("/", (_request, response) => {
  response.json({
    listings: listSellListings({ status: "Open" }).map(withPricing),
  });
});

router.get("/catalog", (_request, response) => {
  response.json({ products: listProducts() });
});

router.get("/:id", (request, response) => {
  const listing = getSellListingJoined(request.params.id);
  if (!listing) return response.status(404).json({ error: "Sell listing not found." });
  response.json({ listing: withPricing(listing) });
});

router.post("/:id/orders", requireAuth, (request, response) => {
  if (request.business.account_status !== "Verified") return response.status(403).json({ error: "Only verified businesses can place orders." });
  const quantity = parsePositiveInteger(request.body.quantity);
  if (!quantity) return response.status(400).json({ error: "Enter a positive whole-number quantity." });
  const listing = findOpenSellListing(request.params.id, new Date().toISOString());
  if (!listing) return response.status(400).json({ error: "This seller listing is closed or its deadline has passed." });
  if (Number(listing.seller_business_id) === Number(request.business.id)) return response.status(400).json({ error: "You cannot order your own listing." });
  if (quantity < Number(listing.minimum_order_units)) return response.status(400).json({ error: `Minimum order is ${listing.minimum_order_units} units.` });
  if (quantity > Number(listing.available_units)) return response.status(400).json({ error: `Only ${listing.available_units} units are available.` });
  const remaining = Number(listing.available_units) - quantity;
  const pricing = calculateSellPrice({
    basePrice: listing.base_price ?? listing.price_per_unit,
    initialUnits: listing.initial_units || listing.available_units,
    soldUnits: (listing.initial_units || listing.available_units) - remaining,
  });
  const order = placeSellOrder({
    listing,
    buyerId: request.business.id,
    quantity,
    unitPrice: pricing.current_price,
  });
  response.status(201).json({ orderId: order.id, message: "Order placed with the seller." });
});

router.post("/", requireAuth, (request, response) => {
  if (request.business.account_status !== "Verified") return response.status(403).json({ error: "Only verified businesses can create sell listings." });
  const missing = requiredFields(request.body, ["productId", "availableUnits", "pricePerUnit"]);
  const availableUnits = parsePositiveInteger(request.body.availableUnits);
  const minimumOrderUnits = parsePositiveInteger(request.body.minimumOrderUnits || 1);
  const pricePerUnit = Number(request.body.pricePerUnit);
  if (missing.length || !availableUnits || !minimumOrderUnits || !Number.isFinite(pricePerUnit) || pricePerUnit <= 0) return response.status(400).json({ error: "Item, available units, minimum order, and a valid price are required." });
  if (request.body.deadline && new Date(request.body.deadline) <= new Date()) return response.status(400).json({ error: "Choose a future deadline." });
  const listing = createSellListing({
    seller_business_id: request.business.id,
    product_id: Number(request.body.productId),
    available_units: availableUnits,
    initial_units: availableUnits,
    price_per_unit: pricePerUnit,
    base_price: pricePerUnit,
    minimum_order_units: minimumOrderUnits,
    deadline: request.body.deadline ? new Date(request.body.deadline).toISOString() : null,
    notes: String(request.body.notes || "").trim(),
  });
  response.status(201).json({ listingId: listing.id, message: "Sell listing posted." });
});

router.patch("/:id/close", requireAuth, (request, response) => {
  const changed = closeSellListing(request.params.id, request.business.id);
  if (!changed) return response.status(404).json({ error: "Open listing not found for this business." });
  response.json({ message: "Sell listing closed." });
});

export default router;
