import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

const initialForm = {
  businessName: "",
  gstin: "",
  ownerName: "",
  email: "",
  phone: "",
  password: "",
};
export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [gst, setGst] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  function update(key, value) {
    setForm({ ...form, [key]: value });
  }
  async function verifyGst() {
    setError("");
    setLoading(true);
    try {
      setGst(
        await apiRequest("/auth/gst-verify", {
          method: "POST",
          body: JSON.stringify({ gstin: form.gstin }),
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  async function register(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setBusinessId(result.businessId);
      setGst(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  async function verifyOtp(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await apiRequest("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ businessId, otp }),
      });
      onLogin(result.business);
      navigate("/marketplace");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  if (businessId)
    return (
      <main className="content narrow">
        <p className="eyebrow">Email verification</p>
        <h1>Check your OTP</h1>
        <p className="lede">
          We logged a six-digit OTP to the server console for this demo.
        </p>
        <form className="form" onSubmit={verifyOtp}>
          <label>
            Email OTP
            <input
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary" disabled={loading}>
            {loading ? "Verifying..." : "Verify email"}
          </button>
        </form>
      </main>
    );
  return (
    <main className="content narrow">
      <p className="eyebrow">GST-verified businesses</p>
      <h1>Register your business</h1>
      <form className="form" onSubmit={register}>
        <label>
          Business name
          <input
            value={form.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            required
          />
        </label>
        <label>
          GSTIN
          <div className="input-row">
            <input
              value={form.gstin}
              onChange={(e) => update("gstin", e.target.value.toUpperCase())}
              maxLength="15"
              required
            />
            <button
              className="button button-secondary"
              type="button"
              onClick={verifyGst}
              disabled={loading}
            >
              Check GSTIN
            </button>
          </div>
        </label>
        {gst && (
          <div className="verification">
            <strong>{gst.legalName}</strong>
            <span>
              {gst.tradeName} · {gst.state} · {gst.status}
            </span>
          </div>
        )}
        <label>
          Owner name
          <input
            value={form.ownerName}
            onChange={(e) => update("ownerName", e.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </label>
        <label>
          Phone
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            minLength="8"
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="button button-primary" disabled={loading}>
          {loading ? "Submitting..." : "Submit registration"}
        </button>
      </form>
    </main>
  );
}
