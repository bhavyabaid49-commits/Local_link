import express from "express";
import database from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { parsePositiveInteger } from "../middleware/validation.js";
import { calculatePricing } from "../services/pricing.js";
import { calculateSellSavings } from "../services/sellPricing.js";

const router = express.Router();

function getTiers(orderId) {
  return database.prepare("SELECT threshold_units AS min_units, unit_price FROM tiers WHERE group_order_id = ? ORDER BY threshold_units").all(orderId);
}

function pricingFor(order, tiers = getTiers(order.id)) {
  return calculatePricing({ totalUnits: order.units_committed, packSize: order.pack_size, minOrderTotal: order.min_order_total, basePrice: order.base_price, tiers });
}

function resolveFinalPricing(order, participants) {
  let eligible = participants.filter((participant) => participant.participant_status !== "Cancelled");
  for (let attempt = 0; attempt <= participants.length; attempt += 1) {
    const totalUnits = eligible.reduce((total, participant) => total + participant.quantity, 0);
    const pricing = calculatePricing({ totalUnits, packSize: order.pack_size, minOrderTotal: order.min_order_total, basePrice: order.base_price, tiers: getTiers(order.id) });
    if (totalUnits < order.min_order_total) return { cancelled: true, pricing, eligible, excluded: participants.filter((participant) => !eligible.includes(participant)) };
    const excluded = eligible.filter((participant) => participant.max_unit_price != null && participant.max_unit_price < pricing.current_unit_price);
    if (!excluded.length) return { cancelled: false, pricing, eligible, excluded: participants.filter((participant) => !eligible.includes(participant)) };
    eligible = eligible.filter((participant) => !excluded.includes(participant));
  }
  return { cancelled: true, pricing: calculatePricing({ totalUnits: 0, packSize: order.pack_size, minOrderTotal: order.min_order_total, basePrice: order.base_price, tiers: getTiers(order.id) }), eligible: [], excluded: participants };
}

function closeExpiredOrders() {
  const expired = database.prepare("SELECT * FROM group_orders WHERE status = 'Open' AND deadline <= ?").all(new Date().toISOString());
  const closeOrder = database.prepare("UPDATE group_orders SET status = ?, final_price = ? WHERE id = ?");
  const participantsForOrder = database.prepare("SELECT * FROM participants WHERE group_order_id = ?");
  const clearCharges = database.prepare("UPDATE participants SET price_paid = NULL, participant_status = 'Cancelled', cancel_reason = ? WHERE group_order_id = ?");
  const cancelParticipant = database.prepare("UPDATE participants SET price_paid = NULL, participant_status = 'Cancelled', cancel_reason = ? WHERE id = ?");
  const chargeParticipants = database.prepare("UPDATE participants SET price_paid = ?, participant_status = 'Active', cancel_reason = NULL WHERE id = ?");
  expired.forEach((order) => {
    const resolution = resolveFinalPricing(order, participantsForOrder.all(order.id));
    if (resolution.cancelled) {
      closeOrder.run("Cancelled", null, order.id);
      clearCharges.run(resolution.excluded.length ? "Price target not reached" : "Minimum not reached", order.id);
      return;
    }
    closeOrder.run("Closed", resolution.pricing.current_unit_price, order.id);
    resolution.eligible.forEach((participant) => chargeParticipants.run(resolution.pricing.current_unit_price, participant.id));
    resolution.excluded.forEach((participant) => cancelParticipant.run("Price target not reached", participant.id));
  });
}

function orderQuery(where = "", params = []) {
  closeExpiredOrders();
  const orders = database.prepare(`SELECT go.id, go.product_id, go.supplier_id, go.minimum_units, go.pack_size, go.min_order_total, go.base_price, go.deadline, go.status, go.final_price, p.name AS product_name, p.category, p.unit_label, s.name AS supplier_name, COALESCE(SUM(part.quantity), 0) AS units_committed, COUNT(DISTINCT part.business_id) AS business_count FROM group_orders go JOIN products p ON p.id = go.product_id JOIN suppliers s ON s.id = go.supplier_id LEFT JOIN participants part ON part.group_order_id = go.id ${where} GROUP BY go.id ORDER BY go.deadline`).all(...params);
  return orders.map((order) => {
    const tiers = getTiers(order.id);
    const pricing = pricingFor(order, tiers);
    return { ...order, tiers, ...pricing, current_unit_price: order.final_price ?? pricing.current_unit_price, current_price: order.final_price ?? pricing.current_unit_price };
  });
}

router.get("/", (request, response) => {
  const category = String(request.query.category || "").trim();
  const orders = orderQuery(category ? "WHERE p.category = ?" : "", category ? [category] : []);
  response.json({ orders });
});

router.get("/:id", (request, response) => {
  const order = orderQuery("WHERE go.id = ?", [request.params.id])[0];
  if (!order) return response.status(404).json({ error: "Group order not found." });
  const participants = database.prepare("SELECT b.business_name, part.quantity FROM participants part JOIN businesses b ON b.id = part.business_id WHERE part.group_order_id = ? ORDER BY part.id").all(order.id).map((participant) => ({ ...participant, business_name: participant.business_name.slice(0, 3) + "***" }));
  response.json({ order: { ...order, participants } });
});

router.post("/:id/join", requireAuth, (request, response) => {
  if (request.business.account_status !== "Verified") return response.status(403).json({ error: "Only verified businesses can join orders." });
  closeExpiredOrders();
  const order = database.prepare("SELECT * FROM group_orders WHERE id = ? AND status = 'Open' AND deadline > ?").get(request.params.id, new Date().toISOString());
  if (!order) return response.status(400).json({ error: "This order is closed or its deadline has passed." });
  const quantity = parsePositiveInteger(request.body.quantity);
  if (!quantity) return response.status(400).json({ error: "Quantity must be a positive whole number." });
  if (quantity % order.pack_size !== 0) return response.status(400).json({ error: `Quantity must be in multiples of ${order.pack_size}.` });
  const maxUnitPrice = request.body.maxUnitPrice === "" || request.body.maxUnitPrice == null ? null : Number(request.body.maxUnitPrice);
  if (maxUnitPrice != null && (!Number.isFinite(maxUnitPrice) || maxUnitPrice <= 0)) return response.status(400).json({ error: "Enter a valid maximum price per unit." });
  database.prepare("INSERT INTO participants (group_order_id, business_id, quantity, max_unit_price, participant_status, cancel_reason) VALUES (?, ?, ?, ?, 'Active', NULL) ON CONFLICT(group_order_id, business_id) DO UPDATE SET quantity = excluded.quantity, max_unit_price = excluded.max_unit_price, participant_status = 'Active', cancel_reason = NULL").run(order.id, request.business.id, quantity, maxUnitPrice);
  const total = database.prepare("SELECT COALESCE(SUM(quantity), 0) AS units_committed FROM participants WHERE group_order_id = ?").get(order.id).units_committed;
  const pricing = calculatePricing({ totalUnits: total, packSize: order.pack_size, minOrderTotal: order.min_order_total, basePrice: order.base_price, tiers: getTiers(order.id) });
  response.json({ message: "Your quantity has been saved.", priceEstimate: pricing.current_unit_price, pricing });
});

router.get("/me/summary", requireAuth, (request, response) => {
  closeExpiredOrders();
  const orders = database.prepare("SELECT go.id, p.name AS product_name, CASE WHEN part.participant_status = 'Cancelled' THEN 'Cancelled' ELSE go.status END AS status, part.cancel_reason, go.deadline, go.pack_size, go.min_order_total, go.base_price, go.final_price, part.quantity, COALESCE((SELECT SUM(quantity) FROM participants WHERE group_order_id = go.id AND participant_status = 'Active'), 0) AS units_committed FROM participants part JOIN group_orders go ON go.id = part.group_order_id JOIN products p ON p.id = go.product_id WHERE part.business_id = ? ORDER BY go.deadline DESC").all(request.business.id).map((order) => {
    const tiers = getTiers(order.id);
    const pricing = pricingFor(order, tiers);
    const currentPrice = order.final_price ?? pricing.current_unit_price;
    return { ...order, ...pricing, current_price: currentPrice, starting_price: order.base_price, savings: order.status === "Cancelled" ? 0 : Math.max(0, (order.base_price - currentPrice) * order.quantity) };
  });
  const sellListings = database.prepare("SELECT sl.id, sl.product_id, sl.available_units, sl.price_per_unit, sl.minimum_order_units, sl.deadline, sl.status, sl.created_at, p.name AS product_name, p.unit_label FROM sell_listings sl JOIN products p ON p.id = sl.product_id WHERE sl.seller_business_id = ? ORDER BY sl.created_at DESC").all(request.business.id);
  const purchases = database.prepare("SELECT so.id, so.quantity, so.unit_price, so.status, so.created_at, p.name AS product_name, p.unit_label, b.business_name AS seller_name, COALESCE(sl.base_price, sl.price_per_unit) AS starting_price, sl.initial_units, sl.available_units, sl.status AS listing_status FROM sell_orders so JOIN sell_listings sl ON sl.id = so.listing_id JOIN products p ON p.id = sl.product_id JOIN businesses b ON b.id = sl.seller_business_id WHERE so.buyer_business_id = ? ORDER BY so.created_at DESC").all(request.business.id).map((purchase) => ({ ...purchase, savings: calculateSellSavings({ basePrice: purchase.starting_price, unitPrice: purchase.unit_price, quantity: purchase.quantity }) }));
  response.json({ orders, sellListings, purchases });
});

export { closeExpiredOrders, resolveFinalPricing };
export default router;
