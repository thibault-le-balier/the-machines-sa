// Accès à la base. Chaque écriture touche une seule réponse, une seule ligne ou
// un seul fichier : deux personnes qui remplissent des parties différentes ne
// peuvent pas s'écraser mutuellement.

import { pool } from "./db";
import { COLONNES } from "./questionnaire";
import type {
  CellulesOutil,
  CellulesTache,
  Dossier,
  Etat,
  Fichier,
  Outil,
  Participant,
  Reponse,
  Tableau,
  Tache,
  Valeur,
} from "./types";

type Ligne = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const estUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

const iso = (d: unknown) => (d as Date).toISOString();

const SUIVI = "id, pre_rempli, cree_par, cree_le, modifie_par, modifie_le";
const FICHIER = "id, categorie, nom, type_mime, taille, depose_par, depose_le";

const versSuivi = (r: Ligne) => ({
  id: r.id as string,
  pre_rempli: r.pre_rempli as boolean,
  cree_par: r.cree_par as string | null,
  cree_le: iso(r.cree_le),
  modifie_par: r.modifie_par as string | null,
  modifie_le: iso(r.modifie_le),
});

const versOutil = (r: Ligne): Outil => ({
  ...versSuivi(r),
  outil: r.outil as string,
  departements: r.departements as string,
  usage: r.usage as string,
  hebergement: r.hebergement as string,
});

const versTache = (r: Ligne): Tache => ({
  ...versSuivi(r),
  departement: r.departement as string,
  tache: r.tache as string,
  // numeric arrive en texte depuis pg
  heures_semaine: r.heures_semaine === null ? null : Number(r.heures_semaine),
});

const VERS = { outils: versOutil, taches: versTache };

const versReponse = (r: Ligne): Reponse => ({
  valeur: r.valeur as Valeur,
  pre_rempli: r.pre_rempli as boolean,
  modifie_par: r.modifie_par as string | null,
  modifie_le: iso(r.modifie_le),
});

const versFichier = (r: Ligne): Fichier => ({
  id: r.id as string,
  categorie: r.categorie as string,
  nom: r.nom as string,
  type_mime: r.type_mime as string,
  taille: r.taille as number,
  depose_par: r.depose_par as string | null,
  depose_le: iso(r.depose_le),
});

/* Dossier et état complet */

export async function trouverDossier(jeton: string): Promise<Dossier | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(jeton)) return null;
  const { rows } = await pool.query<Dossier>("SELECT id, entreprise FROM dossiers WHERE jeton = $1", [jeton]);
  return rows[0] ?? null;
}

export async function chargerEtat(dossierId: string): Promise<Etat> {
  const [participants, reponses, outils, taches, fichiers] = await Promise.all([
    pool.query(
      "SELECT id, nom, departement, vu_le FROM participants WHERE dossier_id = $1 ORDER BY cree_le",
      [dossierId],
    ),
    pool.query("SELECT cle, valeur, pre_rempli, modifie_par, modifie_le FROM reponses WHERE dossier_id = $1", [
      dossierId,
    ]),
    pool.query(
      `SELECT ${SUIVI}, ${COLONNES.outils.join(", ")} FROM outils
       WHERE dossier_id = $1 AND supprime_le IS NULL ORDER BY rang`,
      [dossierId],
    ),
    pool.query(
      `SELECT ${SUIVI}, ${COLONNES.taches.join(", ")} FROM taches
       WHERE dossier_id = $1 AND supprime_le IS NULL ORDER BY rang`,
      [dossierId],
    ),
    pool.query(
      `SELECT ${FICHIER} FROM fichiers WHERE dossier_id = $1 AND supprime_le IS NULL ORDER BY depose_le`,
      [dossierId],
    ),
  ]);
  return {
    participants: participants.rows.map((p) => ({ ...p, vu_le: iso(p.vu_le) })),
    reponses: Object.fromEntries(reponses.rows.map((r) => [r.cle, versReponse(r)])),
    outils: outils.rows.map(versOutil),
    taches: taches.rows.map(versTache),
    fichiers: fichiers.rows.map(versFichier),
  };
}

/* Participants */

/** Crée la personne, ou la retrouve si ce nom a déjà contribué. */
export async function identifier(dossierId: string, nom: string, departement: string): Promise<Participant> {
  const { rows } = await pool.query(
    `INSERT INTO participants (dossier_id, nom, departement) VALUES ($1, $2, $3)
     ON CONFLICT (dossier_id, lower(nom)) DO UPDATE
       SET departement = CASE WHEN EXCLUDED.departement = '' THEN participants.departement
                              ELSE EXCLUDED.departement END,
           vu_le = now()
     RETURNING id, nom, departement, vu_le`,
    [dossierId, nom, departement],
  );
  return { ...rows[0], vu_le: iso(rows[0].vu_le) };
}

/** Renvoie l'id si la personne appartient bien à ce dossier. */
export async function participantDuDossier(dossierId: string, participantId: unknown): Promise<string | null> {
  if (!estUuid(participantId)) return null;
  const { rows } = await pool.query(
    "UPDATE participants SET vu_le = now() WHERE id = $1 AND dossier_id = $2 RETURNING id",
    [participantId, dossierId],
  );
  return rows[0]?.id ?? null;
}

/* Section 2 : réponses */

export async function enregistrerReponse(
  dossierId: string,
  cle: string,
  valeur: Valeur,
  participantId: string,
): Promise<Reponse> {
  const { rows } = await pool.query(
    `INSERT INTO reponses (dossier_id, cle, valeur, modifie_par) VALUES ($1, $2, $3, $4)
     ON CONFLICT (dossier_id, cle) DO UPDATE
       SET valeur = EXCLUDED.valeur, modifie_par = EXCLUDED.modifie_par, modifie_le = now()
     RETURNING valeur, pre_rempli, modifie_par, modifie_le`,
    [dossierId, cle, JSON.stringify(valeur), participantId],
  );
  return versReponse(rows[0]);
}

/* Sections 1 et 3 : lignes de tableau */

type Cellules = Partial<CellulesOutil> | Partial<CellulesTache>;

// Les noms de colonnes sont interpolés dans le SQL : on ne garde que ceux de la liste blanche.
function colonnes(tableau: Tableau, cellules: Cellules) {
  const permises: readonly string[] = COLONNES[tableau];
  const noms = Object.keys(cellules).filter((c) => permises.includes(c));
  return { noms, valeurs: noms.map((c) => (cellules as Record<string, unknown>)[c]) };
}

async function lireLigne(dossierId: string, tableau: Tableau, id: string) {
  const { rows } = await pool.query(
    `SELECT ${SUIVI}, ${COLONNES[tableau].join(", ")} FROM ${tableau}
     WHERE id = $1 AND dossier_id = $2 AND supprime_le IS NULL`,
    [id, dossierId],
  );
  return rows[0] ? VERS[tableau](rows[0]) : null;
}

/** Idempotent : l'id est choisi par le navigateur, un renvoi ne crée pas de doublon. */
export async function creerLigne(
  dossierId: string,
  tableau: Tableau,
  id: string,
  cellules: Cellules,
  participantId: string,
) {
  const { noms, valeurs } = colonnes(tableau, cellules);
  await pool.query(
    `INSERT INTO ${tableau} (id, dossier_id, cree_par, modifie_par${noms.map((c) => `, ${c}`).join("")})
     VALUES ($1, $2, $3, $3${noms.map((_, i) => `, $${i + 4}`).join("")})
     ON CONFLICT (id) DO NOTHING`,
    [id, dossierId, participantId, ...valeurs],
  );
  return lireLigne(dossierId, tableau, id);
}

/** Sans cellule, la mise à jour vaut confirmation d'une ligne pré-remplie. */
export async function modifierLigne(
  dossierId: string,
  tableau: Tableau,
  id: string,
  cellules: Cellules,
  participantId: string,
  restaurer = false,
) {
  const { noms, valeurs } = colonnes(tableau, cellules);
  const affectations = [
    ...noms.map((c, i) => `${c} = $${i + 4}`),
    "modifie_par = $3",
    "modifie_le = now()",
    ...(restaurer ? ["supprime_le = NULL"] : []),
  ];
  const { rows } = await pool.query(
    `UPDATE ${tableau} SET ${affectations.join(", ")}
     WHERE id = $1 AND dossier_id = $2 ${restaurer ? "" : "AND supprime_le IS NULL"}
     RETURNING ${SUIVI}, ${COLONNES[tableau].join(", ")}`,
    [id, dossierId, participantId, ...valeurs],
  );
  return rows[0] ? VERS[tableau](rows[0]) : null;
}

/** Suppression douce : la ligne reste en base et peut être restaurée. */
export async function supprimerLigne(dossierId: string, tableau: Tableau, id: string, participantId: string) {
  const { rowCount } = await pool.query(
    `UPDATE ${tableau} SET supprime_le = now(), modifie_par = $3
     WHERE id = $1 AND dossier_id = $2 AND supprime_le IS NULL`,
    [id, dossierId, participantId],
  );
  return (rowCount ?? 0) > 0;
}

/* Section 4 : fichiers */

export async function espaceUtilise(dossierId: string): Promise<number> {
  const { rows } = await pool.query(
    "SELECT coalesce(sum(taille), 0)::bigint AS total FROM fichiers WHERE dossier_id = $1 AND supprime_le IS NULL",
    [dossierId],
  );
  return Number(rows[0].total);
}

export async function ajouterFichier(
  dossierId: string,
  fichier: { categorie: string; nom: string; type_mime: string; contenu: Buffer },
  participantId: string,
): Promise<Fichier> {
  const { rows } = await pool.query(
    `INSERT INTO fichiers (dossier_id, categorie, nom, type_mime, taille, contenu, depose_par)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${FICHIER}`,
    [
      dossierId,
      fichier.categorie,
      fichier.nom,
      fichier.type_mime,
      fichier.contenu.length,
      fichier.contenu,
      participantId,
    ],
  );
  return versFichier(rows[0]);
}

export async function lireFichier(dossierId: string, id: string) {
  if (!estUuid(id)) return null;
  const { rows } = await pool.query<{ nom: string; type_mime: string; contenu: Buffer }>(
    "SELECT nom, type_mime, contenu FROM fichiers WHERE id = $1 AND dossier_id = $2 AND supprime_le IS NULL",
    [id, dossierId],
  );
  return rows[0] ?? null;
}

/** Met un fichier à la corbeille, ou l'en sort. */
export async function basculerFichier(dossierId: string, id: string, supprimer: boolean) {
  if (!estUuid(id)) return null;
  const { rows } = await pool.query(
    `UPDATE fichiers SET supprime_le = ${supprimer ? "now()" : "NULL"}
     WHERE id = $1 AND dossier_id = $2 AND supprime_le IS ${supprimer ? "NULL" : "NOT NULL"}
     RETURNING ${FICHIER}`,
    [id, dossierId],
  );
  return rows[0] ? versFichier(rows[0]) : null;
}
