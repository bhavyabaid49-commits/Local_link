import express from "express";
import OpenAI from "openai";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const unknownResponse =
  "We apologize for the inconvenience. Unfortunately, we are unable to resolve your query at this time. For further assistance, please contact our support team at support@locallink. We appreciate your patience and understanding.";
const answers = [
  {
    words: ["tier", "price"],
    answer:
      "Each order has quantity thresholds. When the order closes, every participant pays the price for the highest threshold reached.",
  },
  {
    words: ["gst", "verify"],
    answer:
      "We check the GSTIN format and checksum, then confirm the registration through the GST verification service. Only Active registrations can proceed.",
  },
  {
    words: ["saving"],
    answer:
      "Savings are the starting tier price minus the final closed-order price, multiplied by your quantity.",
  },
  {
    words: ["work", "group", "join"],
    answer:
      "Choose an open order, enter your quantity, and the total commitment moves the group toward the next price tier.",
  },
];

function faqFallback(message) {
  const lower = message.toLowerCase();
  const match = answers.find((item) =>
    item.words.some((word) => lower.includes(word)),
  );
  return match?.answer || unknownResponse;
}

router.post("/", requireAuth, async (request, response) => {
  const message = String(request.body.message || "").trim();
  if (!message)
    return response.status(400).json({ error: "Message is required." });
  const fallback = faqFallback(message);
  if (!process.env.OPENAI_API_KEY)
    return response.json({ answer: fallback, source: "faq" });
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            `You are the Local Link support assistant. Answer only from Local Link platform rules and the user order data. If you cannot answer from that information, respond exactly with: "${unknownResponse}" Do not give legal or tax advice.`,
        },
        {
          role: "system",
          content: `User data: ${JSON.stringify(request.body.orderData || {})}`,
        },
        { role: "user", content: message },
      ],
    });
    response.json({
      answer: completion.choices[0].message.content,
      source: "llm",
    });
  } catch {
    response.json({ answer: fallback, source: "faq" });
  }
});

export default router;
