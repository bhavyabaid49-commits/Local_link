import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dataDirectory = path.resolve("server/data");
fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(path.join(dataDirectory, "local-link.db"));
database.pragma("foreign_keys = ON");
database.pragma("journal_mode = WAL");

database.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    trade_name TEXT NOT NULL,
    gstin TEXT NOT NULL UNIQUE,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    state TEXT NOT NULL,
    gst_status TEXT NOT NULL,
    account_status TEXT NOT NULL DEFAULT 'Pending',
    role TEXT NOT NULL DEFAULT 'business',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_label TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS group_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    minimum_units INTEGER NOT NULL,
    pack_size INTEGER NOT NULL DEFAULT 1,
    min_order_total INTEGER NOT NULL DEFAULT 1,
    base_price REAL,
    deadline TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    final_price REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );
  CREATE TABLE IF NOT EXISTS tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_order_id INTEGER NOT NULL,
    threshold_units INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    FOREIGN KEY (group_order_id) REFERENCES group_orders(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_order_id INTEGER NOT NULL,
    business_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    max_unit_price REAL,
    participant_status TEXT NOT NULL DEFAULT 'Active',
    cancel_reason TEXT,
    price_paid REAL,
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_order_id, business_id),
    FOREIGN KEY (group_order_id) REFERENCES group_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS supply_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_business_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    requested_units INTEGER NOT NULL,
    deadline TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS supplier_interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    available_units INTEGER NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(request_id, supplier_id),
    FOREIGN KEY (request_id) REFERENCES supply_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS sell_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_business_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    available_units INTEGER NOT NULL,
    initial_units INTEGER NOT NULL DEFAULT 0,
    price_per_unit REAL NOT NULL,
    base_price REAL,
    minimum_order_units INTEGER NOT NULL DEFAULT 1,
    deadline TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS sell_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    buyer_business_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES sell_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
`);

const sellListingColumns = database
  .prepare("PRAGMA table_info(sell_listings)")
  .all()
  .map((column) => column.name);
if (!sellListingColumns.includes("initial_units")) database.exec("ALTER TABLE sell_listings ADD COLUMN initial_units INTEGER NOT NULL DEFAULT 0");
if (!sellListingColumns.includes("base_price")) database.exec("ALTER TABLE sell_listings ADD COLUMN base_price REAL");
database.exec("UPDATE sell_listings SET initial_units = available_units WHERE initial_units = 0");
database.exec("UPDATE sell_listings SET base_price = price_per_unit WHERE base_price IS NULL");

const participantColumns = database
  .prepare("PRAGMA table_info(participants)")
  .all()
  .map((column) => column.name);
if (!participantColumns.includes("max_unit_price")) database.exec("ALTER TABLE participants ADD COLUMN max_unit_price REAL");
if (!participantColumns.includes("participant_status")) database.exec("ALTER TABLE participants ADD COLUMN participant_status TEXT NOT NULL DEFAULT 'Active'");
if (!participantColumns.includes("cancel_reason")) database.exec("ALTER TABLE participants ADD COLUMN cancel_reason TEXT");

const groupOrderColumns = database
  .prepare("PRAGMA table_info(group_orders)")
  .all()
  .map((column) => column.name);
if (!groupOrderColumns.includes("pack_size")) database.exec("ALTER TABLE group_orders ADD COLUMN pack_size INTEGER NOT NULL DEFAULT 1");
if (!groupOrderColumns.includes("min_order_total")) database.exec("ALTER TABLE group_orders ADD COLUMN min_order_total INTEGER NOT NULL DEFAULT 1");
if (!groupOrderColumns.includes("base_price")) database.exec("ALTER TABLE group_orders ADD COLUMN base_price REAL");
database.exec("UPDATE group_orders SET min_order_total = minimum_units WHERE min_order_total = 1 AND minimum_units != 1");

export default database;
