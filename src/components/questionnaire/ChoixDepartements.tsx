"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { DEPARTEMENTS } from "@/lib/questionnaire";
import { cx } from "./ui";

// La colonne reste un texte « Finance, RH » : l'export et les saisies déjà faites restent lisibles.
const lire = (valeur: string) =>
  valeur
    .split(/[,;]/)
    .map((d) => d.trim())
    .filter(Boolean);

const ecrire = (choisis: string[]) => {
  const connus = DEPARTEMENTS.filter((d) => choisis.includes(d));
  const autres = choisis.filter((d) => !(DEPARTEMENTS as readonly string[]).includes(d));
  return [...connus, ...autres].join(", ");
};

/** Plusieurs départements dans une cellule : liste à cocher, plus un département libre. */
export function ChoixDepartements({
  valeur,
  onChange,
  onFermer,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
  onFermer: () => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [autre, setAutre] = useState("");
  const racine = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const idPanneau = useId();
  const choisis = lire(valeur);
  const libres = choisis.filter((d) => !(DEPARTEMENTS as readonly string[]).includes(d));

  useEffect(() => {
    if (!ouvert) return;
    const fermer = () => {
      setOuvert(false);
      onFermer();
    };
    const auClic = (e: PointerEvent) => {
      if (!racine.current?.contains(e.target as Node)) fermer();
    };
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      fermer();
      bouton.current?.focus();
    };
    document.addEventListener("pointerdown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("pointerdown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert, onFermer]);

  const basculer = (d: string) =>
    onChange(ecrire(choisis.includes(d) ? choisis.filter((c) => c !== d) : [...choisis, d]));

  const ajouterAutre = () => {
    const nom = autre.trim().replace(/[,;]/g, " ");
    if (nom && !choisis.some((c) => c.toLowerCase() === nom.toLowerCase())) onChange(ecrire([...choisis, nom]));
    setAutre("");
  };

  return (
    <div ref={racine} className="relative">
      <button
        ref={bouton}
        type="button"
        aria-expanded={ouvert}
        aria-controls={idPanneau}
        onClick={() => {
          if (ouvert) onFermer();
          setOuvert(!ouvert);
        }}
        className="champ champ-cellule flex items-center justify-between gap-2 text-left"
      >
        {choisis.length ? (
          <span className="flex flex-wrap gap-1">
            {choisis.map((d) => (
              <span key={d} className="rounded-full bg-paper-cool px-2 py-0.5 text-sm text-ink">
                {d}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-[#a3a3a3]">Choisir</span>
        )}
        <ChevronDown aria-hidden className={cx("size-4 shrink-0 text-mute transition-transform", ouvert && "rotate-180")} />
      </button>

      {ouvert && (
        <div
          id={idPanneau}
          className="z-20 mt-1 w-full rounded-lg border border-rule bg-pure p-2 shadow-lg lg:absolute lg:left-0 lg:w-72"
        >
          <p className="px-2 pb-1 pt-1 text-[13px] text-mute">Cochez tous ceux qui l’utilisent.</p>
          <ul className="max-h-72 overflow-y-auto">
            {[...DEPARTEMENTS, ...libres].map((d) => {
              const coche = choisis.includes(d);
              return (
                <li key={d}>
                  <button
                    type="button"
                    aria-pressed={coche}
                    onClick={() => basculer(d)}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 text-left text-[15px] text-ink hover:bg-paper-cool md:min-h-9"
                  >
                    <span
                      aria-hidden
                      className={cx(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        coche ? "border-green bg-green text-paper" : "border-rule",
                      )}
                    >
                      {coche && <Check className="size-3" />}
                    </span>
                    {d}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 flex gap-1 border-t border-rule-warm pt-2">
            <input
              className="champ min-h-10 py-1.5 text-[15px]"
              value={autre}
              onChange={(e) => setAutre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                ajouterAutre();
              }}
              placeholder="Autre département"
              maxLength={60}
            />
            <button
              type="button"
              onClick={ajouterAutre}
              aria-label="Ajouter ce département"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-rule text-ink-2 hover:border-ink-3 hover:text-ink"
            >
              <Plus aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
