// Applique db/schema.sql. Idempotent : lancé à chaque démarrage (npm start).
//   npm run db:migrer

import fs from "node:fs";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {}
}

const schema = fs.readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(schema);
  console.log("Schéma à jour.");
} finally {
  await client.end();
}
