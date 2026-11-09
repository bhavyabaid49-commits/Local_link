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

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
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
  response.json({ ok: true, service: "Local Link API" });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Local Link API listening on http://127.0.0.1:${port}`);
  });
}

export default app;
