import database from "../server/db/database.js";
import app from "../server/index.js";

// Vercel serverless filesystems are ephemeral. Seed the demo data once per
// cold start so the deployed app is immediately usable.
const { count } = database
  .prepare("SELECT COUNT(*) AS count FROM businesses")
  .get();

if (!count) {
  await import("../server/db/seed.js");
}

export default app;
