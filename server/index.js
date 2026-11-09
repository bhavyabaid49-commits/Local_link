import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import chatRoutes from "./routes/chat.js";
import requestRoutes from "./routes/requests.js";
import sellListingRoutes from "./routes/sellListings.js";
import productRoutes from "./routes/products.js";
import { closeExpiredOrders } from "./routes/orders.js";

const app = express();
const port = process.env.PORT || 4000;

// Vercel (and most hosts) terminate TLS in front of the function, so Express
// must trust the proxy to read the real client IP for rate limiting.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use((request, _response, next) => {
  if (!request.body || typeof request.body !== "object") request.body = {};
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/sell-listings", sellListingRoutes);
app.use("/api/products", productRoutes);

if (!process.env.VERCEL) {
  setInterval(closeExpiredOrders, 60 * 1000);
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "Local Link API",
    node: process.version,
    environment: process.env.VERCEL ? "vercel" : "local",
  });
});

app.use("/api", (request, response) => {
  response.status(404).json({
    error: `API route not found: ${request.method} ${request.originalUrl || request.url}`,
  });
});

// Always answer API failures with JSON so the client can show the real reason
// instead of a generic "Something went wrong." message.
app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  const status = Number(error.status || error.statusCode) || 500;
  if (status >= 500) console.error("[api error]", error);
  const message =
    error.type === "entity.parse.failed"
      ? "Invalid JSON body."
      : error.message || "Invalid request.";
  response
    .status(status)
    .json({
      error: status >= 500 ? "Unexpected server error." : message,
    });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Local Link API listening on http://127.0.0.1:${port}`);
  });
}

export default app;
