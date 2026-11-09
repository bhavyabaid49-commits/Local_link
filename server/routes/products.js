import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requiredFields } from "../middleware/validation.js";
import { createProduct, findProductByNormalized } from "../db/repositories.js";

const router = express.Router();

router.post("/", requireAuth, (request, response) => {
  if (request.business.account_status !== "Verified") return response.status(403).json({ error: "Only verified businesses can create items." });
  const missing = requiredFields(request.body, ["name", "category", "unitLabel"]);
  if (missing.length) return response.status(400).json({ error: "Item name, category, and unit are required." });
  const name = String(request.body.name).trim();
  const category = String(request.body.category).trim();
  const unitLabel = String(request.body.unitLabel).trim();
  if (name.length < 2 || category.length < 2 || unitLabel.length < 1) return response.status(400).json({ error: "Enter a valid item name, category, and unit." });
  const existing = findProductByNormalized({ name, category, unitLabel });
  if (existing) return response.status(409).json({ error: "This item already exists in the catalog.", product: existing });
  const product = createProduct({ name, category, unitLabel });
  response.status(201).json({ product, message: "New item added to the catalog." });
});

export default router;
