"use client";

import { useState } from "react";
import { formaterHeures, formaterNombre, lireHeures } from "@/lib/format";
import type { Tache } from "@/lib/types";
import type { Actions } from "./types";
import { BoutonAjout, BoutonSupprimer, Cellule, EnteteSection, SuiviLigne, ZoneTexte, cx } from "./ui";

const GRILLE = "lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)_160px_44px]";
const COLONNES = ["Département", "Tâche", "Temps par semaine"];

export function SectionTaches({ taches, actions }: { taches: Tache[]; actions: Actions }) {
  const [nouvelle, setNouvelle] = useState<string | null>(null);
  const total = taches.reduce((somme, t) => somme + (t.heures_semaine ?? 0), 0);

  return (
    <section id="temps-perdu" aria-labelledby="titre-temps-perdu">
      <EnteteSection
        id="titre-temps-perdu"
        numero="03"
        eyebrow="Temps perdu"
        titre={
          <>
            Ce qui vous fait <em>perdre du temps</em>
          </>
        }
      >
        <p>Les tâches répétitives ou chronophages, tous départements confondus. Quelques lignes suffisent.</p>
        <p className="text-[15px] text-mute">
          À distinguer des cas d’usage IA&nbsp;: on cherche ici ce qui pèse au quotidien, sans se demander encore
          comment le résoudre.
        </p>
      </EnteteSection>

      <div className="mt-8 rounded-xl border border-rule-warm bg-pure">
        <div aria-hidden className={cx("hidden gap-1 border-b border-rule-warm px-3 py-3 lg:grid", GRILLE)}>
          {COLONNES.map((c) => (
            <span key={c} className="eyebrow px-3">
              {c}
            </span>
          ))}
        </div>
        {taches.length ? (
          <ul className="divide-y divide-rule-warm">
            {taches.map((t) => (
              <LigneTache key={t.id} tache={t} actions={actions} focus={t.id === nouvelle} />
            ))}
          </ul>
        ) : (
          <p className="px-6 py-8 text-mute">Aucune tâche pour l’instant.</p>
        )}
        {total > 0 && (
          <p className="border-t border-rule-warm px-4 py-4 text-right font-mono text-sm text-ink-2 lg:px-6">
            Total estimé&nbsp;: {formaterHeures(total)} par semaine
          </p>
        )}
      </div>
      <BoutonAjout onClick={() => setNouvelle(actions.ajouterLigne("taches"))}>Ajouter une tâche</BoutonAjout>
    </section>
  );
}

function LigneTache({ tache, actions, focus }: { tache: Tache; actions: Actions; focus: boolean }) {
  return (
    <li className={cx("grid gap-3 p-4 lg:items-start lg:gap-1 lg:px-3 lg:py-2", GRILLE)}>
      <Cellule libelle="Département">
        <input
          className="champ champ-cellule"
          value={tache.departement}
          onChange={(e) => actions.modifierCellule("taches", tache.id, "departement", e.target.value)}
          onBlur={actions.vider}
          list="departements"
          placeholder="Ex. SAV"
          autoFocus={focus}
          maxLength={200}
        />
      </Cellule>
      <Cellule libelle="Tâche">
        <ZoneTexte
          className="champ champ-cellule"
          value={tache.tache}
          onChange={(e) => actions.modifierCellule("taches", tache.id, "tache", e.target.value)}
          onBlur={actions.vider}
          placeholder="Ex. ressaisir les commandes dans l’ERP"
          maxLength={2000}
        />
      </Cellule>
      <Cellule libelle="Temps estimé par semaine">
        <ChampHeures
          valeur={tache.heures_semaine}
          onChange={(h) => actions.modifierCellule("taches", tache.id, "heures_semaine", h)}
          onBlur={actions.vider}
        />
      </Cellule>
      <div className="flex items-center justify-between gap-3 lg:contents">
        <SuiviLigne
          ligne={tache}
          nomDe={actions.nomDe}
          onConfirmer={() => actions.confirmerLigne("taches", tache.id)}
          className="lg:order-last lg:col-span-4 lg:px-3 lg:pb-1"
        />
        <BoutonSupprimer
          libelle={`Supprimer ${tache.tache ? `« ${tache.tache.slice(0, 40)} »` : "cette ligne"}`}
          onClick={() => actions.supprimerLigne("taches", tache.id)}
        />
      </div>
    </li>
  );
}

/** Saisie libre (« 2,5 », « 3 h ») ; seule une durée lisible est enregistrée. */
function ChampHeures({
  valeur,
  onChange,
  onBlur,
}: {
  valeur: number | null;
  onChange: (heures: number | null) => void;
  onBlur: () => void;
}) {
  const [saisie, setSaisie] = useState<string | null>(null);
  const affiche = saisie ?? (valeur === null ? "" : formaterNombre(valeur));
  const illisible = saisie !== null && lireHeures(saisie) === undefined;

  return (
    <div className="relative">
      <input
        className={cx("champ champ-cellule pr-20", illisible && "border-alerte lg:border-alerte")}
        inputMode="decimal"
        value={affiche}
        aria-invalid={illisible}
        placeholder="0"
        onFocus={() => setSaisie(affiche)}
        onChange={(e) => {
          setSaisie(e.target.value);
          const heures = lireHeures(e.target.value);
          if (heures !== undefined) onChange(heures);
        }}
        onBlur={() => {
          setSaisie(null);
          onBlur();
        }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-mute">
        h / sem.
      </span>
    </div>
  );
}
