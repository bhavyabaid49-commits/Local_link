import businesses from "./businesses.json" with { type: "json" };
import groupOrders from "./group_orders.json" with { type: "json" };
import otpCodes from "./otp_codes.json" with { type: "json" };
import participants from "./participants.json" with { type: "json" };
import products from "./products.json" with { type: "json" };
import sellListings from "./sell_listings.json" with { type: "json" };
import sellOrders from "./sell_orders.json" with { type: "json" };
import supplierInterests from "./supplier_interests.json" with { type: "json" };
import suppliers from "./suppliers.json" with { type: "json" };
import supplyRequests from "./supply_requests.json" with { type: "json" };
import tiers from "./tiers.json" with { type: "json" };

export default {
  businesses,
  otp_codes: otpCodes,
  suppliers,
  products,
  group_orders: groupOrders,
  tiers,
  participants,
  supply_requests: supplyRequests,
  supplier_interests: supplierInterests,
  sell_listings: sellListings,
  sell_orders: sellOrders,
};
