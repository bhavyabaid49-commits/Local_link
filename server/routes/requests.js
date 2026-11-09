import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { parsePositiveInteger, requiredFields } from "../middleware/validation.js";
import {
  createSupplyRequest,
  findOpenSupplyRequest,
  getSupplyRequestJoined,
  listSupplierInterests,
  listSuppliers,
  listSupplyRequests,
  listProducts,
  upsertSupplierInterest,
} from "../db/repositories.js";

const router = express.Router();

router.get("/", (_request, response) => {
  response.json({ requests: listSupplyRequests({ status: "Open" }) });
});

router.get("/catalog", (_request, response) => {
  response.json({
    products: listProducts(),
    suppliers: listSuppliers(),
  });
});

router.get("/:id", (request, response) => {
  const supplyRequest = getSupplyRequestJoined(request.params.id);
  if (!supplyRequest) return response.status(404).json({ error: "Supply request not found." });
  const interests = listSupplierInterests(request.params.id);
  response.json({ request: { ...supplyRequest, interests } });
});

router.post("/", requireAuth, (request, response) => {
  if (request.business.account_status !== "Verified") return response.status(403).json({ error: "Only verified businesses can post supply requests." });
  const missing = requiredFields(request.body, ["productId", "requestedUnits", "deadline"]);
  const requestedUnits = parsePositiveInteger(request.body.requestedUnits);
  if (missing.length || !requestedUnits) return response.status(400).json({ error: "Product, requested units, and deadline are required." });
  if (new Date(request.body.deadline) <= new Date()) return response.status(400).json({ error: "Choose a future deadline." });
  const supplyRequest = createSupplyRequest({
    requester_business_id: request.business.id,
    product_id: Number(request.body.productId),
    requested_units: requestedUnits,
    deadline: new Date(request.body.deadline).toISOString(),
    notes: String(request.body.notes || "").trim(),
  });
  response.status(201).json({ requestId: supplyRequest.id, message: "Supply request posted." });
});

router.post("/:id/interests", (request, response) => {
  const missing = requiredFields(request.body, ["supplierId", "availableUnits", "contactName", "contactEmail"]);
  const availableUnits = parsePositiveInteger(request.body.availableUnits);
  if (missing.length || !availableUnits) return response.status(400).json({ error: "Supplier, available units, name, and email are required." });
  const supplyRequest = findOpenSupplyRequest(request.params.id, new Date().toISOString());
  if (!supplyRequest) return response.status(400).json({ error: "This supply request is closed or its deadline has passed." });
  try {
    upsertSupplierInterest({
      requestId: request.params.id,
      supplierId: request.body.supplierId,
      availableUnits,
      contactName: String(request.body.contactName).trim(),
      contactEmail: String(request.body.contactEmail).trim().toLowerCase(),
      note: String(request.body.note || "").trim(),
    });
    response.json({ message: "Your supply offer has been sent to the requesting business." });
  } catch (error) {
    if (error.code === "INVALID_SUPPLIER") return response.status(400).json({ error: "Choose a valid supplier." });
    response.status(500).json({ error: "Could not save your supply offer." });
  }
});

export default router;
