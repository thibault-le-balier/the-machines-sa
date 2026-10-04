"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { Participant } from "@/lib/types";

/**
 * Qui êtes-vous ? Pas de compte : un nom, éventuellement un département.
 * Obligatoire tant que la personne n'est pas identifiée sur ce navigateur.
 */
export function Identification({
  ouverte,
  obligatoire,
  initial,
  onValider,
  onFermer,
}: {
  ouverte: boolean;
  obligatoire: boolean;
  initial: Participant | null;
  onValider: (nom: string, departement: string) => Promise<void>;
  onFermer: () => void;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [departement, setDepartement] = useState(initial?.departement ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const d = dialogue.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal();
    if (!ouverte && d.open) d.close();
  }, [ouverte]);

  async function valider(e: FormEvent) {
    e.preventDefault();
    if (nom.trim().length < 2) {
      setErreur("Indiquez votre prénom et votre nom.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      await onValider(nom.trim(), departement.trim());
    } catch {
      setErreur("Impossible d’enregistrer pour l’instant. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <dialog
      ref={dialogue}
      aria-labelledby="titre-identification"
      onCancel={(e) => {
        e.preventDefault();
        if (!obligatoire) onFermer();
      }}
      // Certains navigateurs ferment quand même sur un double Échap : on rouvre.
      onClose={() => {
        if (ouverte && obligatoire) dialogue.current?.showModal();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-2xl border border-rule-warm bg-pure p-0 text-ink shadow-xl"
    >
      <form onSubmit={valider} className="p-6 md:p-8">
        <p className="eyebrow">{obligatoire ? "Avant de commencer" : "Votre nom"}</p>
        <h2 id="titre-identification" className="mt-3 text-2xl font-medium tracking-tight">
          Qui complète ce formulaire&nbsp;?
        </h2>
        <p className="mt-3 text-[15px] text-ink-3">
          Votre nom s’affiche à côté de vos réponses, pour que chacun sache qui a renseigné quoi. Aucun compte à
          créer.
        </p>

        <label className="mt-6 grid gap-1.5">
          <span className="text-sm font-medium text-ink-2">Prénom et nom</span>
          <input
            className="champ"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoComplete="name"
            autoFocus
            required
            minLength={2}
            maxLength={120}
          />
        </label>
        <label className="mt-4 grid gap-1.5">
          <span className="text-sm font-medium text-ink-2">
            Département ou fonction <span className="font-normal text-mute">(facultatif)</span>
          </span>
          <input
            className="champ"
            value={departement}
            onChange={(e) => setDepartement(e.target.value)}
            list="departements"
            placeholder="Ex. Finance, Bureau d’études"
            maxLength={120}
          />
        </label>

        {erreur && (
          <p role="alert" className="mt-4 text-sm text-alerte">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={envoi}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-charcoal px-6 font-medium text-paper transition-colors hover:bg-ink-2 disabled:opacity-60"
        >
          {envoi ? "Un instant…" : obligatoire ? "Commencer" : "Enregistrer"}
        </button>
        {!obligatoire && (
          <button
            type="button"
            onClick={onFermer}
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-paper-cool"
          >
            Annuler
          </button>
        )}
        <p className="mt-5 text-[13px] text-mute">
          Vous revenez depuis un autre appareil&nbsp;? Saisissez le même nom pour retrouver vos contributions.
        </p>
      </form>
    </dialog>
  );
}
