import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <main className="content landing">
      <div className="landing-copy">
        <p className="eyebrow">Bengaluru group buying</p>
        <h1>Buy business supplies together.</h1>
        <p className="lede">
          GST-verified restaurants and cloud kitchens join the same order to
          reach better prices on packaging and dry goods.
        </p>
        <Link className="button button-primary" to="/register">
          Register your business
        </Link>
      </div>
      <section className="example-order">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live example</p>
            <h2>500ml PET containers</h2>
          </div>
          <span className="status">Open</span>
        </div>
        <p className="muted">Order closes in 5 days · 350 units committed</p>
        <div className="tier-list">
          <div>
            <span>100 units</span>
            <strong>₹10 each</strong>
          </div>
          <div className="current-tier">
            <span>500 units</span>
            <strong>₹8 each</strong>
          </div>
          <div>
            <span>1,000 units</span>
            <strong>₹7 each</strong>
          </div>
        </div>
        <p className="small-note">
          Everyone pays the tier price reached when the order closes.
        </p>
      </section>
    </main>
  );
}
