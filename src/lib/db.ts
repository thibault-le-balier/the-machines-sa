import { Pool } from "pg";

// Une seule pool par processus : en dev, le rechargement à chaud réévalue ce
// module, d'où le passage par globalThis.
const memoire = globalThis as unknown as { pool?: Pool };

export const pool = memoire.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

if (process.env.NODE_ENV !== "production") memoire.pool = pool;
