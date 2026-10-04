import { erreur, LIEN_INVALIDE, pieceJointe, preparerEcriture } from "@/lib/api";
import { basculerFichier, lireFichier, trouverDossier } from "@/lib/dossier";

type Ctx = RouteContext<"/api/d/[jeton]/fichiers/[id]">;

// Types qu'un navigateur pourrait exécuter s'ils étaient servis tels quels.
const TYPES_ACTIFS = /html|svg|xml|javascript|ecmascript/i;

export async function GET(_req: Request, ctx: Ctx) {
  const { jeton, id } = await ctx.params;
  const dossier = await trouverDossier(jeton);
  if (!dossier) return erreur(404, LIEN_INVALIDE);
  const fichier = await lireFichier(dossier.id, id);
  if (!fichier) return erreur(404, "Fichier introuvable.");
  const type = TYPES_ACTIFS.test(fichier.type_mime) ? "application/octet-stream" : fichier.type_mime;
  return new Response(new Uint8Array(fichier.contenu), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": pieceJointe(fichier.nom),
      "Content-Length": String(fichier.contenu.length),
      "Cache-Control": "private, no-store",
    },
  });
}

/** Annule une suppression. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { jeton, id } = await ctx.params;
  const c = await preparerEcriture(jeton, req);
  if (c instanceof Response) return c;
  if (c.corps.restaurer !== true) return erreur(400, "Requête invalide.");
  const fichier = await basculerFichier(c.dossier.id, id, false);
  return fichier ? Response.json(fichier) : erreur(404, "Fichier introuvable.");
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { jeton, id } = await ctx.params;
  const c = await preparerEcriture(jeton, req);
  if (c instanceof Response) return c;
  const fichier = await basculerFichier(c.dossier.id, id, true);
  return fichier ? new Response(null, { status: 204 }) : erreur(404, "Fichier introuvable.");
}
