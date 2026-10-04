"use client";

import { FileText, Paperclip, X } from "lucide-react";
import { useState } from "react";
import { formaterTaille } from "@/lib/format";
import { DOCUMENTS, cleNoteDocument } from "@/lib/questionnaire";
import type { Fichier, Reponse } from "@/lib/types";
import type { Actions, Envoi } from "./types";
import { BoutonSupprimer, Depuis, EnteteSection, ZoneTexte, cx } from "./ui";

type Document = (typeof DOCUMENTS)[number];

export function SectionDocuments({
  fichiers,
  reponses,
  envois,
  lienFichier,
  actions,
}: {
  fichiers: Fichier[];
  reponses: Record<string, Reponse>;
  envois: Envoi[];
  lienFichier: (id: string) => string;
  actions: Actions;
}) {
  return (
    <section id="documents" aria-labelledby="titre-documents">
      <EnteteSection
        id="titre-documents"
        numero="04"
        eyebrow="Documents"
        titre={
          <>
            À joindre <em>si disponible</em>
          </>
        }
      >
        <p>
          Déposez vos fichiers directement ici, 25&nbsp;Mo maximum par fichier. Seules les personnes qui ont ce lien
          peuvent les consulter.
        </p>
      </EnteteSection>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {DOCUMENTS.map((d) => (
          <CarteDocument
            key={d.cle}
            document={d}
            fichiers={fichiers.filter((f) => f.categorie === d.cle)}
            envois={envois.filter((e) => e.categorie === d.cle)}
            note={reponses[cleNoteDocument(d.cle)]}
            lienFichier={lienFichier}
            actions={actions}
          />
        ))}
      </div>
    </section>
  );
}

function CarteDocument({
  document: d,
  fichiers,
  envois,
  note,
  lienFichier,
  actions,
}: {
  document: Document;
  fichiers: Fichier[];
  envois: Envoi[];
  note?: Reponse;
  lienFichier: (id: string) => string;
  actions: Actions;
}) {
  const [survol, setSurvol] = useState(false);
  const joint = fichiers.length > 0;
  const cleNote = cleNoteDocument(d.cle);

  return (
    <article
      onDragOver={(e) => {
        e.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurvol(false);
        actions.deposer(d.cle, Array.from(e.dataTransfer.files));
      }}
      className={cx(
        "flex flex-col rounded-xl border bg-pure p-5 transition-colors md:p-6",
        survol ? "border-green bg-green-pale/20" : "border-rule-warm",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-medium leading-snug">{d.titre}</h3>
        <span className={cx("shrink-0 pt-1 font-mono text-xs uppercase tracking-[0.08em]", joint ? "text-green" : "text-mute")}>
          {joint ? "Joint" : d.cle === "autre" ? "Facultatif" : "En attente"}
        </span>
      </div>
      <p className="mt-2 text-[15px] text-ink-3">{d.description}</p>

      {(joint || envois.length > 0) && (
        <ul className="mt-4 space-y-2">
          {fichiers.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-rule-warm py-1.5 pl-3 pr-1">
              <FileText aria-hidden className="size-5 shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <a
                  href={lienFichier(f.id)}
                  download
                  className="block truncate text-[15px] font-medium text-ink underline-offset-4 hover:underline"
                >
                  {f.nom}
                </a>
                <p className="truncate text-[13px] text-mute">
                  {formaterTaille(f.taille)} · {actions.nomDe(f.depose_par)} · <Depuis iso={f.depose_le} />
                </p>
              </div>
              <BoutonSupprimer libelle={`Retirer ${f.nom}`} onClick={() => actions.retirerFichier(f)} />
            </li>
          ))}
          {envois.map((e) => (
            <li key={e.id} className="rounded-lg border border-rule-warm px-3 py-2.5">
              <div className="flex items-center justify-between gap-3 text-[15px]">
                <span className="truncate">{e.nom}</span>
                {e.erreur ? (
                  <button
                    type="button"
                    aria-label="Masquer ce message"
                    onClick={() => actions.oublierEnvoi(e.id)}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-mute hover:bg-paper-cool"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                ) : (
                  <span className="shrink-0 font-mono text-xs text-mute">{Math.round(e.progression * 100)} %</span>
                )}
              </div>
              {e.erreur ? (
                <p role="alert" className="mt-1 text-[13px] text-alerte">
                  {e.erreur}
                </p>
              ) : (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-cool">
                  <div className="h-full bg-green transition-[width]" style={{ width: `${e.progression * 100}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <label className="mt-4 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-rule bg-paper px-5 text-[15px] font-medium transition-colors hover:border-ink-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green md:self-start">
        <Paperclip aria-hidden className="size-4" />
        {joint ? "Ajouter un fichier" : "Déposer un fichier"}
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            actions.deposer(d.cle, Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>
      <p className="mt-2 hidden text-[13px] text-mute md:block">ou glissez le fichier sur cette carte</p>

      <label className="mt-5 grid gap-1.5">
        <span className="text-sm font-medium text-ink-2">Commentaire</span>
        <ZoneTexte
          className="champ"
          value={typeof note?.valeur === "string" ? note.valeur : ""}
          onChange={(e) => actions.repondre(cleNote, e.target.value)}
          onBlur={actions.vider}
          placeholder="Ex. envoyé par e-mail, apporté le jour J"
          maxLength={500}
        />
      </label>
    </article>
  );
}
