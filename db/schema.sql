-- Schéma du formulaire de préparation à la journée de conseil.
-- Idempotent : rejoué à chaque déploiement par scripts/migrer.mjs.

-- Un dossier = un questionnaire partagé, accessible par un lien secret.
CREATE TABLE IF NOT EXISTS dossiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jeton       text NOT NULL UNIQUE,
  entreprise  text NOT NULL,
  cree_le     timestamptz NOT NULL DEFAULT now()
);

-- Les personnes qui contribuent. Pas de compte : un nom suffit, dédoublonné
-- sans tenir compte de la casse pour qu'on se retrouve depuis un autre appareil.
CREATE TABLE IF NOT EXISTS participants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id   uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  nom          text NOT NULL,
  departement  text NOT NULL DEFAULT '',
  cree_le      timestamptz NOT NULL DEFAULT now(),
  vu_le        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS participants_nom_unique
  ON participants (dossier_id, lower(nom));

-- Section 2 : une ligne par question. valeur = texte ou liste de textes.
-- pre_rempli et modifie_par vide = proposé par Bumps, pas encore confirmé.
CREATE TABLE IF NOT EXISTS reponses (
  dossier_id   uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  cle          text NOT NULL,
  valeur       jsonb NOT NULL,
  pre_rempli   boolean NOT NULL DEFAULT false,
  modifie_par  uuid REFERENCES participants(id) ON DELETE SET NULL,
  modifie_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dossier_id, cle)
);

-- Section 1 : les outils.
CREATE TABLE IF NOT EXISTS outils (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rang          bigint GENERATED ALWAYS AS IDENTITY,
  dossier_id    uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  outil         text NOT NULL DEFAULT '',
  departements  text NOT NULL DEFAULT '',
  usage         text NOT NULL DEFAULT '',
  hebergement   text NOT NULL DEFAULT '',
  pre_rempli    boolean NOT NULL DEFAULT false,
  cree_par      uuid REFERENCES participants(id) ON DELETE SET NULL,
  cree_le       timestamptz NOT NULL DEFAULT now(),
  modifie_par   uuid REFERENCES participants(id) ON DELETE SET NULL,
  modifie_le    timestamptz NOT NULL DEFAULT now(),
  supprime_le   timestamptz
);
CREATE INDEX IF NOT EXISTS outils_dossier ON outils (dossier_id, rang);

-- Section 3 : ce qui fait perdre du temps.
CREATE TABLE IF NOT EXISTS taches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rang            bigint GENERATED ALWAYS AS IDENTITY,
  dossier_id      uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  departement     text NOT NULL DEFAULT '',
  tache           text NOT NULL DEFAULT '',
  heures_semaine  numeric(5,1) CHECK (heures_semaine BETWEEN 0 AND 168),
  pre_rempli      boolean NOT NULL DEFAULT false,
  cree_par        uuid REFERENCES participants(id) ON DELETE SET NULL,
  cree_le         timestamptz NOT NULL DEFAULT now(),
  modifie_par     uuid REFERENCES participants(id) ON DELETE SET NULL,
  modifie_le      timestamptz NOT NULL DEFAULT now(),
  supprime_le     timestamptz
);
CREATE INDEX IF NOT EXISTS taches_dossier ON taches (dossier_id, rang);

-- Section 4 : les documents joints, stockés dans la base (quelques fichiers
-- de quelques Mo : pas besoin d'un stockage objet à part).
CREATE TABLE IF NOT EXISTS fichiers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id   uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  categorie    text NOT NULL,
  nom          text NOT NULL,
  type_mime    text NOT NULL,
  taille       integer NOT NULL,
  contenu      bytea NOT NULL,
  depose_par   uuid REFERENCES participants(id) ON DELETE SET NULL,
  depose_le    timestamptz NOT NULL DEFAULT now(),
  supprime_le  timestamptz
);
CREATE INDEX IF NOT EXISTS fichiers_dossier ON fichiers (dossier_id, depose_le);
