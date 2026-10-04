// Briques communes aux route handlers de /api/d/[jeton].

import { z } from "zod";
import { participantDuDossier, trouverDossier } from "./dossier";
import { HEBERGEMENTS } from "./questionnaire";
import type { Dossier, Tableau } from "./types";

export const erreur = (statut: number, message: string) =>
  Response.json({ erreur: message }, { status: statut });

export const LIEN_INVALIDE = "Ce lien n’est pas valide.";

export const estTableau = (t: string): t is Tableau => t === "outils" || t === "taches";

export const CELLULES = {
  outils: z
    .strictObject({
      outil: z.string().max(200),
      departements: z.string().max(300),
      usage: z.string().max(300),
      hebergement: z.enum(["", ...HEBERGEMENTS]),
    })
    .partial(),
  taches: z
    .strictObject({
      departement: z.string().max(200),
      tache: z.string().max(2000),
      heures_semaine: z.number().min(0).max(168).nullable(),
    })
    .partial(),
};

/** En-tête Content-Disposition qui force le téléchargement, nom accentué compris. */
export function pieceJointe(nom: string) {
  const ascii = nom.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(nom).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

type Contexte = { dossier: Dossier; participantId: string; corps: Record<string, unknown> };

/**
 * Pour toute écriture : le lien doit être valide et la personne identifiée sur
 * ce dossier. Renvoie soit le contexte, soit la réponse d'erreur à renvoyer.
 */
export async function preparerEcriture(jeton: string, req: Request): Promise<Contexte | Response> {
  const dossier = await trouverDossier(jeton);
  if (!dossier) return erreur(404, LIEN_INVALIDE);
  const corps: unknown = await req.json().catch(() => null);
  if (!corps || typeof corps !== "object" || Array.isArray(corps)) return erreur(400, "Requête invalide.");
  const participantId = await participantDuDossier(dossier.id, (corps as Record<string, unknown>).participantId);
  if (!participantId) return erreur(401, "Indiquez votre nom pour modifier le formulaire.");
  return { dossier, participantId, corps: corps as Record<string, unknown> };
}
