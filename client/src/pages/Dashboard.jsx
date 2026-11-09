import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import SummaryStrip from "../components/dashboard/SummaryStrip";
import SavingsChart from "../components/dashboard/SavingsChart";
import OpenOrderRow from "../components/dashboard/OpenOrderRow";
import PastOrdersTable from "../components/dashboard/PastOrdersTable";
import SalesHistoryTable from "../components/dashboard/SalesHistoryTable";

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [sellListings, setSellListings] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = () => apiRequest("/orders/me/summary")
      .then((data) => {
        setOrders(data.orders);
        setSellListings(data.sellListings || []);
        setPurchases(data.purchases || []);
      })
      .catch((requestError) => setError(requestError.message));
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    window.addEventListener("focus", loadDashboard);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", loadDashboard);
    };
  }, []);

  const openOrders = orders.filter((order) => order.status === "Open");
  const pastOrders = orders.filter((order) => order.status !== "Open");
  const purchaseChartRows = purchases.map((purchase) => ({
    id: `marketplace-${purchase.id}`,
    product_name: `${purchase.product_name} · Marketplace`,
    savings: Number(purchase.savings || 0),
  }));
  const savingsOrders = [...orders, ...purchaseChartRows].sort(
    (first, second) => Number(second.savings || 0) - Number(first.savings || 0),
  );
  const totalSaved = [...orders, ...purchases].reduce(
    (total, item) => total + Number(item.savings || 0),
    0,
  );
  const unitsCommitted = orders.reduce((total, order) => total + Number(order.quantity || 0), 0);

  if (!orders.length && !sellListings.length && !purchases.length && !error) {
    return (
      <main className="content dashboard-page">
        <h1>Dashboard</h1>
        <p className="dashboard-lede">Your group orders and what you have saved.</p>
        <p className="dashboard-empty">You have not joined an order yet. <Link to="/marketplace">Browse the Marketplace</Link>.</p>
      </main>
    );
  }

  return (
    <main className="content dashboard-page">
      <h1>Dashboard</h1>
      <p className="dashboard-lede">Your group orders and what you have saved.</p>
      {error && <p className="form-error">{error}</p>}
      <SummaryStrip totalSaved={totalSaved} openOrders={openOrders.length} unitsCommitted={unitsCommitted} />
      <SavingsChart orders={savingsOrders} />
      <section className="dashboard-section">
        <h2>Open orders</h2>
        {openOrders.length ? openOrders.map((order) => <OpenOrderRow order={order} key={order.id} />) : <p className="dashboard-muted">No open orders.</p>}
      </section>
      {(pastOrders.length > 0 || purchases.length > 0) && <PastOrdersTable orders={pastOrders} purchases={purchases} />}
      {sellListings.length > 0 && <SalesHistoryTable listings={sellListings} />}
    </main>
  );
}
