import { erreur, LIEN_INVALIDE } from "@/lib/api";
import { chargerEtat, trouverDossier } from "@/lib/dossier";

// État complet du questionnaire, relu toutes les 10 s par chaque navigateur ouvert.
export async function GET(_req: Request, ctx: RouteContext<"/api/d/[jeton]">) {
  const { jeton } = await ctx.params;
  const dossier = await trouverDossier(jeton);
  if (!dossier) return erreur(404, LIEN_INVALIDE);
  return Response.json(await chargerEtat(dossier.id), { headers: { "Cache-Control": "no-store" } });
}
