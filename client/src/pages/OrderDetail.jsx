import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api";
import { formatRupees } from "../utils/formatters";

export default function OrderDetail({ business }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [maxUnitPrice, setMaxUnitPrice] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const result = await apiRequest(`/orders/${id}`);
      setData(result.order);
    } catch (error) {
      setMessage(error.message);
    }
  }
  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [id]);

  async function join(event) {
    event.preventDefault();
    try {
      const result = await apiRequest(`/orders/${id}/join`, {
        method: "POST",
        body: JSON.stringify({ quantity, maxUnitPrice }),
      });
      setMessage(result.message);
      load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!data) return <main className="content narrow"><p>{message || "Loading order..."}</p></main>;

  const projectedUnits = data.units_committed + Number(quantity || 0);
  const projectedTier = [...data.tiers].reverse().find((tier) => projectedUnits >= tier.min_units);
  const projectedPrice = projectedTier?.unit_price || data.base_price;
  const statusClass = data.status === "Open" ? "order-status-open" : "order-status-closed";

  return <main className="content"><Link className="back-link" to="/marketplace">Back to marketplace</Link><div className="detail-header"><div><p className="eyebrow">{data.category} · {data.supplier_name}</p><h1>{data.product_name}</h1><p className="muted">Sold as {data.unit_label}</p></div><span className={`order-status ${statusClass}`}><i />{data.status}</span></div><div className="detail-grid"><section><div className="metric"><span>Current group price</span><strong>{formatRupees(data.current_unit_price)} <small>per unit</small></strong><p>Everyone pays the final tier reached when this order closes.</p></div><div className="minimum-order-block"><div className="progress-label"><span>Minimum order: {Number(data.min_order_total).toLocaleString("en-IN")} units</span><span>{Number(data.units_committed).toLocaleString("en-IN")} committed</span></div><div className="progress"><span style={{ width: `${Math.min(data.min_order_progress * 100, 100)}%` }} /></div></div>{data.next_tier_min_units ? <p className="next-tier-message">{Number(data.units_needed_for_next_tier).toLocaleString("en-IN")} more units to reach {formatRupees(data.next_tier_price)} per unit.</p> : <p className="next-tier-message">Best price reached.</p>}<div className="section-heading"><h2>Price tiers</h2><span className="muted">{data.business_count} businesses</span></div><div className="tier-table" role="table" aria-label="Order price tiers">{data.tiers.map((tier, index) => { const percentOff = data.base_price ? ((data.base_price - tier.unit_price) / data.base_price) * 100 : 0; const isCurrent = data.current_tier_index === index; return <div className={isCurrent ? "active" : ""} key={tier.min_units} role="row"><span>{Number(tier.min_units).toLocaleString("en-IN")} units</span><strong>{formatRupees(tier.unit_price)} each</strong><span>{percentOff.toFixed(1)}% off</span></div>; })}</div></section><aside className="join-panel"><h2>Join this order</h2>{data.status === "Open" && (business ? <form className="form" onSubmit={join}><label>Quantity<input type="number" min={data.pack_size} step={data.pack_size} value={quantity} onChange={(event) => setQuantity(event.target.value)} required /><span className="table-subtext">Multiples of {data.pack_size}. Estimated final price: {formatRupees(projectedPrice)} per unit.</span></label><label>Only order if final price is at or below<input type="number" min="0.01" step="0.01" value={maxUnitPrice} onChange={(event) => setMaxUnitPrice(event.target.value)} placeholder={`For example, ${projectedPrice}`} required /><span className="table-subtext">If the final tier is more expensive, your order will not be charged.</span></label>{message && <p className="form-help">{message}</p>}<button className="button button-primary">Save quantity</button></form> : <p className="form-help"><Link to="/login">Log in</Link> to join this order.</p>)}{data.status === "Cancelled" && <p className="form-help">Minimum not reached or the price condition was not met. No charge was recorded.</p>}{data.status === "Closed" && <p className="form-help">This order is closed at {formatRupees(data.final_price)} per unit.</p>}<div className="participants"><h3>Participants</h3>{data.participants.map((person, index) => <p key={index}><span>{person.business_name}</span><span>{person.quantity} units</span></p>)}</div></aside></div></main>;
}
