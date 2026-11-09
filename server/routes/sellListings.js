import express from "express";
import database from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { parsePositiveInteger, requiredFields } from "../middleware/validation.js";
import { calculateSellPrice } from "../services/sellPricing.js";

const router = express.Router();

function listingQuery(where = "", params = []) {
  return database.prepare(`SELECT sl.id, sl.seller_business_id, sl.product_id, sl.available_units, sl.initial_units, sl.price_per_unit, sl.base_price, sl.minimum_order_units, sl.deadline, sl.notes, sl.status, sl.created_at, p.name AS product_name, p.category, p.unit_label, b.business_name AS seller_name FROM sell_listings sl JOIN products p ON p.id = sl.product_id JOIN businesses b ON b.id = sl.seller_business_id ${where} ORDER BY sl.created_at DESC`).all(...params).map((listing) => ({
    ...listing,
    ...calculateSellPrice({ basePrice: listing.base_price ?? listing.price_per_unit, initialUnits: listing.initial_units || listing.available_units, soldUnits: (listing.initial_units || listing.available_units) - listing.available_units }),
  }));
}

router.get("/", (_request, response) => {
  response.json({ listings: listingQuery("WHERE sl.status = 'Open'") });
});

router.get("/catalog", (_request, response) => {
  response.json({ products: database.prepare("SELECT id, name, category, unit_label FROM products ORDER BY category, name").all() });
});

router.get("/:id", (request, response) => {
  const listing = listingQuery("WHERE sl.id = ?", [request.params.id])[0];
  if (!listing) return response.status(404).json({ error: "Sell listing not found." });
  response.json({ listing });
});

router.post("/:id/orders", requireAuth, (request, response) => {
  if (request.business.account_status !== "Verified") return response.status(403).json({ error: "Only verified businesses can place orders." });
  const quantity = parsePositiveInteger(request.body.quantity);
  if (!quantity) return response.status(400).json({ error: "Enter a positive whole-number quantity." });
  const listing = database.prepare("SELECT * FROM sell_listings WHERE id = ? AND status = 'Open' AND (deadline IS NULL OR deadline > ?)").get(request.params.id, new Date().toISOString());
  if (!listing) return response.status(400).json({ error: "This seller listing is closed or its deadline has passed." });
  if (listing.seller_business_id === request.business.id) return response.status(400).json({ error: "You cannot order your own listing." });
  if (quantity < listing.minimum_order_units) return response.status(400).json({ error: `Minimum order is ${listing.minimum_order_units} units.` });
  if (quantity > listing.available_units) return response.status(400).json({ error: `Only ${listing.available_units} units are available.` });
  const placeOrder = database.transaction(() => {
    const remaining = listing.available_units - quantity;
    const pricing = calculateSellPrice({ basePrice: listing.base_price ?? listing.price_per_unit, initialUnits: listing.initial_units || listing.available_units, soldUnits: (listing.initial_units || listing.available_units) - remaining });
    const order = database.prepare("INSERT INTO sell_orders (listing_id, buyer_business_id, quantity, unit_price) VALUES (?, ?, ?, ?)").run(listing.id, request.business.id, quantity, pricing.current_price);
    database.prepare("UPDATE sell_listings SET available_units = ?, status = CASE WHEN ? = 0 THEN 'Closed' ELSE status END WHERE id = ?").run(remaining, remaining, listing.id);
    database.prepare("UPDATE sell_orders SET unit_price = ? WHERE listing_id = ?").run(pricing.current_price, listing.id);
    return order.lastInsertRowid;
  });
  response.status(201).json({ orderId: placeOrder(), message: "Order placed with the seller." });
});

router.post("/", requireAuth, (request, response) => {
  if (request.business.account_status !== "Verified") return response.status(403).json({ error: "Only verified businesses can create sell listings." });
  const missing = requiredFields(request.body, ["productId", "availableUnits", "pricePerUnit"]);
  const availableUnits = parsePositiveInteger(request.body.availableUnits);
  const minimumOrderUnits = parsePositiveInteger(request.body.minimumOrderUnits || 1);
  const pricePerUnit = Number(request.body.pricePerUnit);
  if (missing.length || !availableUnits || !minimumOrderUnits || !Number.isFinite(pricePerUnit) || pricePerUnit <= 0) return response.status(400).json({ error: "Item, available units, minimum order, and a valid price are required." });
  if (request.body.deadline && new Date(request.body.deadline) <= new Date()) return response.status(400).json({ error: "Choose a future deadline." });
  const result = database.prepare("INSERT INTO sell_listings (seller_business_id, product_id, available_units, initial_units, price_per_unit, base_price, minimum_order_units, deadline, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(request.business.id, request.body.productId, availableUnits, availableUnits, pricePerUnit, pricePerUnit, minimumOrderUnits, request.body.deadline ? new Date(request.body.deadline).toISOString() : null, String(request.body.notes || "").trim());
  response.status(201).json({ listingId: result.lastInsertRowid, message: "Sell listing posted." });
});

router.patch("/:id/close", requireAuth, (request, response) => {
  const result = database.prepare("UPDATE sell_listings SET status = 'Closed' WHERE id = ? AND seller_business_id = ? AND status = 'Open'").run(request.params.id, request.business.id);
  if (!result.changes) return response.status(404).json({ error: "Open listing not found for this business." });
  response.json({ message: "Sell listing closed." });
});

export default router;