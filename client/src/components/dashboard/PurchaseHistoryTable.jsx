import { formatDate, formatRupees } from "../../utils/formatters";

export default function PurchaseHistoryTable({ purchases }) {
  return (
    <section className="dashboard-section">
      <h2>Marketplace purchases</h2>
      <div className="dashboard-table-scroll">
        <table className="past-orders-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Seller</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Total</th>
              <th>Ordered on</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>{purchase.product_name}</td>
                <td>{purchase.seller_name}</td>
                <td>{Number(purchase.quantity).toLocaleString("en-IN")} {purchase.unit_label}</td>
                <td>{formatRupees(purchase.unit_price)}</td>
                <td>{formatRupees(purchase.quantity * purchase.unit_price)}</td>
                <td>{formatDate(purchase.created_at)}</td>
                <td><span className="order-status order-status-open"><i />{purchase.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}