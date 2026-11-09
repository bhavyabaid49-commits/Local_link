import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Marketplace from "./pages/Marketplace";
import OrderDetail from "./pages/OrderDetail";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import SupplyRequests from "./pages/SupplyRequests";
import SupplyRequestDetail from "./pages/SupplyRequestDetail";
import SellListings from "./pages/SellListings";
import SellListingDetail from "./pages/SellListingDetail";

export default function App() {
  const [business, setBusiness] = useState(null);
  return (
    <Routes>
      <Route element={<Layout business={business} onLogout={() => setBusiness(null)} />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login onLogin={setBusiness} />} />
        <Route path="/register" element={<Register onLogin={setBusiness} />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/requests" element={<SupplyRequests business={business} />} />
        <Route path="/requests/:id" element={<SupplyRequestDetail />} />
        <Route path="/sell" element={<SellListings business={business} />} />
        <Route path="/sell/:id" element={<SellListingDetail business={business} />} />
        <Route
          path="/orders/:id"
          element={<OrderDetail business={business} />}
        />
        <Route
          path="/dashboard"
          element={business ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={
            business?.role === "admin" ? <Admin /> : <Navigate to="/login" />
          }
        />
      </Route>
    </Routes>
  );
}
