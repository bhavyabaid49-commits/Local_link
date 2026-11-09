import { formatRupees } from "../../utils/formatters";

export default function SummaryStrip({ totalSaved, openOrders, unitsCommitted }) {
  const figures = [
    { label: "Total saved", value: formatRupees(totalSaved) },
    { label: "Open orders", value: openOrders.toLocaleString("en-IN") },
    { label: "Units committed", value: unitsCommitted.toLocaleString("en-IN") },
  ];

  return (
    <section className="dashboard-summary" aria-label="Dashboard summary">
      {figures.map((figure) => (
        <div className="summary-figure" key={figure.label}>
          <strong>{figure.value}</strong>
          <span>{figure.label}</span>
        </div>
      ))}
    </section>
  );
}
