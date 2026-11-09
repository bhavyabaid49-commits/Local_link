import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";

function groupProducts(products) {
  return products.reduce((groups, product) => {
    groups[product.category] = [...(groups[product.category] || []), product];
    return groups;
  }, {});
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en-IN");
}

export default function SupplyRequests({ business }) {
  const [requests, setRequests] = useState([]);
  const [catalog, setCatalog] = useState({ products: [] });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItem, setCustomItem] = useState({ name: "", category: "", unitLabel: "" });
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    productId: "",
    requestedUnits: "",
    deadline: "",
    notes: "",
  });

  async function load() {
    const [requestData, catalogData] = await Promise.all([
      apiRequest("/requests"),
      apiRequest("/requests/catalog"),
    ]);
    setRequests(requestData.requests);
    setCatalog(catalogData);
    if (!catalogData.products.length) {
      return;
    }
    if (!form.productId) {
      setForm((value) => ({ ...value, productId: catalogData.products[0].id }));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const productGroups = useMemo(() => groupProducts(catalog.products), [catalog.products]);
  const categories = Object.keys(productGroups);
  const searchTerm = normalizeSearch(itemSearch);
  const selectedProduct = catalog.products.find(
    (product) => String(product.id) === String(form.productId),
  );
  const visibleProducts = catalog.products.filter((product) => {
    const matchesCategory = searchTerm
      ? true
      : !selectedCategories.length || selectedCategories.includes(product.category);
    const matchesSearch = normalizeSearch(product.name).includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  async function createRequest(event) {
    event.preventDefault();
    try {
      const result = await apiRequest("/requests", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(result.message);
      setForm((value) => ({ ...value, requestedUnits: "", deadline: "", notes: "" }));
      load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createItem(event) {
    event.preventDefault();
    try {
      const result = await apiRequest("/products", {
        method: "POST",
        body: JSON.stringify(customItem),
      });
      setCatalog((value) => ({ ...value, products: [...value.products, result.product] }));
      setForm((value) => ({ ...value, productId: result.product.id }));
      setSelectedCategories([result.product.category]);
      setCustomItem({ name: "", category: "", unitLabel: "" });
      setCustomItemOpen(false);
      setMessage(result.message);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="content">
      <div className="page-title">
        <div>
          <p className="eyebrow">Supplier network</p>
          <h1>Supply requests</h1>
        </div>
        <p className="muted page-intro">
          Businesses can describe what they need. Suppliers can respond with the
          quantity they can provide.
        </p>
      </div>
      <div className="request-layout">
        <section>
          <div className="section-heading">
            <h2>Open requests</h2>
            <span className="muted">{requests.length} active</span>
          </div>
          <div className="request-list">
            {requests.map((item) => (
              <Link className="request-row" to={`/requests/${item.id}`} key={item.id}>
                <div>
                  <strong>{item.product_name}</strong>
                  <span>{item.category} · requested by {item.requester_name}</span>
                </div>
                <div className="request-numbers">
                  <strong>{Number(item.requested_units).toLocaleString("en-IN")} units</strong>
                  <span>{item.interest_count} supplier {item.interest_count === 1 ? "offer" : "offers"}</span>
                </div>
              </Link>
            ))}
          </div>
          {!requests.length && <p className="empty-state">No open supply requests yet.</p>}
        </section>
        {business ? (
          <section className="request-form-panel">
            <h2>Post a request</h2>
            <p className="muted">Choose a category, then search for the item you need.</p>
            <form className="form" onSubmit={createRequest}>
              <fieldset className="item-picker">
                <legend>Item</legend>
                <button
                  type="button"
                  className="item-picker-toggle"
                  aria-expanded={itemPickerOpen}
                  onClick={() => setItemPickerOpen((open) => !open)}
                >
                  {selectedProduct
                    ? `${selectedProduct.name} (${selectedProduct.unit_label})`
                    : "Choose an item"}
                  <span>{itemPickerOpen ? "Close" : "Browse"}</span>
                </button>
                {itemPickerOpen && (
                  <div className="item-picker-options">
                    <label>
                      Search items
                      <input
                        type="search"
                        value={itemSearch}
                        onChange={(event) => setItemSearch(event.target.value)}
                        placeholder="Search all categories"
                      />
                    </label>
                    <div className="category-buttons" role="group" aria-label="Product categories">
                      {categories.map((itemCategory) => (
                        <button
                          type="button"
                          className={`category-button ${selectedCategories.includes(itemCategory) ? "selected" : ""}`}
                          onClick={() => {
                            setItemSearch("");
                            setSelectedCategories((current) =>
                              current.includes(itemCategory)
                                ? current.filter((value) => value !== itemCategory)
                                : [...current, itemCategory],
                            );
                            const firstItem = productGroups[itemCategory]?.[0];
                            if (firstItem) setForm((value) => ({ ...value, productId: firstItem.id }));
                          }}
                          key={itemCategory}
                        >
                          {itemCategory}
                        </button>
                      ))}
                    </div>
                    <label>
                      Matching item
                      <select
                        value={form.productId}
                        onChange={(event) => setForm({ ...form, productId: event.target.value })}
                        required
                      >
                        {visibleProducts.length ? (
                          visibleProducts.map((product) => (
                            <option value={product.id} key={product.id}>
                              {product.name} ({product.unit_label}) · {product.category}
                            </option>
                          ))
                        ) : (
                          <option value="">No matching items</option>
                        )}
                      </select>
                    </label>
                    <button type="button" className="button button-secondary create-item-button" onClick={() => setCustomItemOpen((open) => !open)}>
                      {customItemOpen ? "Close new item form" : "Create a new item"}
                    </button>
                    {customItemOpen && <div className="custom-item-form"><p className="muted">Add an item that is not in the catalog.</p><label>Item name<input value={customItem.name} onChange={(event) => setCustomItem({ ...customItem, name: event.target.value })} required /></label><label>Category<input value={customItem.category} onChange={(event) => setCustomItem({ ...customItem, category: event.target.value })} placeholder="For example, Kitchen equipment" required /></label><label>Unit<input value={customItem.unitLabel} onChange={(event) => setCustomItem({ ...customItem, unitLabel: event.target.value })} placeholder="For example, piece or kg" required /></label><button type="button" className="button button-primary" onClick={createItem}>Add item</button></div>}
                  </div>
                )}
              </fieldset>
              <label>
                Units needed
                <input
                  type="number"
                  min="1"
                  value={form.requestedUnits}
                  onChange={(event) => setForm({ ...form, requestedUnits: event.target.value })}
                  required
                />
              </label>
              <label>
                Response deadline
                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                  required
                />
              </label>
              <label>
                Notes for suppliers
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  rows="3"
                />
              </label>
              {message && (
                <p className={message.includes("posted") ? "success-message" : "form-error"}>
                  {message}
                </p>
              )}
              <button className="button button-primary">Post supply request</button>
            </form>
          </section>
        ) : (
          <section className="request-form-panel">
            <h2>Want to post a request?</h2>
            <p className="muted">Log in with a verified business account to tell suppliers what you need.</p>
            <Link className="button button-secondary" to="/login">Log in</Link>
          </section>
        )}
      </div>
    </main>
  );
}
