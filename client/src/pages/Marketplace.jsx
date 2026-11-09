import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";

const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiRequest("/sell-listings"), apiRequest("/requests")])
      .then(([listingData, requestData]) => {
        setListings(listingData.listings);
        setRequests(requestData.requests);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const visibleListings = listings.filter(
    (listing) => !category || listing.category === category,
  );
  const categories = [...new Set([
    ...listings.map((listing) => listing.category),
    ...requests.map((request) => request.category),
  ])];
  const visibleRequests = requests.filter(
    (request) => !category || request.category === category,
  );

  return (
    <main className="content">
      <div className="page-title">
        <div>
          <p className="eyebrow">Seller marketplace</p>
          <h1>Items available to buy</h1>
        </div>
        <Link className="button button-primary" to="/sell">
          Sell an item
        </Link>
      </div>
      <div className="segmented marketplace-filters">
        <button
          className={!category ? "selected" : ""}
          onClick={() => setCategory("")}
        >
          All items
        </button>
        {categories.map((itemCategory) => (
          <button
            className={category === itemCategory ? "selected" : ""}
            onClick={() => setCategory(itemCategory)}
            key={itemCategory}
          >
            {itemCategory}
          </button>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="data-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Seller</th>
              <th>Price</th>
              <th>Available</th>
              <th>Minimum order</th>
              <th>Deadline</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleListings.map((listing) => (
              <tr key={listing.id}>
                <td>
                  <strong>{listing.product_name}</strong>
                  <span className="table-subtext">
                    {listing.category} · {listing.unit_label}
                  </span>
                </td>
                <td>{listing.seller_name}</td>
                <td>
                  {money(listing.current_price ?? listing.price_per_unit)} /{" "}
                  {listing.unit_label}
                  {listing.current_price < listing.price_per_unit && (
                    <span className="table-subtext">
                      was {money(listing.price_per_unit)} ·{" "}
                      {Number(listing.sold_percent || 0).toFixed(0)}% sold
                    </span>
                  )}
                </td>
                <td>{Number(listing.available_units).toLocaleString("en-IN")}</td>
                <td>
                  {Number(listing.minimum_order_units).toLocaleString("en-IN")}
                </td>
                <td>
                  {listing.deadline
                    ? new Date(listing.deadline).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "Open"}
                </td>
                <td>
                  <Link className="button button-small button-secondary" to={`/sell/${listing.id}`}>
                    Order
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visibleListings.length && (
        <p className="empty-state">
          No seller listings are available in this category yet. Sellers can add
          one from the Sell an item page.
        </p>
      )}
      <section className="marketplace-requests-section">
        <div className="marketplace-section-heading">
          <div>
            <p className="eyebrow">Businesses looking for supply</p>
            <h2>Supply requests</h2>
          </div>
          <Link className="button button-secondary button-small" to="/requests">
            Create a request
          </Link>
        </div>
        <div className="data-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Business</th>
                <th>Units needed</th>
                <th>Supplier offers</th>
                <th>Response deadline</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <strong>{request.product_name}</strong>
                    <span className="table-subtext">{request.category} · {request.unit_label}</span>
                  </td>
                  <td>{request.requester_name}</td>
                  <td>{Number(request.requested_units).toLocaleString("en-IN")}</td>
                  <td>{request.interest_count}</td>
                  <td>{new Date(request.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                  <td><Link className="button button-small button-secondary" to={`/requests/${request.id}`}>Respond</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleRequests.length && <p className="empty-state">No supply requests are open in this category yet.</p>}
      </section>
    </main>
  );
}
