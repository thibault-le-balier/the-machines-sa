import type { CellulesOutil, CellulesTache, Fichier, Tableau, Valeur } from "@/lib/types";
import type { NomDe } from "./ui";

/** Fichier en cours d'envoi (ou dont l'envoi a échoué). */
export type Envoi = { id: string; categorie: string; nom: string; progression: number; erreur?: string };

/** Tout ce que les sections peuvent faire sur le questionnaire. */
export type Actions = {
  nomDe: NomDe;
  repondre: (cle: string, valeur: Valeur, delai?: number) => void;
  ajouterLigne: (tableau: Tableau, cellules?: Partial<CellulesOutil> | Partial<CellulesTache>) => string | null;
  modifierCellule: (tableau: Tableau, id: string, colonne: string, valeur: string | number | null) => void;
  confirmerLigne: (tableau: Tableau, id: string) => void;
  supprimerLigne: (tableau: Tableau, id: string) => void;
  deposer: (categorie: string, fichiers: File[]) => void;
  retirerFichier: (fichier: Fichier) => void;
  oublierEnvoi: (id: string) => void;
  /** À appeler en sortie de champ : enregistre sans attendre la fin du délai. */
  vider: () => void;
};
