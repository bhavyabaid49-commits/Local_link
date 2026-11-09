import { formatDate, formatRupees } from "../../utils/formatters";

export default function OpenOrderRow({ order }) {
  const committed = Number(order.units_committed || 0);
  const nextUnits = Number(order.next_tier_units || 0);
  const nextPrice = order.next_tier_price;
  const progress = nextUnits ? Math.min((committed / nextUnits) * 100, 100) : 100;
  const remaining = Math.max(nextUnits - committed, 0);

  return (
    <article className="open-order-row">
      <div className="open-order-heading">
        <div>
          <h3>{order.product_name}</h3>
          <span className="order-quantity">{Number(order.quantity).toLocaleString("en-IN")} units joined</span>
        </div>
        <span className="order-status order-status-open"><i />Open</span>
      </div>
      <div className="open-order-progress" role="img" aria-label={`${order.product_name}: ${committed} of ${nextUnits || committed} units committed`}>
        <div className="progress-copy">
          {nextUnits ? `${committed.toLocaleString("en-IN")} of ${nextUnits.toLocaleString("en-IN")} units. ${remaining.toLocaleString("en-IN")} more to reach ${formatRupees(nextPrice)} per unit.` : "Best price reached."}
        </div>
        <div className="dashboard-progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="open-order-meta">
        <span>Current price <strong>{formatRupees(order.current_price)}</strong></span>
        <span>Starting price <strong>{formatRupees(order.starting_price)}</strong></span>
        <span>Deadline <strong>{formatDate(order.deadline)}</strong></span>
      </div>
    </article>
  );
}
