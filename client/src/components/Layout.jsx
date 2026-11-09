import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import ChatWidget from "./ChatWidget";
import { APP_NAME } from "../config";

export default function Layout({ business, onLogout }) {
  const navigate = useNavigate();
  async function logout() {
    await apiRequest("/auth/logout", { method: "POST" });
    onLogout();
    navigate("/");
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="wordmark" to="/">
          {APP_NAME}
        </Link>
        <nav className="site-nav">
          <NavLink to="/marketplace">Marketplace</NavLink>
          <NavLink to="/requests">Supply requests</NavLink>
          <NavLink to="/sell">Sell items</NavLink>
          {business && <NavLink to="/dashboard">Dashboard</NavLink>}
          {business?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
          {business ? (
            <button className="text-button" onClick={logout}>
              Log out
            </button>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
        </nav>
      </header>
      <Outlet />
      {business && <ChatWidget />}
    </div>
  );
}
