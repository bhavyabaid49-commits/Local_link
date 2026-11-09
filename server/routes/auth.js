import bcrypt from "bcryptjs";
import express from "express";
import rateLimit from "express-rate-limit";
import {
  createBusiness,
  createOtp,
  findValidOtp,
  getBusinessByEmail,
  getBusinessById,
  markOtpUsed,
  updateBusiness,
} from "../db/repositories.js";
import { setAuthCookie } from "../middleware/auth.js";
import { requiredFields } from "../middleware/validation.js";
import { isValidGstin, normalizeGstin } from "../services/gstin.js";
import { verifyGstin } from "../services/gstMock.js";

const router = express.Router();
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: "Too many OTP requests. Try again later." },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many login attempts. Try again later." },
});

router.post("/gst-verify", async (request, response) => {
  const gstin = normalizeGstin(request.body.gstin);
  if (!isValidGstin(gstin))
    return response
      .status(400)
      .json({ error: "Enter a valid 15-character GSTIN." });
  response.json(await verifyGstin(gstin));
});

router.post("/register", async (request, response) => {
  const missing = requiredFields(request.body, [
    "businessName",
    "gstin",
    "ownerName",
    "email",
    "phone",
    "password",
  ]);
  if (missing.length)
    return response.status(400).json({ error: `Enter ${missing.join(", ")}.` });
  const gstin = normalizeGstin(request.body.gstin);
  if (!isValidGstin(gstin))
    return response
      .status(400)
      .json({ error: "Enter a valid 15-character GSTIN." });
  if (String(request.body.password).length < 8)
    return response
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
  const gst = await verifyGstin(gstin);
  if (gst.status !== "Active")
    return response
      .status(400)
      .json({ error: "This GST registration is not active." });
  try {
    const hash = await bcrypt.hash(request.body.password, 10);
    const business = createBusiness({
      business_name: request.body.businessName.trim(),
      legal_name: gst.legalName,
      trade_name: gst.tradeName,
      gstin,
      owner_name: request.body.ownerName.trim(),
      email: request.body.email.trim().toLowerCase(),
      phone: request.body.phone.trim(),
      password_hash: hash,
      state: gst.state,
      gst_status: gst.status,
    });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    createOtp({
      businessId: business.id,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    console.log(
      `[demo OTP] ${request.body.email.trim().toLowerCase()}: ${code}`,
    );
    response.status(201).json({
      businessId: business.id,
      legalName: gst.legalName,
      tradeName: gst.tradeName,
      state: gst.state,
      message: "GST verified. Enter the OTP sent to your email.",
    });
  } catch (error) {
    if (error.code === "DUPLICATE")
      return response
        .status(409)
        .json({ error: "That email or GSTIN is already registered." });
    response.status(500).json({ error: "Could not create the account." });
  }
});

router.post("/verify-otp", otpLimiter, (request, response) => {
  const { businessId, otp } = request.body;
  const record = findValidOtp({
    businessId,
    code: String(otp || ""),
    currentTime: new Date().toISOString(),
  });
  if (!record)
    return response
      .status(400)
      .json({ error: "That OTP is invalid or expired." });
  markOtpUsed(record.id);
  updateBusiness(businessId, { account_status: "Verified" });
  const business = getBusinessById(businessId);
  setAuthCookie(response, business);
  response.json({
    business: {
      id: business.id,
      businessName: business.business_name,
      accountStatus: business.account_status,
      role: business.role,
    },
  });
});

router.post("/login", loginLimiter, async (request, response) => {
  const email = String(request.body.email || "")
    .trim()
    .toLowerCase();
  const business = getBusinessByEmail(email);
  if (
    !business ||
    !(await bcrypt.compare(
      String(request.body.password || ""),
      business.password_hash,
    ))
  )
    return response
      .status(401)
      .json({ error: "Email or password is incorrect." });
  if (business.account_status !== "Verified")
    return response
      .status(403)
      .json({ error: "Verify your email OTP before logging in." });
  setAuthCookie(response, business);
  response.json({
    business: {
      id: business.id,
      businessName: business.business_name,
      accountStatus: business.account_status,
      role: business.role,
    },
  });
});

router.post("/logout", (_request, response) => {
  response.clearCookie("local_link_token");
  response.json({ ok: true });
});

export default router;
