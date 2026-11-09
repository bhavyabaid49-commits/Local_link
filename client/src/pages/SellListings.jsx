import { useEffect, useMemo, useState } from "react";
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

const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

export default function SellListings({ business }) {
  const [listings, setListings] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItem, setCustomItem] = useState({ name: "", category: "", unitLabel: "" });
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ productId: "", availableUnits: "", pricePerUnit: "", minimumOrderUnits: "1", deadline: "", notes: "" });

  async function load() {
    const [listingData, catalogData] = await Promise.all([apiRequest("/sell-listings"), apiRequest("/sell-listings/catalog")]);
    setListings(listingData.listings);
    setProducts(catalogData.products);
    if (!form.productId && catalogData.products[0]) setForm((value) => ({ ...value, productId: catalogData.products[0].id }));
  }
  useEffect(() => { load(); }, []);

  const productGroups = useMemo(() => groupProducts(products), [products]);
  const categories = Object.keys(productGroups);
  const searchTerm = normalizeSearch(itemSearch);
  const selectedProduct = products.find((product) => String(product.id) === String(form.productId));
  const visibleProducts = products.filter((product) => {
    const matchesCategory = searchTerm ? true : !selectedCategories.length || selectedCategories.includes(product.category);
    return matchesCategory && normalizeSearch(product.name).includes(searchTerm);
  });

  async function createListing(event) {
    event.preventDefault();
    try {
      const result = await apiRequest("/sell-listings", { method: "POST", body: JSON.stringify(form) });
      setMessage(result.message);
      setForm((value) => ({ ...value, availableUnits: "", pricePerUnit: "", minimumOrderUnits: "1", deadline: "", notes: "" }));
      load();
    } catch (error) { setMessage(error.message); }
  }

  async function createItem(event) {
    event.preventDefault();
    try {
      const result = await apiRequest("/products", { method: "POST", body: JSON.stringify(customItem) });
      setProducts((current) => [...current, result.product]);
      setForm((value) => ({ ...value, productId: result.product.id }));
      setSelectedCategories([result.product.category]);
      setCustomItem({ name: "", category: "", unitLabel: "" });
      setCustomItemOpen(false);
      setMessage(result.message);
    } catch (error) { setMessage(error.message); }
  }

  async function closeListing(id) {
    try {
      const result = await apiRequest(`/sell-listings/${id}/close`, { method: "PATCH" });
      setMessage(result.message);
      load();
    } catch (error) { setMessage(error.message); }
  }

  return <main className="content"><div className="page-title"><div><p className="eyebrow">Seller marketplace</p><h1>Sell items</h1></div><p className="muted page-intro">Tell restaurants what you have available, your price per unit, and how much they can order.</p></div><div className="request-layout"><section><div className="section-heading"><h2>Items for sale</h2><span className="muted">{listings.length} open</span></div><div className="data-table-wrap"><table><thead><tr><th>Item</th><th>Seller</th><th>Price</th><th>Available</th><th>Minimum order</th><th>Deadline</th><th /></tr></thead><tbody>{listings.map((listing) => <tr key={listing.id}><td><strong>{listing.product_name}</strong><span className="table-subtext">{listing.category} · {listing.unit_label}</span></td><td>{listing.seller_name}</td><td>{money(listing.current_price ?? listing.price_per_unit)} / {listing.unit_label}</td><td>{Number(listing.available_units).toLocaleString("en-IN")}</td><td>{Number(listing.minimum_order_units).toLocaleString("en-IN")}</td><td>{listing.deadline ? new Date(listing.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Open"}</td><td>{business?.id === listing.seller_business_id && <button className="button button-small button-secondary" onClick={() => closeListing(listing.id)}>Close</button>}</td></tr>)}</tbody></table></div>{!listings.length && <p className="empty-state">No items are currently listed for sale.</p>}</section>{business ? <section className="request-form-panel"><h2>List an item for sale</h2><p className="muted">Only verified businesses can list items.</p><form className="form" onSubmit={createListing}><fieldset className="item-picker"><legend>Item</legend><button type="button" className="item-picker-toggle" aria-expanded={itemPickerOpen} onClick={() => setItemPickerOpen((open) => !open)}>{selectedProduct ? `${selectedProduct.name} (${selectedProduct.unit_label})` : "Choose an item"}<span>{itemPickerOpen ? "Close" : "Browse"}</span></button>{itemPickerOpen && <div className="item-picker-options"><label>Search items<input type="search" value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search all categories" /></label><div className="category-buttons" role="group" aria-label="Product categories">{categories.map((itemCategory) => <button type="button" className={`category-button ${selectedCategories.includes(itemCategory) ? "selected" : ""}`} onClick={() => { setItemSearch(""); setSelectedCategories((current) => current.includes(itemCategory) ? current.filter((value) => value !== itemCategory) : [...current, itemCategory]); const firstItem = productGroups[itemCategory]?.[0]; if (firstItem) setForm((value) => ({ ...value, productId: firstItem.id })); }} key={itemCategory}>{itemCategory}</button>)}</div><label>Matching item<select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} required>{visibleProducts.length ? visibleProducts.map((product) => <option value={product.id} key={product.id}>{product.name} ({product.unit_label}) · {product.category}</option>) : <option value="">No matching items</option>}</select></label><button type="button" className="button button-secondary create-item-button" onClick={() => setCustomItemOpen((open) => !open)}>{customItemOpen ? "Close new item form" : "Create a new item"}</button>{customItemOpen && <div className="custom-item-form"><p className="muted">Add an item that is not in the catalog.</p><label>Item name<input value={customItem.name} onChange={(event) => setCustomItem({ ...customItem, name: event.target.value })} required /></label><label>Category<input value={customItem.category} onChange={(event) => setCustomItem({ ...customItem, category: event.target.value })} placeholder="For example, Kitchen equipment" required /></label><label>Unit<input value={customItem.unitLabel} onChange={(event) => setCustomItem({ ...customItem, unitLabel: event.target.value })} placeholder="For example, piece or kg" required /></label><button type="button" className="button button-primary" onClick={createItem}>Add item</button></div>}</div>}</fieldset><label>Price per unit<input type="number" min="0.01" step="0.01" value={form.pricePerUnit} onChange={(event) => setForm({ ...form, pricePerUnit: event.target.value })} placeholder="For example, 75" required /></label><label>Available units<input type="number" min="1" value={form.availableUnits} onChange={(event) => setForm({ ...form, availableUnits: event.target.value })} required /></label><label>Minimum order<input type="number" min="1" value={form.minimumOrderUnits} onChange={(event) => setForm({ ...form, minimumOrderUnits: event.target.value })} required /></label><label>Listing deadline <span className="table-subtext">Optional</span><input type="datetime-local" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label><label>Details for buyers<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows="3" placeholder="Delivery area, quality, packaging, or other details" /></label>{message && <p className={message.includes("posted") || message.includes("closed") || message.includes("added") ? "success-message" : "form-error"}>{message}</p>}<button className="button button-primary">List item for sale</button></form></section> : <section className="request-form-panel"><h2>Want to sell supplies?</h2><p className="muted">Log in with a verified business account to list an item.</p></section>}</div></main>;
}
