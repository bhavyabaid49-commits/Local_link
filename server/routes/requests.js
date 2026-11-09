import express from "express";
import database from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { parsePositiveInteger, requiredFields } from "../middleware/validation.js";

const router = express.Router();

function requestQuery(where = "", params = []) {
  return database
    .prepare(
      `SELECT sr.id, sr.requester_business_id, sr.product_id, sr.requested_units, sr.deadline, sr.notes, sr.status, sr.created_at, p.name AS product_name, p.category, p.unit_label, b.business_name AS requester_name, COUNT(si.id) AS interest_count, COALESCE(SUM(si.available_units), 0) AS supply_offered FROM supply_requests sr JOIN products p ON p.id = sr.product_id JOIN businesses b ON b.id = sr.requester_business_id LEFT JOIN supplier_interests si ON si.request_id = sr.id ${where} GROUP BY sr.id ORDER BY sr.deadline`,
    )
    .all(...params);
}

router.get("/", (_request, response) => {
  response.json({ requests: requestQuery("WHERE sr.status = 'Open'") });
});

router.get("/catalog", (_request, response) => {
  response.json({
    products: database.prepare("SELECT id, name, category, unit_label FROM products ORDER BY name").all(),
    suppliers: database.prepare("SELECT id, name FROM suppliers ORDER BY name").all(),
  });
});

router.get("/:id", (request, response) => {
  const supplyRequest = requestQuery("WHERE sr.id = ?", [request.params.id])[0];
  if (!supplyRequest) return response.status(404).json({ error: "Supply request not found." });
  const interests = database.prepare("SELECT si.id, si.available_units, si.contact_name, si.contact_email, si.note, si.created_at, s.name AS supplier_name FROM supplier_interests si JOIN suppliers s ON s.id = si.supplier_id WHERE si.request_id = ? ORDER BY si.available_units DESC").all(request.params.id);
  response.json({ request: { ...supplyRequest, interests } });
});

router.post("/", requireAuth, (request, response) => {
  if (request.business.account_status !== "Verified") return response.status(403).json({ error: "Only verified businesses can post supply requests." });
  const missing = requiredFields(request.body, ["productId", "requestedUnits", "deadline"]);
  const requestedUnits = parsePositiveInteger(request.body.requestedUnits);
  if (missing.length || !requestedUnits) return response.status(400).json({ error: "Product, requested units, and deadline are required." });
  if (new Date(request.body.deadline) <= new Date()) return response.status(400).json({ error: "Choose a future deadline." });
  const result = database.prepare("INSERT INTO supply_requests (requester_business_id, product_id, requested_units, deadline, notes) VALUES (?, ?, ?, ?, ?)").run(request.business.id, request.body.productId, requestedUnits, new Date(request.body.deadline).toISOString(), String(request.body.notes || "").trim());
  response.status(201).json({ requestId: result.lastInsertRowid, message: "Supply request posted." });
});

router.post("/:id/interests", (request, response) => {
  const missing = requiredFields(request.body, ["supplierId", "availableUnits", "contactName", "contactEmail"]);
  const availableUnits = parsePositiveInteger(request.body.availableUnits);
  if (missing.length || !availableUnits) return response.status(400).json({ error: "Supplier, available units, name, and email are required." });
  const supplyRequest = database.prepare("SELECT id FROM supply_requests WHERE id = ? AND status = 'Open' AND deadline > ?").get(request.params.id, new Date().toISOString());
  if (!supplyRequest) return response.status(400).json({ error: "This supply request is closed or its deadline has passed." });
  try {
    database.prepare("INSERT INTO supplier_interests (request_id, supplier_id, available_units, contact_name, contact_email, note) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(request_id, supplier_id) DO UPDATE SET available_units = excluded.available_units, contact_name = excluded.contact_name, contact_email = excluded.contact_email, note = excluded.note").run(request.params.id, request.body.supplierId, availableUnits, String(request.body.contactName).trim(), String(request.body.contactEmail).trim().toLowerCase(), String(request.body.note || "").trim());
    response.json({ message: "Your supply offer has been sent to the requesting business." });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") return response.status(400).json({ error: "Choose a valid supplier." });
    response.status(500).json({ error: "Could not save your supply offer." });
  }
});

export default router;