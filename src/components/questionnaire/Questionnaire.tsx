"use client";

import { useEffect, useRef, useState } from "react";
import {
  COLONNES,
  DEPARTEMENTS,
  DOCUMENTS,
  QUESTIONS_INFRA,
  TAILLE_MAX_FICHIER,
  estRemplie,
} from "@/lib/questionnaire";
import type {
  CellulesOutil,
  CellulesTache,
  Etat,
  Fichier,
  Outil,
  Participant,
  Reponse,
  Suivi,
  Tableau,
  Tache,
  Valeur,
} from "@/lib/types";
import { Entete } from "./Entete";
import { Identification } from "./Identification";
import { memoriserIdentite, useIdentiteMemorisee } from "./navigateur";
import { SectionDocuments } from "./SectionDocuments";
import { SectionInfra } from "./SectionInfra";
import { SectionOutils } from "./SectionOutils";
import { SectionTaches } from "./SectionTaches";
import { appeler, ErreurApi, FileEnregistrement, type Statut } from "./synchro";
import type { Actions, Envoi } from "./types";
import { Avatar, Depuis } from "./ui";

type Props = { jeton: string; dossierId: string; entreprise: string; etatInitial: Etat };
type Annonce = { message: string; annuler?: () => void };

const RAFRAICHISSEMENT_MS = 10_000;

const OUTIL_VIDE: CellulesOutil = { outil: "", departements: "", usage: "", hebergement: "" };
const TACHE_VIDE: CellulesTache = { departement: "", tache: "", heures_semaine: null };

function avecLigne(e: Etat, tableau: Tableau, id: string, modif: Record<string, unknown>): Etat {
  return tableau === "outils"
    ? { ...e, outils: e.outils.map((l) => (l.id === id ? ({ ...l, ...modif } as Outil) : l)) }
    : { ...e, taches: e.taches.map((l) => (l.id === id ? ({ ...l, ...modif } as Tache) : l)) };
}

function inserer<T>(liste: T[], element: T, index: number) {
  const copie = [...liste];
  copie.splice(Math.min(index, copie.length), 0, element);
  return copie;
}

/** Dernière contribution d'une personne de l'équipe (le pré-remplissage ne compte pas). */
function derniereContribution(etat: Etat) {
  const traces = [
    ...Object.values(etat.reponses).map((r) => ({ iso: r.modifie_le, par: r.modifie_par })),
    ...[...etat.outils, ...etat.taches].map((l) => ({ iso: l.modifie_le, par: l.modifie_par })),
    ...etat.fichiers.map((f) => ({ iso: f.depose_le, par: f.depose_par })),
  ].filter((t) => t.par);
  return traces.sort((a, b) => b.iso.localeCompare(a.iso))[0] ?? null;
}

const compter = (n: number, singulier: string, pluriel: string) =>
  n === 0 ? "à compléter" : `${n} ${n > 1 ? pluriel : singulier}`;

export function Questionnaire({ jeton, dossierId, entreprise, etatInitial }: Props) {
  const base = `/api/d/${jeton}`;
  const [etat, setEtat] = useState(etatInitial);
  const [statut, setStatut] = useState<Statut>("ok");
  const [changerIdentite, setChangerIdentite] = useState(false);
  const [nonReconnu, setNonReconnu] = useState(false);
  const [annonce, setAnnonce] = useState<Annonce | null>(null);
  const [envois, setEnvois] = useState<Envoi[]>([]);
  const [file] = useState(() => new FileEnregistrement(setStatut, () => setNonReconnu(true)));

  const cleIdentite = `formulaire:${dossierId}:participant`;
  const idMemorise = useIdentiteMemorisee(cleIdentite);
  const moi = etat.participants.find((p) => p.id === idMemorise) ?? null;
  const identificationOuverte = changerIdentite || nonReconnu || (idMemorise !== undefined && !moi);

  // Lus par les enregistrements différés, au moment où ils partent.
  const moiRef = useRef<string | null>(null);
  const valeursEnAttente = useRef(new Map<string, Valeur>());
  const patchsEnAttente = useRef(new Map<string, Record<string, unknown>>());

  useEffect(() => {
    moiRef.current = moi?.id ?? null;
  }, [moi]);

  // Rafraîchissement : on voit arriver les contributions des autres sans
  // jamais écraser une saisie en cours.
  useEffect(() => {
    let actif = true;
    const rafraichir = async () => {
      if (document.hidden || file.occupee) return;
      const demandeA = Date.now();
      try {
        const frais = await appeler<Etat>(base);
        // Une écriture locale a eu lieu pendant la requête : cette photo est déjà périmée.
        if (actif && !file.occupee && file.derniereActivite < demandeA) setEtat(frais);
      } catch {
        // Hors ligne : nouvel essai au prochain tour.
      }
    };
    const minuteur = setInterval(rafraichir, RAFRAICHISSEMENT_MS);
    const auRetour = () => {
      if (!document.hidden) void rafraichir();
    };
    document.addEventListener("visibilitychange", auRetour);
    window.addEventListener("focus", auRetour);
    return () => {
      actif = false;
      clearInterval(minuteur);
      document.removeEventListener("visibilitychange", auRetour);
      window.removeEventListener("focus", auRetour);
    };
  }, [base, file]);

  // Départ de la page : on envoie ce qui attendait, et on prévient s'il reste à faire.
  useEffect(() => {
    const avantDepart = (e: BeforeUnloadEvent) => {
      if (!file.occupee) return;
      file.vider();
      e.preventDefault();
    };
    const auMasquage = () => file.vider();
    window.addEventListener("beforeunload", avantDepart);
    window.addEventListener("pagehide", auMasquage);
    return () => {
      window.removeEventListener("beforeunload", avantDepart);
      window.removeEventListener("pagehide", auMasquage);
    };
  }, [file]);

  useEffect(() => {
    if (!annonce) return;
    const minuteur = setTimeout(() => setAnnonce(null), 7000);
    return () => clearTimeout(minuteur);
  }, [annonce]);

  /* Identité */

  async function identifier(nom: string, departement: string) {
    const participant = await appeler<Participant>(`${base}/participants`, "POST", { nom, departement });
    file.toucher();
    moiRef.current = participant.id;
    setEtat((e) => ({
      ...e,
      participants: e.participants.some((p) => p.id === participant.id)
        ? e.participants.map((p) => (p.id === participant.id ? participant : p))
        : [...e.participants, participant],
    }));
    memoriserIdentite(cleIdentite, participant.id);
    setChangerIdentite(false);
    setNonReconnu(false);
  }

  const nomDe = (id: string | null) =>
    etat.participants.find((p) => p.id === id)?.nom ?? "une personne de l’équipe";

  /* Section 2 : réponses */

  function repondre(cle: string, valeur: Valeur, delai = 700) {
    const auteur = moiRef.current;
    if (!auteur) return;
    const maintenant = new Date().toISOString();
    setEtat((e) => ({
      ...e,
      reponses: {
        ...e.reponses,
        [cle]: { valeur, pre_rempli: e.reponses[cle]?.pre_rempli ?? false, modifie_par: auteur, modifie_le: maintenant },
      },
    }));
    valeursEnAttente.current.set(cle, valeur);
    file.planifier(
      `reponse:${cle}`,
      async () => {
        const envoyee = valeursEnAttente.current.get(cle);
        if (envoyee === undefined) return;
        const r = await appeler<Reponse>(`${base}/reponses/${cle}`, "PUT", {
          participantId: moiRef.current,
          valeur: envoyee,
        });
        if (valeursEnAttente.current.get(cle) === envoyee) valeursEnAttente.current.delete(cle);
        // On garde la valeur locale, qui a pu changer depuis l'envoi.
        setEtat((e) => ({
          ...e,
          reponses: { ...e.reponses, [cle]: { ...r, valeur: e.reponses[cle]?.valeur ?? r.valeur } },
        }));
      },
      delai,
    );
  }

  /* Sections 1 et 3 : lignes */

  function majSuivi(tableau: Tableau, serveur: Suivi) {
    const { id, pre_rempli, cree_par, cree_le, modifie_par, modifie_le } = serveur;
    setEtat((e) => avecLigne(e, tableau, id, { pre_rempli, cree_par, cree_le, modifie_par, modifie_le }));
  }

  // Les modifications d'une ligne s'accumulent et partent ensemble.
  function enregistrementLigne(tableau: Tableau, id: string) {
    const cle = `${tableau}:${id}`;
    return async () => {
      const patch = patchsEnAttente.current.get(cle);
      if (!patch) return;
      try {
        const ligne = await appeler<Suivi>(`${base}/lignes/${tableau}/${id}`, "PATCH", {
          participantId: moiRef.current,
          cellules: patch,
        });
        const actuel = patchsEnAttente.current.get(cle);
        if (actuel) {
          for (const colonne of Object.keys(patch)) {
            if (Object.is(actuel[colonne], patch[colonne])) delete actuel[colonne];
          }
          if (!Object.keys(actuel).length) patchsEnAttente.current.delete(cle);
        }
        majSuivi(tableau, ligne);
      } catch (e) {
        if (e instanceof ErreurApi && e.statut === 404) patchsEnAttente.current.delete(cle);
        throw e;
      }
    };
  }

  function ajouterLigne(tableau: Tableau, cellules: Partial<CellulesOutil> | Partial<CellulesTache> = {}) {
    const auteur = moiRef.current;
    if (!auteur) return null;
    const id = crypto.randomUUID();
    const maintenant = new Date().toISOString();
    const suivi: Suivi = {
      id,
      pre_rempli: false,
      cree_par: auteur,
      cree_le: maintenant,
      modifie_par: auteur,
      modifie_le: maintenant,
    };
    setEtat((e) =>
      tableau === "outils"
        ? { ...e, outils: [...e.outils, { ...suivi, ...OUTIL_VIDE, ...(cellules as Partial<CellulesOutil>) }] }
        : { ...e, taches: [...e.taches, { ...suivi, ...TACHE_VIDE, ...(cellules as Partial<CellulesTache>) }] },
    );
    file.lancer(`${tableau}:${id}`, async () => {
      const ligne = await appeler<Suivi>(`${base}/lignes/${tableau}`, "POST", {
        participantId: moiRef.current,
        id,
        cellules,
      });
      majSuivi(tableau, ligne);
    });
    return id;
  }

  function modifierCellule(tableau: Tableau, id: string, colonne: string, valeur: string | number | null) {
    const auteur = moiRef.current;
    if (!auteur) return;
    const maintenant = new Date().toISOString();
    setEtat((e) => avecLigne(e, tableau, id, { [colonne]: valeur, modifie_par: auteur, modifie_le: maintenant }));
    const cle = `${tableau}:${id}`;
    patchsEnAttente.current.set(cle, { ...patchsEnAttente.current.get(cle), [colonne]: valeur });
    file.planifier(cle, enregistrementLigne(tableau, id));
  }

  /** Une ligne pré-remplie est exacte : on enregistre qui l'a vérifiée. */
  function confirmerLigne(tableau: Tableau, id: string) {
    const auteur = moiRef.current;
    if (!auteur) return;
    setEtat((e) => avecLigne(e, tableau, id, { modifie_par: auteur, modifie_le: new Date().toISOString() }));
    const cle = `${tableau}:${id}`;
    patchsEnAttente.current.set(cle, { ...patchsEnAttente.current.get(cle) });
    file.planifier(cle, enregistrementLigne(tableau, id), 0);
  }

  function supprimerLigne(tableau: Tableau, id: string) {
    const lignes: (Outil | Tache)[] = etat[tableau];
    const index = lignes.findIndex((l) => l.id === id);
    if (index < 0 || !moiRef.current) return;
    const ligne = lignes[index];
    setEtat((e) =>
      tableau === "outils"
        ? { ...e, outils: e.outils.filter((l) => l.id !== id) }
        : { ...e, taches: e.taches.filter((l) => l.id !== id) },
    );
    const cle = `${tableau}:${id}`;
    file.annuler(cle);
    patchsEnAttente.current.delete(cle);
    file.lancer(cle, async () => {
      await appeler(`${base}/lignes/${tableau}/${id}`, "DELETE", { participantId: moiRef.current });
    });
    setAnnonce({
      message: tableau === "outils" ? "Outil supprimé." : "Tâche supprimée.",
      annuler: () => restaurerLigne(tableau, ligne, index),
    });
  }

  function restaurerLigne(tableau: Tableau, ligne: Outil | Tache, index: number) {
    setEtat((e) =>
      tableau === "outils"
        ? { ...e, outils: inserer(e.outils, ligne as Outil, index) }
        : { ...e, taches: inserer(e.taches, ligne as Tache, index) },
    );
    // La ligne est renvoyée en entier : des saisies pas encore parties ne sont pas perdues.
    const cellules = Object.fromEntries(COLONNES[tableau].map((c) => [c, (ligne as Record<string, unknown>)[c]]));
    file.lancer(`${tableau}:${ligne.id}`, async () => {
      const restauree = await appeler<Suivi>(`${base}/lignes/${tableau}/${ligne.id}`, "PATCH", {
        participantId: moiRef.current,
        restaurer: true,
        cellules,
      });
      majSuivi(tableau, restauree);
    });
  }

  /* Section 4 : fichiers */

  function deposer(categorie: string, fichiers: File[]) {
    for (const fichier of fichiers) {
      const id = crypto.randomUUID();
      if (fichier.size > TAILLE_MAX_FICHIER) {
        setEnvois((l) => [
          ...l,
          { id, categorie, nom: fichier.name, progression: 0, erreur: "Trop volumineux : 25 Mo maximum." },
        ]);
        continue;
      }
      setEnvois((l) => [...l, { id, categorie, nom: fichier.name, progression: 0 }]);

      const donnees = new FormData();
      donnees.set("participantId", moiRef.current ?? "");
      donnees.set("categorie", categorie);
      donnees.set("fichier", fichier);

      // XMLHttpRequest plutôt que fetch : lui seul donne la progression de l'envoi.
      const xhr = new XMLHttpRequest();
      const terminer = (resultat: { fichier?: Fichier; erreur?: string }) => {
        file.fin();
        const ajoute = resultat.fichier;
        if (ajoute) {
          setEtat((e) => ({ ...e, fichiers: [...e.fichiers, ajoute] }));
          setEnvois((l) => l.filter((x) => x.id !== id));
        } else {
          setEnvois((l) => l.map((x) => (x.id === id ? { ...x, erreur: resultat.erreur } : x)));
        }
      };
      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        setEnvois((l) => l.map((x) => (x.id === id ? { ...x, progression: ev.loaded / ev.total } : x)));
      };
      xhr.onload = () => {
        let corps: { erreur?: string } | null = null;
        try {
          corps = JSON.parse(xhr.responseText);
        } catch {}
        if (xhr.status === 201) return terminer({ fichier: corps as Fichier });
        if (xhr.status === 401) setNonReconnu(true);
        terminer({ erreur: corps?.erreur ?? "L’envoi a échoué. Réessayez." });
      };
      xhr.onerror = () => terminer({ erreur: "Connexion impossible. Réessayez." });
      file.debut();
      xhr.open("POST", `${base}/fichiers`);
      xhr.send(donnees);
    }
  }

  function retirerFichier(fichier: Fichier) {
    if (!moiRef.current) return;
    const cle = `fichier:${fichier.id}`;
    setEtat((e) => ({ ...e, fichiers: e.fichiers.filter((f) => f.id !== fichier.id) }));
    file.lancer(cle, async () => {
      await appeler(`${base}/fichiers/${fichier.id}`, "DELETE", { participantId: moiRef.current });
    });
    setAnnonce({
      message: `« ${fichier.nom} » retiré.`,
      annuler: () => {
        setEtat((e) => ({
          ...e,
          fichiers: [...e.fichiers, fichier].sort((a, b) => a.depose_le.localeCompare(b.depose_le)),
        }));
        file.lancer(cle, async () => {
          await appeler(`${base}/fichiers/${fichier.id}`, "PATCH", { participantId: moiRef.current, restaurer: true });
        });
      },
    });
  }

  const actions: Actions = {
    nomDe,
    repondre,
    ajouterLigne,
    modifierCellule,
    confirmerLigne,
    supprimerLigne,
    deposer,
    retirerFichier,
    oublierEnvoi: (id) => setEnvois((l) => l.filter((x) => x.id !== id)),
    vider: () => file.vider(),
  };

  /* Avancement, pour le sommaire */

  const principales = QUESTIONS_INFRA.filter((q) => !q.sousQuestion);
  const repondues = principales.filter((q) => {
    const r = etat.reponses[q.cle];
    return r && estRemplie(r.valeur) && !(r.pre_rempli && !r.modifie_par);
  }).length;
  const attendus = DOCUMENTS.filter((d) => d.cle !== "autre");
  const joints = attendus.filter((d) => etat.fichiers.some((f) => f.categorie === d.cle)).length;
  const sommaire = [
    { ancre: "outils", numero: "01", titre: "Vos outils", avancement: compter(etat.outils.length, "outil", "outils") },
    {
      ancre: "infrastructure",
      numero: "02",
      titre: "Infrastructure et sécurité",
      avancement: `${repondues} / ${principales.length} réponses`,
    },
    {
      ancre: "temps-perdu",
      numero: "03",
      titre: "Ce qui vous fait perdre du temps",
      avancement: compter(etat.taches.length, "tâche", "tâches"),
    },
    { ancre: "documents", numero: "04", titre: "À joindre", avancement: `${joints} / ${attendus.length} documents` },
  ];

  const derniere = derniereContribution(etat);

  return (
    <>
      <Entete
        entreprise={entreprise}
        statut={statut}
        moi={moi}
        lienExport={`${base}/export`}
        onIdentite={() => setChangerIdentite(true)}
      />

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 md:px-6 lg:px-12">
        <section className="border-b border-rule-warm pb-12 pt-12 md:pt-16 lg:pb-16 lg:pt-24">
          <p className="eyebrow">Préparation / Journée de conseil</p>
          <h1 className="titre-1 mt-5 max-w-[14ch]">
            Préparons votre <em>journée de conseil</em>
          </h1>
          <p className="chapo mt-6 max-w-[62ch]">
            Ce questionnaire est partagé avec l’équipe de {entreprise}. Chacun complète ce qu’il connaît, quand il
            le souhaite&nbsp;: les réponses s’enregistrent automatiquement et restent accessibles depuis ce lien.
          </p>
          <div className="mt-10 flex flex-col gap-8 md:flex-row md:gap-16">
            <div>
              <p className="eyebrow">Contributeurs</p>
              {etat.participants.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {etat.participants.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 rounded-full border border-rule-warm bg-pure py-1 pl-1 pr-3 text-sm"
                    >
                      <Avatar nom={p.nom} />
                      {p.nom}
                      {p.departement && <span className="text-mute">· {p.departement}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-mute">Personne n’a encore contribué.</p>
              )}
            </div>
            {derniere && (
              <div className="shrink-0">
                <p className="eyebrow">Dernière modification</p>
                <p className="mt-3 text-sm text-ink-2">
                  {nomDe(derniere.par)}, <Depuis iso={derniere.iso} />
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-16 py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-16">
          <nav aria-label="Sommaire" className="hidden lg:block">
            <ol className="sticky top-24 space-y-1">
              {sommaire.map((s) => (
                <li key={s.ancre}>
                  <a href={`#${s.ancre}`} className="flex gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-paper-cool">
                    <span className="pt-0.5 font-mono text-xs text-green">{s.numero}</span>
                    <span>
                      <span className="block text-[15px] leading-snug text-ink">{s.titre}</span>
                      <span className="mt-0.5 block font-mono text-xs text-mute">{s.avancement}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 space-y-20 lg:space-y-28">
            <SectionOutils outils={etat.outils} actions={actions} />
            <SectionInfra reponses={etat.reponses} actions={actions} />
            <SectionTaches taches={etat.taches} actions={actions} />
            <SectionDocuments
              fichiers={etat.fichiers}
              reponses={etat.reponses}
              envois={envois}
              lienFichier={(id) => `${base}/fichiers/${id}`}
              actions={actions}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-rule-warm">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-8 text-sm text-mute md:flex-row md:justify-between md:px-6 lg:px-12">
          <p>Formulaire préparé par Bumps pour {entreprise}.</p>
          <p>Enregistrement automatique · Données hébergées dans l’Union européenne (Pays-Bas)</p>
        </div>
      </footer>

      <datalist id="departements">
        {DEPARTEMENTS.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      <Identification
        key={identificationOuverte ? "ouverte" : "fermee"}
        ouverte={identificationOuverte}
        obligatoire={!moi}
        initial={moi}
        onValider={identifier}
        onFermer={() => setChangerIdentite(false)}
      />

      {annonce && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-4 rounded-xl bg-charcoal px-5 py-2 text-[15px] text-paper shadow-lg"
        >
          <span>{annonce.message}</span>
          {annonce.annuler && (
            <button
              type="button"
              className="min-h-11 shrink-0 font-medium underline underline-offset-4"
              onClick={() => {
                annonce.annuler?.();
                setAnnonce(null);
              }}
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </>
  );
}
