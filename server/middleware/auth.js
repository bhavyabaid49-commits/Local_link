import jwt from "jsonwebtoken";
import database from "../db/database.js";

const secret = process.env.JWT_SECRET || "local-link-development-secret";

export function setAuthCookie(response, business) {
  const token = jwt.sign({ id: business.id, role: business.role }, secret, {
    expiresIn: "7d",
  });
  response.cookie("local_link_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function requireAuth(request, response, next) {
  try {
    const token = request.cookies.local_link_token;
    const payload = jwt.verify(token, secret);
    const business = database
      .prepare(
        "SELECT id, business_name, legal_name, trade_name, gstin, owner_name, email, phone, state, account_status, role FROM businesses WHERE id = ?",
      )
      .get(payload.id);
    if (!business)
      return response
        .status(401)
        .json({ error: "Your session is no longer valid." });
    request.business = business;
    next();
  } catch {
    response.status(401).json({ error: "Please log in to continue." });
  }
}

export function requireAdmin(request, response, next) {
  if (request.business.role !== "admin")
    return response.status(403).json({ error: "Admin access is required." });
  next();
}
