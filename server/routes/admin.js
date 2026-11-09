import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  parsePositiveInteger,
  requiredFields,
} from "../middleware/validation.js";
import { validatePricingSettings } from "../services/pricing.js";
import { resolveFinalPricing } from "./orders.js";
import {
  createGroupOrder,
  getGroupOrderById,
  getParticipants,
  listAdminProducts,
  listBusinessAccounts,
  listSuppliers,
  updateBusinessStatus,
  updateGroupOrder,
  updateParticipant,
  updateParticipantsForOrder,
} from "../db/repositories.js";

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/catalog", (_request, response) =>
  response.json({
    products: listAdminProducts(),
    suppliers: listSuppliers(),
  }),
);

router.get("/businesses", (_request, response) =>
  response.json({
    businesses: listBusinessAccounts(),
  }),
);

router.patch("/businesses/:id", (request, response) => {
  if (!["Verified", "Rejected"].includes(request.body.status))
    return response
      .status(400)
      .json({ error: "Status must be Verified or Rejected." });
  updateBusinessStatus(request.params.id, request.body.status);
  response.json({ message: "Business status updated." });
});

router.post("/orders", (request, response) => {
  const missing = requiredFields(request.body, [
    "productId",
    "supplierId",
    "deadline",
    "tiers",
  ]);
  const minimumUnits = parsePositiveInteger(request.body.minOrderTotal || request.body.minimumUnits);
  const packSize = parsePositiveInteger(request.body.packSize);
  const basePrice = Number(request.body.basePrice);
  const tiers = Array.isArray(request.body.tiers) ? request.body.tiers.map((tier) => ({ min_units: Number(tier.minUnits ?? tier.thresholdUnits), unit_price: Number(tier.unitPrice) })) : [];
  const pricingError = validatePricingSettings({ packSize, minOrderTotal: minimumUnits, basePrice, tiers });
  if (
    missing.length ||
    !minimumUnits || !packSize || !Number.isFinite(basePrice) || pricingError
  )
    return response
      .status(400)
      .json({
        error:
          pricingError || "Product, supplier, pack size, MOQ, base price, deadline, and three tiers are required.",
      });
  const order = createGroupOrder({
    productId: request.body.productId,
    supplierId: request.body.supplierId,
    minOrderTotal: minimumUnits,
    packSize,
    basePrice,
    deadline: request.body.deadline,
    tiers,
  });
  response.status(201).json({ orderId: order.id });
});

router.patch("/orders/:id/close", (request, response) => {
  const order = getGroupOrderById(request.params.id);
  if (!order || order.status !== "Open") return response.status(404).json({ error: "Open order not found." });
  const participants = getParticipants(order.id);
  const resolution = resolveFinalPricing(order, participants);
  if (resolution.cancelled) {
    updateGroupOrder(order.id, { status: "Cancelled", final_price: null });
    updateParticipantsForOrder(order.id, {
      price_paid: null,
      participant_status: "Cancelled",
      cancel_reason: resolution.excluded.length ? "Price target not reached" : "Minimum not reached",
    });
    return response.json({ message: resolution.excluded.length ? "Order cancelled because the final price exceeded participant price limits." : "Order cancelled because the minimum was not reached." });
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
  response.json({ message: "Order closed at the reached tier price." });
});

export default router;
