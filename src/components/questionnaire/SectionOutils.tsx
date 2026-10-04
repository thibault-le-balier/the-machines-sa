"use client";

import { Check, Plus } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { HEBERGEMENTS, PISTES_OUTILS } from "@/lib/questionnaire";
import type { CellulesOutil, Outil } from "@/lib/types";
import type { Actions } from "./types";
import { BoutonAjout, BoutonSupprimer, Cellule, EnteteSection, SuiviLigne, ZoneTexte, cx } from "./ui";

const GRILLE = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.95fr)_44px]";
const COLONNES = ["Outil", "Utilisé par (départements)", "À quoi il sert", "En ligne ou serveur interne"];

export function SectionOutils({ outils, actions }: { outils: Outil[]; actions: Actions }) {
  const [nouvelle, setNouvelle] = useState<string | null>(null);
  const ajouter = (usage?: string) => setNouvelle(actions.ajouterLigne("outils", usage ? { usage } : {}));
  const usages = new Set(outils.map((o) => o.usage.trim().toLowerCase()));

  return (
    <section id="outils" aria-labelledby="titre-outils">
      <EnteteSection id="titre-outils" numero="01" eyebrow="Outils" titre={<>Vos <em>outils</em></>}>
        <p>
          Merci de compléter et de corriger la liste. Nous avons pré-rempli ce que nous savions déjà&nbsp;: si une
          ligne est juste, un clic sur «&nbsp;C’est exact&nbsp;» suffit.
        </p>
      </EnteteSection>

      <div className="mt-8">
        <p className="text-sm font-medium text-ink-2">Pensez notamment à&nbsp;:</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {PISTES_OUTILS.map((piste) => {
            const presente = usages.has(piste.toLowerCase());
            return (
              <li key={piste}>
                <button
                  type="button"
                  onClick={() => ajouter(piste)}
                  className={cx(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors md:min-h-10",
                    presente
                      ? "border-green-pale bg-green-pale/40 text-green"
                      : "border-rule bg-pure text-ink-2 hover:border-ink-3 hover:text-ink",
                  )}
                >
                  {presente ? <Check aria-hidden className="size-3.5" /> : <Plus aria-hidden className="size-3.5" />}
                  {piste}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[13px] text-mute">Un clic sur une piste ajoute la ligne correspondante au tableau.</p>
      </div>

      <div className="mt-8 rounded-xl border border-rule-warm bg-pure">
        <div aria-hidden className={cx("hidden gap-1 border-b border-rule-warm px-3 py-3 lg:grid", GRILLE)}>
          {COLONNES.map((c) => (
            <span key={c} className="eyebrow px-3">
              {c}
            </span>
          ))}
        </div>
        {outils.length ? (
          <ul className="divide-y divide-rule-warm">
            {outils.map((o) => (
              <LigneOutil key={o.id} outil={o} actions={actions} focus={o.id === nouvelle} />
            ))}
          </ul>
        ) : (
          <p className="px-6 py-8 text-mute">Aucun outil pour l’instant.</p>
        )}
      </div>
      <BoutonAjout onClick={() => ajouter()}>Ajouter un outil</BoutonAjout>
    </section>
  );
}

function LigneOutil({ outil, actions, focus }: { outil: Outil; actions: Actions; focus: boolean }) {
  const modifier = (colonne: keyof CellulesOutil) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    actions.modifierCellule("outils", outil.id, colonne, e.target.value);

  return (
    <li className={cx("grid gap-3 p-4 lg:items-start lg:gap-1 lg:px-3 lg:py-2", GRILLE)}>
      <Cellule libelle="Outil">
        <ZoneTexte
          uneLigne
          className="champ champ-cellule font-medium"
          value={outil.outil}
          onChange={modifier("outil")}
          onBlur={actions.vider}
          placeholder="Nom de l’outil"
          autoFocus={focus}
          maxLength={200}
        />
      </Cellule>
      <Cellule libelle="Utilisé par (départements)">
        <input
          className="champ champ-cellule"
          value={outil.departements}
          onChange={modifier("departements")}
          onBlur={actions.vider}
          list="departements"
          placeholder="Ex. Finance, RH"
          maxLength={300}
        />
      </Cellule>
      <Cellule libelle="À quoi il sert">
        <ZoneTexte
          uneLigne
          className="champ champ-cellule"
          value={outil.usage}
          onChange={modifier("usage")}
          onBlur={actions.vider}
          placeholder="Usage principal"
          maxLength={300}
        />
      </Cellule>
      <Cellule libelle="En ligne ou serveur interne">
        <select
          className={cx("champ champ-cellule", !outil.hebergement && "text-mute")}
          value={outil.hebergement}
          onChange={modifier("hebergement")}
        >
          <option value="">À préciser</option>
          {HEBERGEMENTS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </Cellule>
      <div className="flex items-center justify-between gap-3 lg:contents">
        <SuiviLigne
          ligne={outil}
          nomDe={actions.nomDe}
          onConfirmer={() => actions.confirmerLigne("outils", outil.id)}
          className="lg:order-last lg:col-span-5 lg:px-3 lg:pb-1"
        />
        <BoutonSupprimer
          libelle={`Supprimer ${outil.outil || "cette ligne"}`}
          onClick={() => actions.supprimerLigne("outils", outil.id)}
        />
      </div>
    </li>
  );
}
