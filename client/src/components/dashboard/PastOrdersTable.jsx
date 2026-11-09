import { formatRupees } from "../../utils/formatters";

export default function PastOrdersTable({ orders, purchases = [] }) {
  return (
    <section className="dashboard-section">
      <h2>Past orders</h2>
      <div className="dashboard-table-scroll">
        <table className="past-orders-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Final price</th>
              <th>You saved</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.product_name}</td>
                <td>{Number(order.quantity).toLocaleString("en-IN")}</td>
                <td>{order.status === "Cancelled" ? "-" : formatRupees(order.current_price)}</td>
                <td>{order.status === "Cancelled" ? (order.cancel_reason || "Minimum not reached") : formatRupees(order.savings)}</td>
                <td><span className="order-status order-status-closed"><i />{order.status}</span></td>
              </tr>
            ))}
            {purchases.map((purchase) => (
              <tr key={`purchase-${purchase.id}`}>
                <td>{purchase.product_name} · Marketplace</td>
                <td>{Number(purchase.quantity).toLocaleString("en-IN")}</td>
                <td>{formatRupees(purchase.unit_price)}</td>
                <td>
                  {purchase.savings > 0
                    ? formatRupees(purchase.savings)
                    : "No saving yet"}
                </td>
                <td><span className="order-status order-status-open"><i />{purchase.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
