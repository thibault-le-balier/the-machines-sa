"use client";

import { Check, CloudOff, Download, LoaderCircle } from "lucide-react";
import Image from "next/image";
import type { Participant } from "@/lib/types";
import type { Statut } from "./synchro";
import { Avatar, cx } from "./ui";

const STATUTS = {
  ok: { Icone: Check, texte: "Enregistré", couleur: "text-mute", icone: "text-green" },
  enCours: { Icone: LoaderCircle, texte: "Enregistrement…", couleur: "text-mute", icone: "animate-spin motion-reduce:animate-none" },
  erreur: { Icone: CloudOff, texte: "Non enregistré, nouvel essai…", couleur: "text-alerte", icone: "" },
} satisfies Record<Statut, unknown>;

export function Entete({
  entreprise,
  statut,
  moi,
  lienExport,
  onIdentite,
}: {
  entreprise: string;
  statut: Statut;
  moi: Participant | null;
  lienExport: string;
  onIdentite: () => void;
}) {
  const { Icone, texte, couleur, icone } = STATUTS[statut];
  return (
    <header className="sticky top-0 z-30 border-b border-rule-warm bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-4 md:px-6 lg:px-12">
        <div className="flex min-w-0 items-center gap-3">
          <Image src="/bumps.svg" alt="Bumps" width={75} height={20} unoptimized priority className="shrink-0" />
          <span aria-hidden className="text-rule">
            /
          </span>
          <span className="truncate font-mono text-xs uppercase tracking-[0.12em] text-ink-3">{entreprise}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-3">
          <p role="status" className={cx("flex items-center gap-1.5 px-2 text-sm", couleur)}>
            <Icone aria-hidden className={cx("size-4", icone)} />
            <span className="sr-only md:not-sr-only">{texte}</span>
          </p>
          {moi && (
            <button
              type="button"
              onClick={onIdentite}
              title="Changer de nom"
              className="flex min-h-11 items-center gap-2 rounded-full px-1.5 transition-colors hover:bg-paper-cool md:border md:border-rule-warm md:bg-pure md:pr-3"
            >
              <Avatar nom={moi.nom} />
              <span className="hidden max-w-[18ch] truncate text-sm md:inline">{moi.nom}</span>
              <span className="sr-only">, changer de nom</span>
            </button>
          )}
          <a
            href={lienExport}
            title="Télécharger une synthèse des réponses (Markdown)"
            className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-ink-2 transition-colors hover:bg-paper-cool"
          >
            <Download aria-hidden className="size-4" />
            <span className="sr-only lg:not-sr-only">Exporter</span>
          </a>
        </div>
      </div>
    </header>
  );
}
