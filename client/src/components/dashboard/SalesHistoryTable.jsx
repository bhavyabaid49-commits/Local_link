import { formatDate, formatRupees } from "../../utils/formatters";

export default function SalesHistoryTable({ listings }) {
  return (
    <section className="dashboard-section">
      <h2>Sell listing history</h2>
      <div className="dashboard-table-scroll">
        <table className="past-orders-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>Quantity listed</th>
              <th>Minimum order</th>
              <th>Listed on</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td>{listing.product_name}</td>
                <td>{formatRupees(listing.price_per_unit)} / {listing.unit_label}</td>
                <td>{Number(listing.available_units).toLocaleString("en-IN")}</td>
                <td>{Number(listing.minimum_order_units).toLocaleString("en-IN")}</td>
                <td>{formatDate(listing.created_at)}</td>
                <td><span className={`order-status ${listing.status === "Open" ? "order-status-open" : "order-status-closed"}`}><i />{listing.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}