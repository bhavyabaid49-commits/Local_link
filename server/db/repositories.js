import {
  all,
  byId,
  first,
  insert,
  transaction,
  update,
  updateById,
  where,
} from "./store.js";

const now = () => new Date().toISOString();
const count = (value) => Number(value || 0);
const byIdMap = (collection) => new Map(all(collection).map((row) => [row.id, row]));
const text = (value) => String(value ?? "").trim().toLowerCase();

function duplicate(message) {
  const error = new Error(message);
  error.code = "DUPLICATE";
  return error;
}

/* Businesses */

export function getBusinessById(id) {
  return byId("businesses", id);
}

export function getBusinessByEmail(email) {
  return first("businesses", (business) => text(business.email) === text(email));
}

export function createBusiness(values) {
  const email = String(values.email || "").trim().toLowerCase();
  const gstin = String(values.gstin || "").trim();
  const existing = first(
    "businesses",
    (business) =>
      text(business.email) === text(email) || String(business.gstin) === gstin,
  );
  if (existing) throw duplicate("That email or GSTIN is already registered.");
  return insert("businesses", {
    ...values,
    email,
    gstin,
    account_status: values.account_status || "Pending",
    role: values.role || "business",
    created_at: values.created_at || now(),
  });
}

export function updateBusiness(id, patch) {
  return updateById("businesses", id, patch);
}

export function listBusinessAccounts() {
  return where("businesses", (business) => business.role === "business")
    .map(({ id, business_name, legal_name, gstin, email, account_status, gst_status, created_at }) => ({
      id,
      business_name,
      legal_name,
      gstin,
      email,
      account_status,
      gst_status,
      created_at,
    }))
    .sort((first, second) => String(second.created_at).localeCompare(String(first.created_at)));
}

export function updateBusinessStatus(id, status) {
  return update(
    "businesses",
    (business) => Number(business.id) === Number(id) && business.role === "business",
    { account_status: status },
  );
}

/* OTP codes */

export function createOtp({ businessId, code, expiresAt }) {
  return insert("otp_codes", {
    business_id: Number(businessId),
    code: String(code),
    expires_at: expiresAt,
    used: 0,
  });
}

export function findValidOtp({ businessId, code, currentTime }) {
  return (
    where(
      "otp_codes",
      (record) =>
        Number(record.business_id) === Number(businessId)
        && String(record.code) === String(code)
        && !record.used
        && String(record.expires_at) > currentTime,
    ).sort((first, second) => Number(second.id) - Number(first.id))[0] || null
  );
}

export function markOtpUsed(id) {
  return updateById("otp_codes", id, { used: 1 });
}

/* Suppliers and products */

export function listSuppliers() {
  return all("suppliers")
    .map(({ id, name }) => ({ id, name }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function getSupplierById(id) {
  return byId("suppliers", id);
}

export function listProducts() {
  return all("products")
    .map(({ id, name, category, unit_label }) => ({ id, name, category, unit_label }))
    .sort(
      (first, second) =>
        first.category.localeCompare(second.category)
        || first.name.localeCompare(second.name),
    );
}

export function listAdminProducts() {
  return all("products")
    .map(({ id, name, category }) => ({ id, name, category }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function findProductByNormalized({ name, category, unitLabel }) {
  return first(
    "products",
    (product) =>
      text(product.name) === text(name)
      && text(product.category) === text(category)
      && text(product.unit_label) === text(unitLabel),
  );
}

export function createProduct({ name, category, unitLabel }) {
  return insert("products", { name, category, unit_label: unitLabel });
}

/* Group orders and tiers */

export function getTiers(orderId) {
  return where("tiers", (tier) => Number(tier.group_order_id) === Number(orderId))
    .sort((first, second) => Number(first.threshold_units) - Number(second.threshold_units))
    .map((tier) => ({ min_units: tier.threshold_units, unit_price: tier.unit_price }));
}

export function getGroupOrderById(id) {
  return byId("group_orders", id);
}

export function findOpenGroupOrder(id, currentTime) {
  return first(
    "group_orders",
    (order) =>
      Number(order.id) === Number(id)
      && order.status === "Open"
      && String(order.deadline) > currentTime,
  );
}

export function listExpiredOpenOrders(currentTime) {
  return where(
    "group_orders",
    (order) => order.status === "Open" && String(order.deadline) <= currentTime,
  );
}

export function listGroupOrders({ category } = {}) {
  const products = byIdMap("products");
  const suppliers = byIdMap("suppliers");
  const participants = all("participants");
  return all("group_orders")
    .filter((order) => !category || products.get(order.product_id)?.category === category)
    .map((order) => {
      const product = products.get(order.product_id) || {};
      const supplier = suppliers.get(order.supplier_id) || {};
      const orderParticipants = participants.filter(
        (participant) => Number(participant.group_order_id) === Number(order.id),
      );
      return {
        ...order,
        product_name: product.name,
        category: product.category,
        unit_label: product.unit_label,
        supplier_name: supplier.name,
        units_committed: orderParticipants.reduce(
          (total, participant) => total + count(participant.quantity),
          0,
        ),
        business_count: new Set(orderParticipants.map((participant) => participant.business_id)).size,
      };
    })
    .sort((first, second) => String(first.deadline).localeCompare(String(second.deadline)));
}

export function getGroupOrderJoined(id) {
  return listGroupOrders().find((order) => Number(order.id) === Number(id)) || null;
}

export function getParticipants(orderId) {
  return where("participants", (participant) => Number(participant.group_order_id) === Number(orderId));
}

export function listOrderParticipants(orderId) {
  const businesses = byIdMap("businesses");
  return where("participants", (participant) => Number(participant.group_order_id) === Number(orderId))
    .sort((first, second) => Number(first.id) - Number(second.id))
    .map((participant) => {
      const name = businesses.get(participant.business_id)?.business_name || "";
      return {
        business_name: `${name.slice(0, 3)}***`,
        quantity: participant.quantity,
      };
    });
}

export function totalUnitsForOrder(orderId) {
  return where("participants", (participant) => Number(participant.group_order_id) === Number(orderId))
    .reduce((total, participant) => total + count(participant.quantity), 0);
}

export function activeUnitsForOrder(orderId) {
  return where(
    "participants",
    (participant) =>
      Number(participant.group_order_id) === Number(orderId)
      && participant.participant_status === "Active",
  ).reduce((total, participant) => total + count(participant.quantity), 0);
}

export function upsertParticipant({ orderId, businessId, quantity, maxUnitPrice }) {
  const existing = first(
    "participants",
    (participant) =>
      Number(participant.group_order_id) === Number(orderId)
      && Number(participant.business_id) === Number(businessId),
  );
  if (existing) {
    updateById("participants", existing.id, {
      quantity,
      max_unit_price: maxUnitPrice,
      participant_status: "Active",
      cancel_reason: null,
    });
    return byId("participants", existing.id);
  }
  return insert("participants", {
    group_order_id: Number(orderId),
    business_id: Number(businessId),
    quantity,
    max_unit_price: maxUnitPrice,
    participant_status: "Active",
    cancel_reason: null,
    price_paid: null,
    joined_at: now(),
  });
}

export function updateParticipant(id, patch) {
  return updateById("participants", id, patch);
}

export function updateParticipantsForOrder(orderId, patch) {
  return update(
    "participants",
    (participant) => Number(participant.group_order_id) === Number(orderId),
    patch,
  );
}

export function updateGroupOrder(id, patch) {
  return updateById("group_orders", id, patch);
}

export function createGroupOrder({ productId, supplierId, minOrderTotal, packSize, basePrice, deadline, tiers }) {
  return transaction(() => {
    const order = insert("group_orders", {
      product_id: Number(productId),
      supplier_id: Number(supplierId),
      minimum_units: Number(minOrderTotal),
      pack_size: Number(packSize),
      min_order_total: Number(minOrderTotal),
      base_price: Number(basePrice),
      deadline,
      status: "Open",
      final_price: null,
      created_at: now(),
    });
    tiers.forEach((tier) =>
      insert("tiers", {
        group_order_id: order.id,
        threshold_units: Number(tier.min_units),
        unit_price: Number(tier.unit_price),
      }),
    );
    return order;
  });
}

export function getBusinessOrderSummaries(businessId) {
  const orders = byIdMap("group_orders");
  const products = byIdMap("products");
  const participants = all("participants");
  return where("participants", (participant) => Number(participant.business_id) === Number(businessId))
    .map((participant) => {
      const order = orders.get(participant.group_order_id);
      if (!order) return null;
      const product = products.get(order.product_id) || {};
      const unitsCommitted = participants
        .filter(
          (entry) =>
            Number(entry.group_order_id) === Number(order.id)
            && entry.participant_status === "Active",
        )
        .reduce((total, entry) => total + count(entry.quantity), 0);
      return {
        id: order.id,
        product_name: product.name,
        status: participant.participant_status === "Cancelled" ? "Cancelled" : order.status,
        cancel_reason: participant.cancel_reason,
        deadline: order.deadline,
        pack_size: order.pack_size,
        min_order_total: order.min_order_total,
        base_price: order.base_price,
        final_price: order.final_price,
        quantity: participant.quantity,
        units_committed: unitsCommitted,
      };
    })
    .filter(Boolean)
    .sort((first, second) => String(second.deadline).localeCompare(String(first.deadline)));
}

/* Sell listings and orders */

export function listSellListings({ status } = {}) {
  const products = byIdMap("products");
  const businesses = byIdMap("businesses");
  return all("sell_listings")
    .filter((listing) => !status || listing.status === status)
    .map((listing) => {
      const product = products.get(listing.product_id) || {};
      return {
        ...listing,
        product_name: product.name,
        category: product.category,
        unit_label: product.unit_label,
        seller_name: businesses.get(listing.seller_business_id)?.business_name,
      };
    })
    .sort((first, second) => String(second.created_at).localeCompare(String(first.created_at)));
}

export function getSellListingJoined(id) {
  return listSellListings().find((listing) => Number(listing.id) === Number(id)) || null;
}

export function findOpenSellListing(id, currentTime) {
  const listing = byId("sell_listings", id);
  if (!listing || listing.status !== "Open") return null;
  if (listing.deadline && String(listing.deadline) <= currentTime) return null;
  return listing;
}

export function createSellListing(values) {
  return insert("sell_listings", {
    ...values,
    status: "Open",
    created_at: now(),
  });
}

export function placeSellOrder({ listing, buyerId, quantity, unitPrice }) {
  return transaction(() => {
    const order = insert("sell_orders", {
      listing_id: Number(listing.id),
      buyer_business_id: Number(buyerId),
      quantity: Number(quantity),
      unit_price: unitPrice,
      status: "Pending",
      created_at: now(),
    });
    const remaining = count(listing.available_units) - Number(quantity);
    updateById("sell_listings", listing.id, {
      available_units: remaining,
      status: remaining === 0 ? "Closed" : listing.status,
    });
    update(
      "sell_orders",
      (entry) => Number(entry.listing_id) === Number(listing.id),
      { unit_price: unitPrice },
    );
    return order;
  });
}

export function closeSellListing(id, sellerId) {
  return update(
    "sell_listings",
    (listing) =>
      Number(listing.id) === Number(id)
      && Number(listing.seller_business_id) === Number(sellerId)
      && listing.status === "Open",
    { status: "Closed" },
  );
}

export function listSellListingsBySeller(sellerId) {
  const products = byIdMap("products");
  return where("sell_listings", (listing) => Number(listing.seller_business_id) === Number(sellerId))
    .map((listing) => {
      const product = products.get(listing.product_id) || {};
      return {
        id: listing.id,
        product_id: listing.product_id,
        available_units: listing.available_units,
        price_per_unit: listing.price_per_unit,
        minimum_order_units: listing.minimum_order_units,
        deadline: listing.deadline,
        status: listing.status,
        created_at: listing.created_at,
        product_name: product.name,
        unit_label: product.unit_label,
      };
    })
    .sort((first, second) => String(second.created_at).localeCompare(String(first.created_at)));
}

export function listPurchasesByBuyer(buyerId) {
  const listings = byIdMap("sell_listings");
  const products = byIdMap("products");
  const businesses = byIdMap("businesses");
  return where("sell_orders", (order) => Number(order.buyer_business_id) === Number(buyerId))
    .map((order) => {
      const listing = listings.get(order.listing_id) || {};
      const product = products.get(listing.product_id) || {};
      return {
        id: order.id,
        quantity: order.quantity,
        unit_price: order.unit_price,
        status: order.status,
        created_at: order.created_at,
        product_name: product.name,
        unit_label: product.unit_label,
        seller_name: businesses.get(listing.seller_business_id)?.business_name,
        starting_price: listing.base_price ?? listing.price_per_unit,
        initial_units: listing.initial_units,
        available_units: listing.available_units,
        listing_status: listing.status,
      };
    })
    .sort((first, second) => String(second.created_at).localeCompare(String(first.created_at)));
}

/* Supply requests */

export function listSupplyRequests({ status } = {}) {
  const products = byIdMap("products");
  const businesses = byIdMap("businesses");
  const interests = all("supplier_interests");
  return all("supply_requests")
    .filter((request) => !status || request.status === status)
    .map((request) => {
      const product = products.get(request.product_id) || {};
      const requester = businesses.get(request.requester_business_id) || {};
      const requestInterests = interests.filter(
        (interest) => Number(interest.request_id) === Number(request.id),
      );
      return {
        ...request,
        product_name: product.name,
        category: product.category,
        unit_label: product.unit_label,
        requester_name: requester.business_name,
        interest_count: requestInterests.length,
        supply_offered: requestInterests.reduce(
          (total, interest) => total + count(interest.available_units),
          0,
        ),
      };
    })
    .sort((first, second) => String(first.deadline).localeCompare(String(second.deadline)));
}

export function getSupplyRequestJoined(id) {
  return listSupplyRequests().find((request) => Number(request.id) === Number(id)) || null;
}

export function findOpenSupplyRequest(id, currentTime) {
  return first(
    "supply_requests",
    (request) =>
      Number(request.id) === Number(id)
      && request.status === "Open"
      && String(request.deadline) > currentTime,
  );
}

export function createSupplyRequest(values) {
  return insert("supply_requests", {
    ...values,
    status: "Open",
    created_at: now(),
  });
}

export function listSupplierInterests(requestId) {
  const suppliers = byIdMap("suppliers");
  return where(
    "supplier_interests",
    (interest) => Number(interest.request_id) === Number(requestId),
  )
    .map((interest) => ({
      id: interest.id,
      available_units: interest.available_units,
      contact_name: interest.contact_name,
      contact_email: interest.contact_email,
      note: interest.note,
      created_at: interest.created_at,
      supplier_name: suppliers.get(interest.supplier_id)?.name,
    }))
    .sort((first, second) => count(second.available_units) - count(first.available_units));
}

export function upsertSupplierInterest({ requestId, supplierId, availableUnits, contactName, contactEmail, note }) {
  if (!getSupplierById(supplierId)) {
    const error = new Error("Choose a valid supplier.");
    error.code = "INVALID_SUPPLIER";
    throw error;
  }
  const existing = first(
    "supplier_interests",
    (interest) =>
      Number(interest.request_id) === Number(requestId)
      && Number(interest.supplier_id) === Number(supplierId),
  );
  if (existing) {
    updateById("supplier_interests", existing.id, {
      available_units: availableUnits,
      contact_name: contactName,
      contact_email: contactEmail,
      note,
    });
    return byId("supplier_interests", existing.id);
  }
  return insert("supplier_interests", {
    request_id: Number(requestId),
    supplier_id: Number(supplierId),
    available_units: availableUnits,
    contact_name: contactName,
    contact_email: contactEmail,
    note,
    created_at: now(),
  });
}
