import { formatRupees } from "../../utils/formatters";

export default function SavingsChart({ orders }) {
  const maxSavings = Math.max(...orders.map((order) => Number(order.savings || 0)), 1);

  return (
    <section className="dashboard-section">
      <h2>Savings by order</h2>
      <div className="savings-chart" role="img" aria-label="Savings by order shown as horizontal bars">
        {orders.map((order) => {
          const savings = Number(order.savings || 0);
          const width = savings ? Math.max((savings / maxSavings) * 100, 2) : 0;
          return (
            <div
              className="savings-chart-row"
              key={order.id}
              role="img"
              aria-label={`${order.product_name}: ${savings ? formatRupees(savings) : "No saving yet"}`}
            >
              <span className="savings-order-name">{order.product_name}</span>
              <div className="savings-bar-track">
                {savings > 0 && <span className="savings-bar" style={{ width: `${width}%` }} />}
              </div>
              <span className={savings ? "savings-value" : "savings-value savings-none"}>
                {savings ? formatRupees(savings) : "No saving yet"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
