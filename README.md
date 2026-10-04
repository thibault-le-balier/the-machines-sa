# Formulaire de préparation / The Machines SA

Formulaire partagé de recueil du besoin, à remplir par l'équipe de The Machines SA avant la journée de conseil Bumps. Le contenu reprend la page Notion « Formulaire de préparation à la journée de conseil » : outils, infrastructure et sécurité, tâches chronophages, documents à joindre.

## En production

| | |
| --- | --- |
| Site | https://the-machines-formulaire-production.up.railway.app (la racine n'affiche qu'un message « accès sur invitation ») |
| Lien du formulaire | secret, voir « Retrouver ou renouveler le lien » |
| Railway | projet `the-machines-sa` (workspace BUMPSLAB SARL), services `the-machines-formulaire` (Next.js) et `Postgres` (PostgreSQL 18) |
| Région | EU West, Amsterdam (`europe-west4`), pour l'appli comme pour la base |

La base n'est pas exposée sur Internet : l'appli la joint par le réseau privé de Railway.

## Fonctionnement

- **Accès par lien secret**, sans compte : le lien contient un jeton aléatoire de 128 bits. À la première visite, chaque personne indique son nom (et son département si elle le souhaite). Le navigateur s'en souvient ; sur un autre appareil, saisir le même nom retrouve la même personne.
- **Enregistrement automatique**, champ par champ. Chaque écriture touche une seule réponse, une seule ligne ou un seul fichier : deux personnes qui remplissent des parties différentes ne peuvent pas s'écraser.
- **Travail à plusieurs** : la page se rafraîchit toutes les 10 secondes pour afficher les contributions des autres, sans jamais écraser une saisie en cours. Chaque réponse indique qui l'a donnée et quand.
- **Pré-remplissage Bumps** : les outils déjà connus et la répartition du stockage apparaissent « À confirmer » jusqu'à ce que quelqu'un clique « Confirmer » ou les corrige. Les départements d'un outil se cochent dans une liste (plusieurs possibles, plus un département libre).
- **Suppressions réversibles** : bouton « Annuler » pendant quelques secondes, et en base la ligne est seulement marquée (`supprime_le`).
- **Documents** stockés dans Postgres : 25 Mo par fichier, 300 Mo par dossier, toujours servis en téléchargement.
- **Export** : le bouton « Exporter » télécharge toutes les réponses en Markdown (attributions comprises), prêt à relire ou à donner à Claude pour préparer la journée.

## Retrouver ou renouveler le lien

```bash
# Réaffiche le lien, sans rien modifier
railway ssh --service the-machines-formulaire -- npm run dossier:creer

# Génère un nouveau lien ; l'ancien cesse aussitôt de fonctionner
railway ssh --service the-machines-formulaire -- npm run dossier:creer -- --nouveau-jeton
```

Ne pas mettre le lien dans le dépôt : il donne accès aux réponses du client.

## Lire les réponses

Le plus simple est l'export Markdown. Pour interroger la base, le tableau de bord Railway (service Postgres, onglet Data) permet de parcourir les tables et de lancer du SQL :

```sql
SELECT o.outil, o.departements, o.usage, o.hebergement, p.nom AS renseigne_par
FROM outils o
LEFT JOIN participants p ON p.id = coalesce(o.modifie_par, o.cree_par)
WHERE o.supprime_le IS NULL
ORDER BY o.rang;
```

| Table | Contenu |
| --- | --- |
| `dossiers` | un questionnaire (entreprise, jeton du lien) |
| `participants` | les personnes qui ont contribué |
| `outils` | section 1, une ligne par outil |
| `reponses` | section 2 et commentaires des documents, une ligne par question (`valeur` en JSON) |
| `taches` | section 3, une ligne par tâche (`heures_semaine`) |
| `fichiers` | section 4, contenu compris (`contenu` en bytea) |

## Développement local

Prérequis : Node 22 et un Postgres accessible, dont l'URL va dans `.env.local` :

```bash
echo 'DATABASE_URL=postgres://utilisateur:motdepasse@localhost:5432/formulaire' > .env.local
npm install
npm run db:migrer       # crée les tables (idempotent)
npm run dossier:creer   # crée le dossier The Machines SA et affiche un lien local
npm run dev
```

`npm run typecheck` et `npm run lint` doivent passer avant un déploiement.

## Déployer

```bash
railway up --service the-machines-formulaire
```

Le schéma est rejoué à chaque démarrage (`npm start` lance `scripts/migrer.mjs` avant `next start`) : il est idempotent et ne prend qu'une fraction de seconde. Ce n'est pas une commande de pré-déploiement, car lors d'un `railway up` Railway n'a pas appliqué `railway.json` ; ce fichier reste la description voulue de la configuration (région, sonde `/api/sante`, redémarrage).

## Où modifier quoi

| Fichier | Rôle |
| --- | --- |
| `src/lib/questionnaire.ts` | contenu du formulaire : questions, options, pistes d'outils, documents |
| `scripts/creer-dossier.mjs` | pré-remplissage de The Machines SA |
| `db/schema.sql` | schéma de la base |
| `src/lib/dossier.ts` | toutes les requêtes SQL |
| `src/app/api/d/[jeton]/` | API (réponses, lignes, fichiers, export) |
| `src/components/questionnaire/` | interface ; `synchro.ts` porte l'enregistrement automatique |
