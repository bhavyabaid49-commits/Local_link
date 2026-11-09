import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { parsePositiveInteger } from "../middleware/validation.js";
import { calculatePricing } from "../services/pricing.js";
import { calculateSellSavings } from "../services/sellPricing.js";
import {
  findOpenGroupOrder,
  getBusinessOrderSummaries,
  getGroupOrderJoined,
  getParticipants,
  getTiers,
  listExpiredOpenOrders,
  listGroupOrders,
  listOrderParticipants,
  listPurchasesByBuyer,
  listSellListingsBySeller,
  totalUnitsForOrder,
  updateGroupOrder,
  updateParticipant,
  updateParticipantsForOrder,
  upsertParticipant,
} from "../db/repositories.js";

const router = express.Router();

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
  listExpiredOpenOrders(new Date().toISOString()).forEach((order) => {
    const resolution = resolveFinalPricing(order, getParticipants(order.id));
    if (resolution.cancelled) {
      updateGroupOrder(order.id, { status: "Cancelled", final_price: null });
      updateParticipantsForOrder(order.id, {
        price_paid: null,
        participant_status: "Cancelled",
        cancel_reason: resolution.excluded.length ? "Price target not reached" : "Minimum not reached",
      });
      return;
    }
    updateGroupOrder(order.id, { status: "Closed", final_price: resolution.pricing.current_unit_price });
    resolution.eligible.forEach((participant) =>
      updateParticipant(participant.id, {
        price_paid: resolution.pricing.current_unit_price,
        participant_status: "Active",
        cancel_reason: null,
      }),
    );
    resolution.excluded.forEach((participant) =>
      updateParticipant(participant.id, {
        price_paid: null,
        participant_status: "Cancelled",
        cancel_reason: "Price target not reached",
      }),
    );
  });
}

function decorateOrder(order) {
  const tiers = getTiers(order.id);
  const pricing = pricingFor(order, tiers);
  const currentPrice = order.final_price ?? pricing.current_unit_price;
  return {
    ...order,
    tiers,
    ...pricing,
    current_unit_price: currentPrice,
    current_price: currentPrice,
  };
}

function orderQuery({ category } = {}) {
  closeExpiredOrders();
  return listGroupOrders({ category }).map(decorateOrder);
}

router.get("/", (request, response) => {
  const category = String(request.query.category || "").trim();
  response.json({ orders: orderQuery({ category: category || undefined }) });
});

router.get("/:id", (request, response) => {
  closeExpiredOrders();
  const order = getGroupOrderJoined(request.params.id);
  if (!order) return response.status(404).json({ error: "Group order not found." });
  const participants = listOrderParticipants(order.id);
  response.json({ order: { ...decorateOrder(order), participants } });
});

router.post("/:id/join", requireAuth, (request, response) => {
  if (request.business.account_status !== "Verified") return response.status(403).json({ error: "Only verified businesses can join orders." });
  closeExpiredOrders();
  const order = findOpenGroupOrder(request.params.id, new Date().toISOString());
  if (!order) return response.status(400).json({ error: "This order is closed or its deadline has passed." });
  const quantity = parsePositiveInteger(request.body.quantity);
  if (!quantity) return response.status(400).json({ error: "Quantity must be a positive whole number." });
  if (quantity % order.pack_size !== 0) return response.status(400).json({ error: `Quantity must be in multiples of ${order.pack_size}.` });
  const maxUnitPrice = request.body.maxUnitPrice === "" || request.body.maxUnitPrice == null ? null : Number(request.body.maxUnitPrice);
  if (maxUnitPrice != null && (!Number.isFinite(maxUnitPrice) || maxUnitPrice <= 0)) return response.status(400).json({ error: "Enter a valid maximum price per unit." });
  upsertParticipant({
    orderId: order.id,
    businessId: request.business.id,
    quantity,
    maxUnitPrice,
  });
  const total = totalUnitsForOrder(order.id);
  const pricing = calculatePricing({ totalUnits: total, packSize: order.pack_size, minOrderTotal: order.min_order_total, basePrice: order.base_price, tiers: getTiers(order.id) });
  response.json({ message: "Your quantity has been saved.", priceEstimate: pricing.current_unit_price, pricing });
});

router.get("/me/summary", requireAuth, (request, response) => {
  closeExpiredOrders();
  const orders = getBusinessOrderSummaries(request.business.id).map((order) => {
    const tiers = getTiers(order.id);
    const pricing = pricingFor(order, tiers);
    const currentPrice = order.final_price ?? pricing.current_unit_price;
    return {
      ...order,
      ...pricing,
      current_price: currentPrice,
      starting_price: order.base_price,
      savings: order.status === "Cancelled" ? 0 : Math.max(0, (order.base_price - currentPrice) * order.quantity),
    };
  });
  const sellListings = listSellListingsBySeller(request.business.id);
  const purchases = listPurchasesByBuyer(request.business.id).map((purchase) => ({
    ...purchase,
    savings: calculateSellSavings({
      basePrice: purchase.starting_price,
      unitPrice: purchase.unit_price,
      quantity: purchase.quantity,
    }),
  }));
  response.json({ orders, sellListings, purchases });
});

export { closeExpiredOrders, resolveFinalPricing };
export default router;
