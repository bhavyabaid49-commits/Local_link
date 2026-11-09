import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "local-link-store-"));
process.env.DATA_DIR = directory;

const { all, byId, insert, resetFromSeed, updateById } = await import("./store.js");

try {
  resetFromSeed();
  assert.equal(all("businesses").length, 5);
  assert.equal(all("products").length, 103);

  const product = insert("products", {
    name: "Test item",
    category: "Test category",
    unit_label: "piece",
  });
  assert.equal(byId("products", product.id).name, "Test item");

  updateById("products", product.id, { name: "Updated item" });
  assert.equal(byId("products", product.id).name, "Updated item");
  assert.ok(fs.existsSync(path.join(directory, "products.json")));

  console.log("JSON store tests passed.");
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
