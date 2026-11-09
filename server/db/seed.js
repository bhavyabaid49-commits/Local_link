import bcrypt from "bcryptjs";
import database from "./database.js";

database.exec(
  "DELETE FROM sell_orders; DELETE FROM sell_listings; DELETE FROM supplier_interests; DELETE FROM supply_requests; DELETE FROM participants; DELETE FROM tiers; DELETE FROM group_orders; DELETE FROM products; DELETE FROM suppliers; DELETE FROM otp_codes; DELETE FROM businesses;",
);

const passwordHash = bcrypt.hashSync("LocalLink123!", 10);
const addBusiness = database.prepare(
  "INSERT INTO businesses (business_name, legal_name, trade_name, gstin, owner_name, email, phone, password_hash, state, gst_status, account_status, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
const businessIds = [
  [
    "MTR Local Kitchen",
    "Koramangala Kitchen Foods LLP",
    "MTR Local Kitchen",
    "29ABCDE1234F1ZW",
    "Ananya Rao",
    "koramangala@locallink.demo",
    "9876543210",
    "Karnataka",
  ],
  [
    "Indiranagar Table",
    "Indiranagar Table Private Limited",
    "Indiranagar Table",
    "29AACCC1234G1Z4",
    "Rohan Mehta",
    "indiranagar@locallink.demo",
    "9876543211",
    "Karnataka",
  ],
  [
    "HSR Bowl House",
    "HSR Bowl House LLP",
    "HSR Bowl House",
    "29AAACH1234H1Z3",
    "Nisha Kumar",
    "hsr@locallink.demo",
    "9876543212",
    "Karnataka",
  ],
  [
    "Jayanagar Pantry",
    "Jayanagar Pantry Private Limited",
    "Jayanagar Pantry",
    "29AAACJ1234J1Z2",
    "Vikram Shah",
    "jayanagar@locallink.demo",
    "9876543213",
    "Karnataka",
  ],
].map(
  (business) =>
    addBusiness.run(
      ...business.slice(0, 7),
      passwordHash,
      business[7],
      "Active",
      "Verified",
      "business",
    ).lastInsertRowid,
);
addBusiness.run(
  "Local Link Admin",
  "Local Link Admin",
  "Local Link Admin",
  "29AAAAL1234K1Z1",
  "Admin User",
  "admin@locallink.demo",
  "9876543299",
  passwordHash,
  "Karnataka",
  "Active",
  "Verified",
  "admin",
);

const supplierA = database
  .prepare("INSERT INTO suppliers (name) VALUES (?)")
  .run("Bengaluru Food Packaging Co.").lastInsertRowid;
const supplierB = database
  .prepare("INSERT INTO suppliers (name) VALUES (?)")
  .run("South India Wholesale").lastInsertRowid;
const addProduct = database.prepare(
  "INSERT INTO products (name, category, unit_label) VALUES (?, ?, ?)",
);
const products = {
  containers: addProduct.run("500ml PET containers", "Takeaway & packaging", "pack of 100")
    .lastInsertRowid,
  bags: addProduct.run(
    "Kraft paper delivery bags",
    "Takeaway & packaging",
    "bundle of 100",
  ).lastInsertRowid,
  oil: addProduct.run("Sunflower oil (15 kg tin)", "Groceries & raw materials", "tin")
    .lastInsertRowid,
  rice: addProduct.run("Sona masoori rice (25 kg)", "Groceries & raw materials", "bag")
    .lastInsertRowid,
  napkins: addProduct.run("Tissue napkins", "Tableware & serving", "carton of 1,000")
    .lastInsertRowid,
};

const catalogItems = [
  ["Kitchen equipment", "Gas stove (2 burner)", "piece"], ["Kitchen equipment", "Commercial gas stove", "piece"], ["Kitchen equipment", "Pressure cooker", "piece"], ["Kitchen equipment", "Kadai", "piece"], ["Kitchen equipment", "Frying pan", "piece"], ["Kitchen equipment", "Saucepan", "piece"], ["Kitchen equipment", "Cooking pot", "piece"], ["Kitchen equipment", "Chef knife", "piece"], ["Kitchen equipment", "Vegetable knife", "piece"], ["Kitchen equipment", "Chopping board", "piece"], ["Kitchen equipment", "Ladle", "piece"], ["Kitchen equipment", "Spatula", "piece"], ["Kitchen equipment", "Strainer", "piece"], ["Kitchen equipment", "Mixing bowl", "piece"], ["Kitchen equipment", "Digital weighing scale", "piece"], ["Kitchen equipment", "Mixer grinder", "piece"],
  ["Groceries & raw materials", "Rice", "kg"], ["Groceries & raw materials", "Wheat flour (atta)", "kg"], ["Groceries & raw materials", "Maida", "kg"], ["Groceries & raw materials", "Rava", "kg"], ["Groceries & raw materials", "Toor dal", "kg"], ["Groceries & raw materials", "Chana dal", "kg"], ["Groceries & raw materials", "Cooking oil", "litre"], ["Groceries & raw materials", "Ghee", "litre"], ["Groceries & raw materials", "Sugar", "kg"], ["Groceries & raw materials", "Salt", "kg"], ["Groceries & raw materials", "Turmeric powder", "kg"], ["Groceries & raw materials", "Chilli powder", "kg"], ["Groceries & raw materials", "Coriander powder", "kg"], ["Groceries & raw materials", "Garam masala", "kg"], ["Groceries & raw materials", "Cumin seeds", "kg"], ["Groceries & raw materials", "Onion", "kg"], ["Groceries & raw materials", "Tomato", "kg"], ["Groceries & raw materials", "Potato", "kg"], ["Groceries & raw materials", "Ginger", "kg"], ["Groceries & raw materials", "Garlic", "kg"], ["Groceries & raw materials", "Green chilli", "kg"], ["Groceries & raw materials", "Milk", "litre"], ["Groceries & raw materials", "Curd", "kg"], ["Groceries & raw materials", "Paneer", "kg"], ["Groceries & raw materials", "Eggs", "piece"],
  ["Tableware & serving", "Stainless steel dinner plate", "piece"], ["Tableware & serving", "Stainless steel bowl", "piece"], ["Tableware & serving", "Stainless steel tumbler", "piece"], ["Tableware & serving", "Water glass", "piece"], ["Tableware & serving", "Tea cup", "piece"], ["Tableware & serving", "Coffee cup", "piece"], ["Tableware & serving", "Dinner spoon", "piece"], ["Tableware & serving", "Fork", "piece"], ["Tableware & serving", "Table knife", "piece"], ["Tableware & serving", "Serving spoon", "piece"], ["Tableware & serving", "Serving tray", "piece"], ["Tableware & serving", "Water jug", "piece"], ["Tableware & serving", "Tissue paper", "pack"], ["Tableware & serving", "Toothpicks", "pack"], ["Tableware & serving", "Sauce bottle", "piece"], ["Tableware & serving", "Napkin holder", "piece"],
  ["Cleaning & housekeeping", "Dishwashing liquid", "litre"], ["Cleaning & housekeeping", "Floor cleaner", "litre"], ["Cleaning & housekeeping", "Toilet cleaner", "litre"], ["Cleaning & housekeeping", "Handwash liquid", "litre"], ["Cleaning & housekeeping", "Surface disinfectant", "litre"], ["Cleaning & housekeeping", "Glass cleaner", "500 ml"], ["Cleaning & housekeeping", "Broom", "piece"], ["Cleaning & housekeeping", "Mop", "piece"], ["Cleaning & housekeeping", "Bucket", "piece"], ["Cleaning & housekeeping", "Dustpan", "piece"], ["Cleaning & housekeeping", "Scrub pad", "piece"], ["Cleaning & housekeeping", "Cleaning cloth", "piece"], ["Cleaning & housekeeping", "Garbage bags", "roll"], ["Cleaning & housekeeping", "Cleaning gloves", "pair"], ["Cleaning & housekeeping", "Toilet brush", "piece"], ["Cleaning & housekeeping", "Sponge", "piece"],
  ["Takeaway & packaging", "Food parcel container", "piece"], ["Takeaway & packaging", "Aluminium foil container", "piece"], ["Takeaway & packaging", "Paper cup", "piece"], ["Takeaway & packaging", "Disposable spoon", "piece"], ["Takeaway & packaging", "Paper carry bag", "piece"], ["Takeaway & packaging", "Parcel bag", "piece"], ["Takeaway & packaging", "Aluminium foil roll", "roll"], ["Takeaway & packaging", "Cling film roll", "roll"], ["Takeaway & packaging", "Tissue packet", "pack"], ["Takeaway & packaging", "Food packing tape", "roll"],
  ["Storage & food safety", "Airtight container", "piece"], ["Storage & food safety", "Food storage box", "piece"], ["Storage & food safety", "Ingredient storage bin", "piece"], ["Storage & food safety", "Food-grade gloves", "box"], ["Storage & food safety", "Hairnets", "pack"], ["Storage & food safety", "Chef cap", "piece"], ["Storage & food safety", "Apron", "piece"], ["Storage & food safety", "Digital thermometer", "piece"], ["Storage & food safety", "Food labels", "roll"], ["Storage & food safety", "First-aid kit", "kit"],
  ["Office & billing", "Thermal paper roll", "roll"], ["Office & billing", "Order book", "book"], ["Office & billing", "Pen", "piece"], ["Office & billing", "Marker", "piece"], ["Office & billing", "Calculator", "piece"],
];
catalogItems.forEach(([category, name, unit]) => addProduct.run(name, category, unit));

const addOrder = database.prepare(
  "INSERT INTO group_orders (product_id, supplier_id, minimum_units, pack_size, min_order_total, base_price, deadline, status, final_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
const addTier = database.prepare(
  "INSERT INTO tiers (group_order_id, threshold_units, unit_price) VALUES (?, ?, ?)",
);
const addParticipant = database.prepare(
  "INSERT INTO participants (group_order_id, business_id, quantity, price_paid) VALUES (?, ?, ?, ?)",
);
const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
const past = (days) => new Date(Date.now() - days * 86400000).toISOString();
const order = (
  product,
  supplier,
  packSize,
  minOrderTotal,
  basePrice,
  deadline,
  status,
  finalPrice,
  tiers,
  participants = [],
) => {
  const id = addOrder.run(
    product,
    supplier,
    minOrderTotal,
    packSize,
    minOrderTotal,
    basePrice,
    deadline,
    status,
    finalPrice,
  ).lastInsertRowid;
  tiers.forEach(([threshold, price]) => addTier.run(id, threshold, price));
  participants.forEach(([businessId, quantity, price]) =>
    addParticipant.run(id, businessId, quantity, price),
  );
  return id;
};
order(
  products.containers,
  supplierA,
  100,
  300,
  10,
  future(5),
  "Open",
  null,
  [
    [300, 9.5],
    [500, 9],
    [1000, 8.5],
  ],
  [
    [businessIds[0], 200, null],
    [businessIds[1], 150, null],
  ],
);
order(
  products.bags,
  supplierA,
  100,
  300,
  12,
  future(2),
  "Open",
  null,
  [
    [300, 11.4],
    [500, 10.8],
    [1000, 10.2],
  ],
  [
    [businessIds[2], 400, null],
    [businessIds[3], 100, null],
  ],
);
order(
  products.oil,
  supplierB,
  1,
  20,
  2100,
  future(8),
  "Open",
  null,
  [
    [20, 2040],
    [40, 1932],
    [60, 1785],
  ],
  [
    [businessIds[0], 25, null],
    [businessIds[2], 4, null],
  ],
);
order(
  products.rice,
  supplierB,
  1,
  20,
  1450,
  future(1),
  "Open",
  null,
  [
    [20, 1406.5],
    [30, 1334],
    [60, 1232.5],
  ],
  [
    [businessIds[1], 28, null],
    [businessIds[3], 1, null],
  ],
);
order(
  products.napkins,
  supplierA,
  100,
  300,
  8,
  past(1),
  "Closed",
  6.8,
  [
    [300, 7.6],
    [500, 7.2],
    [1000, 6.8],
  ],
  [
    [businessIds[0], 500, 6.8],
    [businessIds[1], 500, 6.8],
    [businessIds[2], 100, 6.8],
  ],
);
order(
  products.containers,
  supplierA,
  100,
  300,
  10,
  past(8),
  "Closed",
  8.5,
  [
    [300, 9.5],
    [500, 9],
    [1000, 8.5],
  ],
  [
    [businessIds[3], 1000, 8.5],
    [businessIds[0], 100, 8.5],
  ],
);

console.log(
  "Seeded Local Link database. Test business: koramangala@locallink.demo / LocalLink123!",
);
