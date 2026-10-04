"use client";

import { CornerDownRight } from "lucide-react";
import { QUESTIONS_INFRA, estRemplie, type Question } from "@/lib/questionnaire";
import type { Reponse, Valeur } from "@/lib/types";
import type { Actions } from "./types";
import { BadgeAVerifier, BoutonConfirmer, Depuis, EnteteSection, Puce, ZoneTexte, cx } from "./ui";

// Chaque sous-question s'affiche avec la question qui la précède.
const GROUPES = QUESTIONS_INFRA.reduce<Question[][]>((groupes, q) => {
  if (q.sousQuestion && groupes.length) groupes[groupes.length - 1].push(q);
  else groupes.push([q]);
  return groupes;
}, []);

const texte = (valeur: Valeur | undefined) => (typeof valeur === "string" ? valeur : "");

export function SectionInfra({ reponses, actions }: { reponses: Record<string, Reponse>; actions: Actions }) {
  return (
    <section id="infrastructure" aria-labelledby="titre-infrastructure">
      <EnteteSection
        id="titre-infrastructure"
        numero="02"
        eyebrow="Infrastructure"
        titre={
          <>
            Infrastructure et <em>sécurité</em>
          </>
        }
      >
        <p>
          Si une question ne relève pas de votre périmètre, laissez-la à la personne concernée&nbsp;: elle verra vos
          réponses en ouvrant le lien.
        </p>
      </EnteteSection>

      <div className="mt-8 divide-y divide-rule-warm rounded-xl border border-rule-warm bg-pure px-4 md:px-6 lg:px-8">
        {GROUPES.map((groupe) => (
          <div key={groupe[0].cle} className="space-y-6 py-6 lg:py-7">
            {groupe.map((q) => (
              <BlocQuestion key={q.cle} question={q} reponses={reponses} actions={actions} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function BlocQuestion({
  question: q,
  reponses,
  actions,
}: {
  question: Question;
  reponses: Record<string, Reponse>;
  actions: Actions;
}) {
  const idLibelle = `question-${q.cle}`;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
      <div className={cx(q.sousQuestion && "flex gap-2")}>
        {q.sousQuestion && <CornerDownRight aria-hidden className="mt-1 size-4 shrink-0 text-mute" />}
        <div>
          <p id={idLibelle} className="font-medium leading-snug text-ink">
            {q.libelle}
          </p>
          {q.aide && <p className="mt-1 text-[15px] text-mute">{q.aide}</p>}
        </div>
      </div>
      <div className="min-w-0">
        <Controle question={q} idLibelle={idLibelle} reponses={reponses} actions={actions} />
        <SuiviReponse cle={q.cle} reponse={reponses[q.cle]} actions={actions} />
      </div>
    </div>
  );
}

function Controle({
  question: q,
  idLibelle,
  reponses,
  actions,
}: {
  question: Question;
  idLibelle: string;
  reponses: Record<string, Reponse>;
  actions: Actions;
}) {
  const valeur = reponses[q.cle]?.valeur;

  if (q.type === "choix") {
    return (
      <>
        <div role="group" aria-labelledby={idLibelle} className="flex flex-wrap gap-2">
          {q.options.map((option) => (
            <Puce
              key={option}
              actif={valeur === option}
              // Un second clic désélectionne.
              onClick={() => actions.repondre(q.cle, valeur === option ? "" : option, 0)}
            >
              {option}
            </Puce>
          ))}
        </div>
        {q.cleAutre && valeur === "Autre" && (
          <ZoneTexte
            uneLigne
            className="champ mt-3"
            aria-label="Précisez votre environnement"
            placeholder="Précisez"
            value={texte(reponses[q.cleAutre]?.valeur)}
            onChange={(e) => actions.repondre(q.cleAutre!, e.target.value)}
            onBlur={actions.vider}
            maxLength={500}
          />
        )}
      </>
    );
  }

  if (q.type === "choix_multiple") {
    const choisis = Array.isArray(valeur) ? valeur : [];
    const basculer = (option: string) => {
      const suivants = choisis.includes(option)
        ? choisis.filter((c) => c !== option)
        : option === q.exclusif
          ? [option]
          : [...choisis.filter((c) => c !== q.exclusif), option];
      actions.repondre(
        q.cle,
        q.options.filter((o) => suivants.includes(o)),
        300,
      );
    };
    return (
      <div role="group" aria-labelledby={idLibelle} className="flex flex-wrap gap-2">
        {q.options.map((option) => (
          <Puce key={option} actif={choisis.includes(option)} onClick={() => basculer(option)}>
            {option}
          </Puce>
        ))}
      </div>
    );
  }

  if (q.type === "texte_long") {
    return (
      <ZoneTexte
        className="champ min-h-28"
        aria-labelledby={idLibelle}
        value={texte(valeur)}
        onChange={(e) => actions.repondre(q.cle, e.target.value)}
        onBlur={actions.vider}
        maxLength={4000}
      />
    );
  }

  if (q.suffixe) {
    return (
      <div className="flex items-center gap-3">
        <input
          className="champ max-w-40"
          aria-labelledby={idLibelle}
          value={texte(valeur)}
          onChange={(e) => actions.repondre(q.cle, e.target.value)}
          onBlur={actions.vider}
          inputMode="decimal"
          maxLength={500}
        />
        <span className="text-ink-3">{q.suffixe}</span>
      </div>
    );
  }

  return (
    <ZoneTexte
      uneLigne
      className="champ"
      aria-labelledby={idLibelle}
      value={texte(valeur)}
      onChange={(e) => actions.repondre(q.cle, e.target.value)}
      onBlur={actions.vider}
      placeholder={q.placeholder}
      maxLength={500}
    />
  );
}

function SuiviReponse({ cle, reponse, actions }: { cle: string; reponse?: Reponse; actions: Actions }) {
  if (!reponse || !estRemplie(reponse.valeur)) return null;
  if (reponse.pre_rempli && !reponse.modifie_par) {
    return (
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <BadgeAVerifier>À confirmer</BadgeAVerifier>
        <span className="text-mute">Pré-rempli par Bumps</span>
        <BoutonConfirmer onClick={() => actions.repondre(cle, reponse.valeur, 0)} />
      </div>
    );
  }
  return (
    <p className="mt-2.5 text-[13px] text-mute">
      {reponse.pre_rempli ? "Vérifié" : "Répondu"} par {actions.nomDe(reponse.modifie_par)} ·{" "}
      <Depuis iso={reponse.modifie_le} />
    </p>
  );
}
