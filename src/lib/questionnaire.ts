// Contenu du formulaire, repris de la page Notion « Formulaire de préparation à
// la journée de conseil ». Partagé entre l'interface, la validation des API et
// l'export : une question ajoutée ici apparaît partout.

import type { Tableau, Valeur } from "./types";

const NBSP = " ";

/** Colonnes modifiables des deux tableaux (sections 1 et 3). */
export const COLONNES = {
  outils: ["outil", "departements", "usage", "hebergement"],
  taches: ["departement", "tache", "heures_semaine"],
} as const satisfies Record<Tableau, readonly string[]>;

/* 01 / Outils */

export const HEBERGEMENTS = ["En ligne", "Serveur interne", "Les deux", "Je ne sais pas"] as const;

export const PISTES_OUTILS = [
  "CRM",
  "Création des offres",
  "CAO 3D et électrique",
  "Données techniques (PDM)",
  "Programmation des automates",
  "Télémaintenance",
  "Ticketing SAV",
  "Pièces de rechange",
  "Gestion de projet",
  "Douane et expédition",
  "Salaires",
  "Fichiers Excel critiques",
  "Chatbot IA",
];

/* 02 / Infrastructure et sécurité */

type Base = { cle: string; libelle: string; aide?: string; sousQuestion?: boolean };

export type Question =
  | (Base & { type: "choix"; options: readonly string[]; cleAutre?: string })
  | (Base & { type: "choix_multiple"; options: readonly string[]; exclusif?: string })
  | (Base & { type: "texte" | "texte_long"; placeholder?: string; suffixe?: string });

export const QUESTIONS_INFRA: Question[] = [
  {
    cle: "environnement",
    type: "choix",
    libelle: "Environnement principal",
    options: ["Microsoft 365", "Google Workspace", "Autre"],
    cleAutre: "environnement_autre",
  },
  {
    cle: "comptes",
    type: "choix",
    libelle: "Comptes utilisateurs gérés dans",
    options: ["Active Directory local", "Entra ID (Azure)", "Les deux", "Je ne sais pas"],
  },
  {
    cle: "stockage",
    type: "texte",
    libelle: "Stockage des documents",
    aide: "Répartition entre le serveur de fichiers local et SharePoint.",
  },
  {
    cle: "stockage_volume",
    type: "texte",
    libelle: "Volume approximatif",
    suffixe: "Go",
    sousQuestion: true,
  },
  {
    cle: "teletravail",
    type: "choix",
    libelle: "Télétravail",
    options: ["Régulier", "Ponctuel", "Non"],
  },
  {
    cle: "acces_distance",
    type: "choix_multiple",
    libelle: "Accès à distance",
    aide: "Plusieurs réponses possibles.",
    options: ["VPN", "Bureau à distance", "OneDrive / SharePoint", "Aucun"],
    exclusif: "Aucun",
  },
  {
    cle: "mfa",
    type: "choix",
    libelle: "Authentification multifacteur (MFA)",
    options: ["Pour tous", "Partiellement", "Non"],
  },
  {
    cle: "prestataire_it",
    type: "texte",
    libelle: "Prestataire IT externe",
    placeholder: "Nom du prestataire, ou « aucun »",
  },
  {
    cle: "prestataire_perimetre",
    type: "texte_long",
    libelle: `Si oui, quel est son périmètre d’intervention${NBSP}?`,
    sousQuestion: true,
  },
  {
    cle: "exigences_clients",
    type: "texte_long",
    libelle: "Exigences clients sur la sécurité ou la localisation des données",
    aide: "Alcatel ou d’autres clients.",
  },
  {
    cle: "donnees_suisse",
    type: "choix",
    libelle: `Les données doivent-elles impérativement rester en Suisse${NBSP}?`,
    options: ["Oui", "De préférence", "Non"],
  },
];

/* 03 / Ce qui vous fait perdre du temps */

export const DEPARTEMENTS = [
  "Direction",
  "Ventes",
  "Bureau d’études",
  "Automation",
  "Production",
  "Achats",
  "Logistique",
  "SAV",
  "Pièces de rechange",
  "Gestion de projet",
  "Finance",
  "RH",
  "IT",
  "Qualité",
  "Marketing",
];

/* 04 / À joindre si disponible */

export const DOCUMENTS = [
  {
    cle: "cas_usage",
    titre: "Vos documents de stratégie IA",
    description: "Les documents préparés pour vos points stratégiques IA : liste des cas d’usage, etc.",
  },
  {
    cle: "organigramme",
    titre: "Organigramme",
    description:
      "Pour comprendre qui fait quoi. Si possible, mettez en évidence les key leaders IA de chaque département.",
  },
  {
    cle: "alcatel",
    titre: "Cahier des charges Alcatel",
    description: "L’extrait relatif à la sécurité et à la traçabilité des données.",
  },
  {
    cle: "autre",
    titre: "Autre document",
    description: "Tout autre document utile pour préparer la journée.",
  },
] as const;

export const cleNoteDocument = (categorie: string) => `doc_${categorie}_note`;

export const TAILLE_MAX_FICHIER = 25 * 1024 * 1024;
export const TAILLE_MAX_DOSSIER = 300 * 1024 * 1024;

/* Validation des réponses de la section 2 (et des champs libres associés) */

type Champ = { type: Question["type"]; options?: readonly string[] };

const CHAMPS = new Map<string, Champ>();
for (const q of QUESTIONS_INFRA) {
  CHAMPS.set(q.cle, { type: q.type, options: "options" in q ? q.options : undefined });
  if (q.type === "choix" && q.cleAutre) CHAMPS.set(q.cleAutre, { type: "texte" });
}
for (const d of DOCUMENTS) CHAMPS.set(cleNoteDocument(d.cle), { type: "texte" });

const LONGUEUR_MAX = { texte: 500, texte_long: 4000 };

/** Renvoie la valeur nettoyée, ou null si la clé ou la valeur est refusée. */
export function validerReponse(cle: string, valeur: unknown): Valeur | null {
  const champ = CHAMPS.get(cle);
  if (!champ) return null;
  switch (champ.type) {
    case "choix":
      return typeof valeur === "string" && (valeur === "" || champ.options!.includes(valeur)) ? valeur : null;
    case "choix_multiple":
      return Array.isArray(valeur) && valeur.every((v) => typeof v === "string" && champ.options!.includes(v))
        ? [...new Set(valeur as string[])]
        : null;
    default:
      return typeof valeur === "string" && valeur.length <= LONGUEUR_MAX[champ.type] ? valeur : null;
  }
}

export function estRemplie(valeur: Valeur | undefined): boolean {
  if (valeur === undefined) return false;
  return Array.isArray(valeur) ? valeur.length > 0 : valeur.trim() !== "";
}
