import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api";
import { formatRupees } from "../utils/formatters";

export default function SellListingDetail({ business }) {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await apiRequest(`/sell-listings/${id}`);
      setListing(data.listing);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [id]);

  async function placeOrder(event) {
    event.preventDefault();
    try {
      const result = await apiRequest(`/sell-listings/${id}/orders`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      });
      setMessage(result.message);
      setQuantity("");
      load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!listing)
    return (
      <main className="content narrow">
        <p>{message || "Loading listing..."}</p>
      </main>
    );

  const currentPrice = listing.current_price ?? listing.price_per_unit;
  const hasDiscount = currentPrice < listing.price_per_unit;

  return (
    <main className="content narrow">
      <Link className="back-link" to="/marketplace">
        Back to Marketplace
      </Link>
      <p className="eyebrow">Seller listing</p>
      <h1>{listing.product_name}</h1>
      <p className="muted">
        {listing.category} · sold by {listing.seller_name}
      </p>
      <div className="listing-facts">
        <div>
          <span>Current price</span>
          <strong>
            {formatRupees(currentPrice)} / {listing.unit_label}
          </strong>
          {hasDiscount && (
            <span className="table-subtext">
              Starting price {formatRupees(listing.price_per_unit)} ·{" "}
              {Number(listing.sold_percent || 0).toFixed(0)}% sold
            </span>
          )}
        </div>
        <div>
          <span>Available</span>
          <strong>
            {Number(listing.available_units).toLocaleString("en-IN")} units
          </strong>
        </div>
        <div>
          <span>Minimum order</span>
          <strong>
            {Number(listing.minimum_order_units).toLocaleString("en-IN")} units
          </strong>
        </div>
      </div>
      {listing.notes && <p className="listing-notes">{listing.notes}</p>}
      {business ? (
        <form className="form order-form" onSubmit={placeOrder}>
          <label>
            Quantity to order
            <input
              type="number"
              min={listing.minimum_order_units}
              max={listing.available_units}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </label>
          <p className="form-help">
            The tier price applies to every order in this listing. If the
            listing reaches a better tier later, your order is repriced too.
          </p>
          {message && (
            <p
              className={
                message.includes("placed") ? "success-message" : "form-error"
              }
            >
              {message}
            </p>
          )}
          <button className="button button-primary">Place order</button>
        </form>
      ) : (
        <p className="form-help">
          <Link to="/login">Log in</Link> to place an order.
        </p>
      )}
    </main>
  );
}
