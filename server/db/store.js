import fs from "node:fs";
import path from "node:path";
import seedData from "./seed-data/index.js";

export const COLLECTIONS = [
  "businesses",
  "otp_codes",
  "suppliers",
  "products",
  "group_orders",
  "tiers",
  "participants",
  "supply_requests",
  "supplier_interests",
  "sell_listings",
  "sell_orders",
];

export const dataDirectory =
  process.env.DATA_DIR
  || (process.env.VERCEL ? "/tmp/local-link" : path.resolve("server/data"));

fs.mkdirSync(dataDirectory, { recursive: true });

const cache = new Map();

function filePath(collection) {
  return path.join(dataDirectory, `${collection}.json`);
}

function writeCollection(collection) {
  const rows = cache.get(collection) || [];
  const target = filePath(collection);
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(rows, null, 2));
  fs.renameSync(temporary, target);
}

function readCollection(collection) {
  if (cache.has(collection)) return cache.get(collection);
  const target = filePath(collection);
  if (!fs.existsSync(target)) {
    const rows = structuredClone(seedData[collection] || []);
    cache.set(collection, rows);
    writeCollection(collection);
    return rows;
  }
  const rows = JSON.parse(fs.readFileSync(target, "utf8"));
  if (!Array.isArray(rows)) throw new Error(`${collection}.json must contain a JSON array.`);
  cache.set(collection, rows);
  return rows;
}

function nextId(rows) {
  return rows.reduce((maximum, row) => Math.max(maximum, Number(row.id) || 0), 0) + 1;
}

export function all(collection) {
  return readCollection(collection).map((row) => ({ ...row }));
}

export function where(collection, predicate) {
  return readCollection(collection)
    .filter((row) => predicate(row))
    .map((row) => ({ ...row }));
}

export function first(collection, predicate) {
  const row = readCollection(collection).find((entry) => predicate(entry));
  return row ? { ...row } : null;
}

export function byId(collection, id) {
  return first(collection, (row) => Number(row.id) === Number(id));
}

export function insert(collection, values) {
  const rows = readCollection(collection);
  const row = { id: nextId(rows), ...values };
  rows.push(row);
  writeCollection(collection);
  return { ...row };
}

export function update(collection, predicate, patch) {
  const rows = readCollection(collection);
  const targets = rows.filter((row) => predicate(row));
  targets.forEach((row) => {
    Object.assign(row, typeof patch === "function" ? patch(row) : patch);
  });
  if (targets.length) writeCollection(collection);
  return targets.length;
}

export function updateById(collection, id, patch) {
  return update(collection, (row) => Number(row.id) === Number(id), patch);
}

export function remove(collection, predicate) {
  const rows = readCollection(collection);
  const remaining = rows.filter((row) => !predicate(row));
  cache.set(collection, remaining);
  if (remaining.length !== rows.length) writeCollection(collection);
  return rows.length - remaining.length;
}

export function transaction(callback) {
  const snapshot = new Map();
  for (const collection of COLLECTIONS) {
    snapshot.set(collection, structuredClone(readCollection(collection)));
  }
  try {
    const result = callback();
    for (const collection of COLLECTIONS) writeCollection(collection);
    return result;
  } catch (error) {
    for (const collection of COLLECTIONS) {
      cache.set(collection, snapshot.get(collection));
      writeCollection(collection);
    }
    throw error;
  }
}

export function resetFromSeed() {
  fs.mkdirSync(dataDirectory, { recursive: true });
  for (const collection of COLLECTIONS) {
    cache.set(collection, structuredClone(seedData[collection] || []));
    writeCollection(collection);
  }
}
