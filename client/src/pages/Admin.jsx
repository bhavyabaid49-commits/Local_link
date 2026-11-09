import { useEffect, useState } from "react";
import { apiRequest } from "../api";

export default function Admin() {
  const [businesses, setBusinesses] = useState([]);
  const [catalog, setCatalog] = useState({ products: [], suppliers: [] });
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    productId: "",
    supplierId: "",
    packSize: "100",
    minOrderTotal: "300",
    basePrice: "10",
    deadline: "",
    tiers: "300:9.5,500:9,1000:8.5",
  });
  async function load() {
    const [businessData, catalogData, orderData] = await Promise.all([
      apiRequest("/admin/businesses"),
      apiRequest("/admin/catalog"),
      apiRequest("/orders"),
    ]);
    setBusinesses(businessData.businesses);
    setCatalog(catalogData);
    setOrders(orderData.orders);
    if (!form.productId && catalogData.products[0])
      setForm((value) => ({
        ...value,
        productId: catalogData.products[0].id,
        supplierId: catalogData.suppliers[0]?.id || "",
      }));
  }
  useEffect(() => {
    load();
  }, []);
  async function update(id, status) {
    await apiRequest(`/admin/businesses/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setMessage("Business status updated.");
    load();
  }
  async function createOrder(event) {
    event.preventDefault();
    setError("");
    const tiers = form.tiers.split(",").map((item) => {
      const [thresholdUnits, unitPrice] = item.split(":");
      return {
        minUnits: Number(thresholdUnits),
        unitPrice: Number(unitPrice),
      };
    });
    const packSize = Number(form.packSize);
    const minOrderTotal = Number(form.minOrderTotal);
    const basePrice = Number(form.basePrice);
    const invalidTiers = tiers.length !== 3 || tiers.some((tier, index) => !Number.isInteger(tier.minUnits) || tier.minUnits < minOrderTotal || tier.minUnits % packSize !== 0 || !Number.isFinite(tier.unitPrice) || tier.unitPrice <= 0 || tier.unitPrice >= basePrice || (index > 0 && (tier.minUnits <= tiers[index - 1].minUnits || tier.unitPrice >= tiers[index - 1].unitPrice)));
    if (!Number.isInteger(packSize) || packSize <= 0 || !Number.isInteger(minOrderTotal) || minOrderTotal <= 0 || minOrderTotal % packSize !== 0) return setError("Pack size and MOQ must be positive, and MOQ must be a multiple of the pack size.");
    if (invalidTiers) return setError("Add three tiers with ascending unit minimums, descending prices below base price, and minimums that meet the MOQ.");
    try {
      await apiRequest("/admin/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: form.productId,
          supplierId: form.supplierId,
          packSize,
          minOrderTotal,
          basePrice,
          tiers,
          deadline: new Date(form.deadline).toISOString(),
        }),
      });
      setMessage("Group order created.");
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  async function closeOrder(id) {
    await apiRequest(`/admin/orders/${id}/close`, { method: "PATCH" });
    setMessage("Order closed at the reached tier price.");
    load();
  }
  return (
    <main className="content">
      <p className="eyebrow">Administration</p>
      <h1>Admin</h1>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="form-error">{error}</p>}
      <section className="admin-section">
        <h2>Create a group order</h2>
        <form className="admin-form" onSubmit={createOrder}>
          <label>
            Product
            <select
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              {catalog.products.map((product) => (
                <option value={product.id} key={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Supplier
            <select
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            >
              {catalog.suppliers.map((supplier) => (
                <option value={supplier.id} key={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pack size
            <input
              type="number"
              value={form.packSize}
              onChange={(e) =>
                setForm({ ...form, packSize: e.target.value })
              }
            />
          </label>
          <label>
            Minimum order total (MOQ)
            <input
              type="number"
              value={form.minOrderTotal}
              onChange={(e) =>
                setForm({ ...form, minOrderTotal: e.target.value })
              }
            />
          </label>
          <label>
            Base price per unit
            <input
              type="number"
              step="0.01"
              value={form.basePrice}
              onChange={(e) =>
                setForm({ ...form, basePrice: e.target.value })
              }
            />
          </label>
          <label>
            Deadline
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              required
            />
          </label>
          <label>
            Price tiers{" "}
            <span className="table-subtext">
              threshold:price, comma separated
            </span>
            <input
              value={form.tiers}
              onChange={(e) => setForm({ ...form, tiers: e.target.value })}
            />
          </label>
          <button className="button button-primary">Create order</button>
        </form>
      </section>
      <section className="admin-section">
        <h2>Business approvals</h2>
        <div className="data-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>GSTIN</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((business) => (
                <tr key={business.id}>
                  <td>
                    {business.business_name}
                    <span className="table-subtext">{business.legal_name}</span>
                  </td>
                  <td>{business.gstin}</td>
                  <td>{business.email}</td>
                  <td>{business.account_status}</td>
                  <td>
                    {business.account_status === "Pending" && (
                      <span className="action-row">
                        <button
                          className="button button-small button-primary"
                          onClick={() => update(business.id, "Verified")}
                        >
                          Approve
                        </button>
                        <button
                          className="button button-small button-secondary"
                          onClick={() => update(business.id, "Rejected")}
                        >
                          Reject
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-section">
        <h2>Close an order</h2>
        <div className="data-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Units</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.product_name}</td>
                  <td>{order.units_committed}</td>
                  <td>{order.status}</td>
                  <td>
                    {order.status === "Open" && (
                      <button
                        className="button button-small button-secondary"
                        onClick={() => closeOrder(order.id)}
                      >
                        Close order
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
