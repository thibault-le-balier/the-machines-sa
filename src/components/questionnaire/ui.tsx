"use client";

import { Check, CircleDashed, Plus, Trash2 } from "lucide-react";
import { type ReactNode, type TextareaHTMLAttributes, useLayoutEffect, useRef } from "react";
import { formaterDate, formaterDepuis, initiales } from "@/lib/format";
import type { Suivi } from "@/lib/types";
import { useMaintenant } from "./navigateur";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export type NomDe = (participantId: string | null) => string;

export function EnteteSection({
  id,
  numero,
  eyebrow,
  titre,
  children,
}: {
  id: string;
  numero: string;
  eyebrow: string;
  titre: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="max-w-[64ch]">
      <p className="eyebrow">
        <span className="text-green">{numero}</span> / {eyebrow}
      </p>
      <h2 id={id} className="titre-2 mt-4">
        {titre}
      </h2>
      {children && <div className="mt-4 space-y-2 text-ink-2">{children}</div>}
    </header>
  );
}

/** « il y a 5 min » ; la date seule au rendu serveur, identique à l'hydratation. */
export function Depuis({ iso }: { iso: string }) {
  const maintenant = useMaintenant();
  if (maintenant === null) return <time dateTime={iso}>le {formaterDate(iso)}</time>;
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString("fr-CH")}>
      {formaterDepuis(iso, maintenant)}
    </time>
  );
}

export function Avatar({ nom }: { nom: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-green-pale font-mono text-xs text-green"
    >
      {initiales(nom)}
    </span>
  );
}

export function BadgeAVerifier({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-3/60 px-2.5 py-0.5 font-mono text-xs uppercase tracking-[0.08em] text-ink-2">
      <CircleDashed aria-hidden className="size-3.5" />
      {children}
    </span>
  );
}

export function BoutonConfirmer({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center font-medium text-green underline underline-offset-4 hover:text-green-soft lg:min-h-0"
    >
      C’est exact
    </button>
  );
}

/** Qui a ajouté ou vérifié une ligne de tableau, ou l'invitation à la vérifier. */
export function SuiviLigne({
  ligne,
  nomDe,
  onConfirmer,
  className,
}: {
  ligne: Suivi;
  nomDe: NomDe;
  onConfirmer: () => void;
  className?: string;
}) {
  if (ligne.pre_rempli && !ligne.modifie_par) {
    return (
      <div className={cx("flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]", className)}>
        <BadgeAVerifier>À vérifier</BadgeAVerifier>
        <span className="text-mute">Pré-rempli par Bumps</span>
        <BoutonConfirmer onClick={onConfirmer} />
      </div>
    );
  }
  const modifiePar =
    ligne.modifie_par && ligne.modifie_par !== ligne.cree_par ? `, modifié par ${nomDe(ligne.modifie_par)}` : "";
  const auteur = ligne.pre_rempli
    ? `Vérifié par ${nomDe(ligne.modifie_par)}`
    : `Ajouté par ${nomDe(ligne.cree_par)}${modifiePar}`;
  return (
    <p className={cx("text-[13px] text-mute", className)}>
      {auteur} · <Depuis iso={ligne.modifie_le} />
    </p>
  );
}

export function Puce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-12 items-center gap-2 rounded-full border px-4 text-[15px] transition-colors md:min-h-11",
        actif ? "border-charcoal bg-charcoal text-paper" : "border-rule bg-pure text-ink hover:border-ink-3",
      )}
    >
      {actif && <Check aria-hidden className="size-4" />}
      {children}
    </button>
  );
}

function ajusterHauteur(zone: HTMLTextAreaElement) {
  zone.style.height = "auto";
  zone.style.height = `${zone.scrollHeight + zone.offsetHeight - zone.clientHeight}px`;
}

/**
 * Zone de texte qui grandit avec son contenu : rien n'est tronqué, ce qui
 * compte pour relire les lignes pré-remplies. `uneLigne` refuse les retours
 * à la ligne (nom d'outil, usage) : le texte passe à la ligne sans en contenir.
 */
export function ZoneTexte({
  uneLigne,
  className,
  value,
  onKeyDown,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value"> & { value: string; uneLigne?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (ref.current) ajusterHauteur(ref.current);
  }, [value]);

  // La largeur change avec la fenêtre : le nombre de lignes aussi.
  useLayoutEffect(() => {
    const zone = ref.current;
    if (!zone) return;
    let largeur = zone.clientWidth;
    const observateur = new ResizeObserver(() => {
      if (zone.clientWidth === largeur) return;
      largeur = zone.clientWidth;
      ajusterHauteur(zone);
    });
    observateur.observe(zone);
    return () => observateur.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={cx("resize-none overflow-hidden", className)}
      onKeyDown={(e) => {
        if (uneLigne && e.key === "Enter" && !e.nativeEvent.isComposing) e.preventDefault();
        onKeyDown?.(e);
      }}
      {...props}
    />
  );
}

/** Libellé visible sur mobile, réservé aux lecteurs d'écran dans le tableau desktop. */
export function Cellule({ libelle, children, className }: { libelle: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("grid gap-1.5", className)}>
      <span className="text-sm font-medium text-ink-2 lg:sr-only">{libelle}</span>
      {children}
    </label>
  );
}

export function BoutonAjout({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-dashed border-ink-3/50 px-6 text-[15px] font-medium text-ink transition-colors hover:border-ink hover:bg-pure md:w-auto"
    >
      <Plus aria-hidden className="size-4" />
      {children}
    </button>
  );
}

export function BoutonSupprimer({ libelle, onClick }: { libelle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={libelle}
      title={libelle}
      onClick={onClick}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-mute transition-colors hover:bg-paper-cool hover:text-alerte"
    >
      <Trash2 aria-hidden className="size-[18px]" />
    </button>
  );
}
