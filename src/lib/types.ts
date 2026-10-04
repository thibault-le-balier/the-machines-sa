export type Dossier = { id: string; entreprise: string };

export type Participant = { id: string; nom: string; departement: string; vu_le: string };

export type Valeur = string | string[];

export type Reponse = {
  valeur: Valeur;
  pre_rempli: boolean;
  modifie_par: string | null;
  modifie_le: string;
};

/** Qui a créé ou touché une ligne, et quand. */
export type Suivi = {
  id: string;
  pre_rempli: boolean;
  cree_par: string | null;
  cree_le: string;
  modifie_par: string | null;
  modifie_le: string;
};

export type CellulesOutil = { outil: string; departements: string; usage: string; hebergement: string };
export type CellulesTache = { departement: string; tache: string; heures_semaine: number | null };

export type Outil = Suivi & CellulesOutil;
export type Tache = Suivi & CellulesTache;

export type Tableau = "outils" | "taches";

export type Fichier = {
  id: string;
  categorie: string;
  nom: string;
  type_mime: string;
  taille: number;
  depose_par: string | null;
  depose_le: string;
};

export type Etat = {
  participants: Participant[];
  reponses: Record<string, Reponse>;
  outils: Outil[];
  taches: Tache[];
  fichiers: Fichier[];
};
