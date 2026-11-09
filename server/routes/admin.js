import express from "express";
import database from "../db/database.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  parsePositiveInteger,
  requiredFields,
} from "../middleware/validation.js";
import { validatePricingSettings } from "../services/pricing.js";
import { resolveFinalPricing } from "./orders.js";

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/catalog", (_request, response) =>
  response.json({
    products: database
      .prepare("SELECT id, name, category FROM products ORDER BY name")
      .all(),
    suppliers: database
      .prepare("SELECT id, name FROM suppliers ORDER BY name")
      .all(),
  }),
);
router.get("/businesses", (_request, response) =>
  response.json({
    businesses: database
      .prepare(
        "SELECT id, business_name, legal_name, gstin, email, account_status, gst_status, created_at FROM businesses WHERE role = 'business' ORDER BY created_at DESC",
      )
      .all(),
  }),
);
router.patch("/businesses/:id", (request, response) => {
  if (!["Verified", "Rejected"].includes(request.body.status))
    return response
      .status(400)
      .json({ error: "Status must be Verified or Rejected." });
  database
    .prepare(
      "UPDATE businesses SET account_status = ? WHERE id = ? AND role = 'business'",
    )
    .run(request.body.status, request.params.id);
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
  const create = database.transaction(() => {
    const result = database
      .prepare(
        "INSERT INTO group_orders (product_id, supplier_id, minimum_units, pack_size, min_order_total, base_price, deadline, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')",
      )
      .run(
        request.body.productId,
        request.body.supplierId,
        minimumUnits,
        packSize,
        minimumUnits,
        basePrice,
        request.body.deadline,
      );
    const addTier = database.prepare(
      "INSERT INTO tiers (group_order_id, threshold_units, unit_price) VALUES (?, ?, ?)",
    );
    request.body.tiers.forEach((tier) =>
      addTier.run(
        result.lastInsertRowid,
        tier.min_units,
        tier.unit_price,
      ),
    );
    return result.lastInsertRowid;
  });
  response.status(201).json({ orderId: create() });
});
router.patch("/orders/:id/close", (request, response) => {
  const order = database.prepare("SELECT * FROM group_orders WHERE id = ? AND status = 'Open'").get(request.params.id);
  if (!order) return response.status(404).json({ error: "Open order not found." });
  const participants = database.prepare("SELECT * FROM participants WHERE group_order_id = ?").all(order.id);
  const resolution = resolveFinalPricing(order, participants);
  if (resolution.cancelled) {
    database.prepare("UPDATE group_orders SET status = 'Cancelled', final_price = NULL WHERE id = ?").run(order.id);
    database.prepare("UPDATE participants SET price_paid = NULL, participant_status = 'Cancelled', cancel_reason = ? WHERE group_order_id = ?").run(resolution.excluded.length ? "Price target not reached" : "Minimum not reached", order.id);
    return response.json({ message: resolution.excluded.length ? "Order cancelled because the final price exceeded participant price limits." : "Order cancelled because the minimum was not reached." });
  }
  database
    .prepare(
      "UPDATE group_orders SET status = 'Closed', final_price = ? WHERE id = ?",
    )
    .run(resolution.pricing.current_unit_price, request.params.id);
  const chargeParticipant = database.prepare("UPDATE participants SET price_paid = ?, participant_status = 'Active', cancel_reason = NULL WHERE id = ?");
  const cancelParticipant = database.prepare("UPDATE participants SET price_paid = NULL, participant_status = 'Cancelled', cancel_reason = 'Price target not reached' WHERE id = ?");
  resolution.eligible.forEach((participant) => chargeParticipant.run(resolution.pricing.current_unit_price, participant.id));
  resolution.excluded.forEach((participant) => cancelParticipant.run(participant.id));
  response.json({ message: "Order closed at the reached tier price." });
});

export default router;
