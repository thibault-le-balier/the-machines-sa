// Petits états propres au navigateur, lus via useSyncExternalStore pour que le
// rendu serveur et l'hydratation restent identiques.

import { useSyncExternalStore } from "react";

/* Identité mémorisée : localStorage, avec repli en mémoire si le stockage est bloqué. */

const EVENEMENT_IDENTITE = "formulaire:identite";
const enMemoire = new Map<string, string>();

function abonnerIdentite(rappel: () => void) {
  window.addEventListener("storage", rappel);
  window.addEventListener(EVENEMENT_IDENTITE, rappel);
  return () => {
    window.removeEventListener("storage", rappel);
    window.removeEventListener(EVENEMENT_IDENTITE, rappel);
  };
}

function lireIdentite(cle: string) {
  try {
    return localStorage.getItem(cle) ?? enMemoire.get(cle) ?? null;
  } catch {
    return enMemoire.get(cle) ?? null;
  }
}

export function memoriserIdentite(cle: string, participantId: string) {
  enMemoire.set(cle, participantId);
  try {
    localStorage.setItem(cle, participantId);
  } catch {}
  window.dispatchEvent(new Event(EVENEMENT_IDENTITE));
}

/** undefined tant que le navigateur n'a pas été lu, null si personne n'est mémorisé. */
export function useIdentiteMemorisee(cle: string): string | null | undefined {
  return useSyncExternalStore(
    abonnerIdentite,
    () => lireIdentite(cle),
    () => undefined,
  );
}

/* Heure courante, rafraîchie toutes les 20 s pour les « il y a 5 min ». */

let maintenant = Date.now();
const abonnes = new Set<() => void>();
let minuteur: ReturnType<typeof setInterval> | undefined;

function abonnerHorloge(rappel: () => void) {
  abonnes.add(rappel);
  maintenant = Date.now();
  minuteur ??= setInterval(() => {
    maintenant = Date.now();
    abonnes.forEach((r) => r());
  }, 20_000);
  return () => {
    abonnes.delete(rappel);
    if (!abonnes.size) {
      clearInterval(minuteur);
      minuteur = undefined;
    }
  };
}

/** null au rendu serveur : les durées relatives n'apparaissent qu'après hydratation. */
export function useMaintenant(): number | null {
  return useSyncExternalStore(
    abonnerHorloge,
    () => maintenant,
    () => null,
  );
}
