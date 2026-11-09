import express from "express";
import database from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { requiredFields } from "../middleware/validation.js";

const router = express.Router();

router.post("/", requireAuth, (request, response) => {
  if (request.business.account_status !== "Verified") return response.status(403).json({ error: "Only verified businesses can create items." });
  const missing = requiredFields(request.body, ["name", "category", "unitLabel"]);
  if (missing.length) return response.status(400).json({ error: "Item name, category, and unit are required." });
  const name = String(request.body.name).trim();
  const category = String(request.body.category).trim();
  const unitLabel = String(request.body.unitLabel).trim();
  if (name.length < 2 || category.length < 2 || unitLabel.length < 1) return response.status(400).json({ error: "Enter a valid item name, category, and unit." });
  const existing = database.prepare("SELECT id, name, category, unit_label FROM products WHERE lower(trim(name)) = lower(trim(?)) AND lower(trim(category)) = lower(trim(?)) AND lower(trim(unit_label)) = lower(trim(?))").get(name, category, unitLabel);
  if (existing) return response.status(409).json({ error: "This item already exists in the catalog.", product: existing });
  const result = database.prepare("INSERT INTO products (name, category, unit_label) VALUES (?, ?, ?)").run(name, category, unitLabel);
  response.status(201).json({ product: { id: result.lastInsertRowid, name, category, unit_label: unitLabel }, message: "New item added to the catalog." });
});

export default router;