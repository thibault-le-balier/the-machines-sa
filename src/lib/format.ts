// Mise en forme partagée entre l'interface et l'export (conventions suisses romandes).

const FUSEAU = "Europe/Zurich";

const nombre = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 1 });

export const formaterHeures = (heures: number) => `${nombre.format(heures)} h`;

export function formaterTaille(octets: number) {
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${nombre.format(octets / 1024 / 1024)} Mo`;
}

export const formaterDate = (iso: string) => new Date(iso).toLocaleDateString("fr-CH", { timeZone: FUSEAU });

export const formaterDateHeure = (date: Date) =>
  date.toLocaleString("fr-CH", { timeZone: FUSEAU, dateStyle: "long", timeStyle: "short" });

/** « à l'instant », « il y a 5 min », « hier », « le 28.09.2026 ». */
export function formaterDepuis(iso: string, maintenant: number) {
  const secondes = Math.max(0, (maintenant - new Date(iso).getTime()) / 1000);
  if (secondes < 60) return "à l’instant";
  if (secondes < 3600) return `il y a ${Math.floor(secondes / 60)} min`;
  if (secondes < 86400) return `il y a ${Math.floor(secondes / 3600)} h`;
  if (secondes < 2 * 86400) return "hier";
  return `le ${formaterDate(iso)}`;
}

export function initiales(nom: string) {
  const mots = nom.trim().split(/\s+/);
  return ((mots[0]?.[0] ?? "") + (mots.length > 1 ? mots[mots.length - 1][0] : "")).toUpperCase();
}

export const formaterNombre = (n: number) => nombre.format(n);

/**
 * Lecture tolérante d'une durée saisie à la main : « 2,5 », « 3h », « 1.5 h ».
 * null = champ vide, undefined = saisie illisible.
 */
export function lireHeures(texte: string): number | null | undefined {
  const propre = texte.replace(",", ".").replace(/h(eures?)?$/i, "").trim();
  if (propre === "") return null;
  const valeur = Number(propre);
  return Number.isFinite(valeur) && valeur >= 0 && valeur <= 168 ? Math.round(valeur * 10) / 10 : undefined;
}
