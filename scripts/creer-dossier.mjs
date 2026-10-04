// Crée le dossier « The Machines SA », pré-rempli avec ce que Bumps sait déjà,
// et affiche le lien d'accès à transmettre. Sans effet si le dossier existe :
// le lien est simplement réaffiché.
//
//   npm run dossier:creer                     crée le dossier ou réaffiche le lien
//   npm run dossier:creer -- --nouveau-jeton  génère un nouveau lien, l'ancien cesse de fonctionner

import crypto from "node:crypto";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {}
}

const ENTREPRISE = "The Machines SA";

// Repris du formulaire Notion : l'équipe confirme ou corrige.
const OUTILS = [
  { outil: "Microsoft Business Central (Pro Concept)", departements: "", usage: "ERP", hebergement: "" },
  { outil: "Factorial", departements: "RH", usage: "SIRH", hebergement: "En ligne" },
  { outil: "BLP", departements: "Finance", usage: "Comptabilisation automatique", hebergement: "" },
  { outil: "Power BI", departements: "", usage: "Reporting", hebergement: "" },
  { outil: "Microsoft Copilot", departements: "", usage: "IA", hebergement: "En ligne" },
  { outil: "Claude Entreprise", departements: "", usage: "IA", hebergement: "En ligne" },
  { outil: "Site web (WordPress)", departements: "", usage: "Site vitrine", hebergement: "" },
];

const REPONSES = {
  stockage: "Serveur de fichiers local : environ 99 % / SharePoint : 1 à 10 %",
};

const nouveauJeton = () => crypto.randomBytes(16).toString("base64url");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const { rows } = await client.query("SELECT id, jeton FROM dossiers WHERE entreprise = $1", [ENTREPRISE]);
  let jeton = rows[0]?.jeton;

  if (!rows.length) {
    jeton = nouveauJeton();
    const cree = await client.query("INSERT INTO dossiers (jeton, entreprise) VALUES ($1, $2) RETURNING id", [
      jeton,
      ENTREPRISE,
    ]);
    const dossierId = cree.rows[0].id;
    for (const o of OUTILS) {
      await client.query(
        `INSERT INTO outils (dossier_id, outil, departements, usage, hebergement, pre_rempli)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [dossierId, o.outil, o.departements, o.usage, o.hebergement],
      );
    }
    for (const [cle, valeur] of Object.entries(REPONSES)) {
      await client.query("INSERT INTO reponses (dossier_id, cle, valeur, pre_rempli) VALUES ($1, $2, $3, true)", [
        dossierId,
        cle,
        JSON.stringify(valeur),
      ]);
    }
    console.log(`Dossier « ${ENTREPRISE} » créé.`);
  } else if (process.argv.includes("--nouveau-jeton")) {
    jeton = nouveauJeton();
    await client.query("UPDATE dossiers SET jeton = $1 WHERE id = $2", [jeton, rows[0].id]);
    console.log("Nouveau lien généré : l’ancien ne fonctionne plus.");
  } else {
    console.log(`Le dossier « ${ENTREPRISE} » existe déjà.`);
  }

  await client.query("COMMIT");
  const base = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "http://localhost:3000";
  console.log(`Lien d’accès : ${base}/f/${jeton}`);
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}
