# Local Link

Local Link is a local full-stack demo for group buying by GST-verified restaurants and cloud kitchens in Bengaluru. Businesses join a shared order for packaging or dry goods; the final tier reached at close is the price paid by every participant.

## Run locally

Requirements: Node.js 22 or newer.

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

Open `http://127.0.0.1:5173`.

`npm run dev` starts the Vite client and Express API together. The SQLite database is created at `server/data/local-link.db`.

## Demo accounts

- Business: `koramangala@locallink.demo` / `LocalLink123!`
- Admin: `admin@locallink.demo` / `LocalLink123!`

When registering a new business, the email OTP is printed in the server console. The seeded GSTINs are valid examples for the mock service; the mock service accepts any GSTIN that passes the format and checksum validation. Use `29ABCDE1234F1ZW` for the seeded demo business.

## Project layout

- `client`: React, Vite, routes, pages, API client, and plain CSS
- `server/db`: SQLite schema and seed script
- `server/routes`: auth, order, admin, and chatbot APIs
- `server/services`: GSTIN validation and the mock GST provider
- `server/middleware`: JWT authentication and request helpers

Change the placeholder product name in `client/src/config.js`. The API key for the optional chatbot provider belongs only in `.env`; it is never sent to the browser. Without a key, the keyword FAQ fallback handles basic platform questions.

## Deploying to Vercel

The Express API is exposed as a Vercel serverless function through `api/[...path].js`, and the Vite client is built to `dist`. Node is pinned to `22.x` in `package.json` because `better-sqlite3` does not yet ship binaries for newer Node versions.

1. Import the repository in Vercel and keep the framework preset as **Other** (the included `vercel.json` sets the build command and output directory).
2. Deploy from `main`.
3. The API is available at `/api/*` on the same domain, and the client calls it with a relative URL in production.

On Vercel the SQLite file is created in `/tmp/local-link` and seeded on the first cold start. `/tmp` is ephemeral, so deployed data resets when the function instance is recycled. For durable data, point `DATA_DIR` at a persistent volume or replace SQLite with a hosted database (for example Turso or Postgres).

Locally the database remains at `server/data/local-link.db`. Set `DATA_DIR` to override the location.

## Seller listing pricing

Sell listings use the seller's starting price and discount it as the listing sells:

- 10% sold: 95% of the starting price
- 50% sold: 90% of the starting price
- 75% sold: 85% of the starting price

Whenever an order moves a listing into a higher tier, the new tier price is applied to every order on that listing, not only the latest one. Buyer savings are `(starting price − paid price) × quantity` and appear on the dashboard and savings chart.

## Mock GST provider

`server/services/gstMock.js` exposes `verifyGstin(gstin)`, returning `legalName`, `tradeName`, `state`, and `status`. A real provider can replace this module or its function while keeping the route contract unchanged. The provider should use a server-side credential and preserve the `Active` status check.

## Notes

- Order detail polls every five seconds so current commitment and tier price stay visible.
- Expired open orders are automatically closed on API reads and on a one-minute server interval.
- Login and OTP verification are rate-limited.
- Final prices are locked on close and copied to each participant record.
