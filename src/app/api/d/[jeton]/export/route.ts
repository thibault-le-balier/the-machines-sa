import { erreur, LIEN_INVALIDE, pieceJointe } from "@/lib/api";
import { chargerEtat, trouverDossier } from "@/lib/dossier";
import { exporterMarkdown } from "@/lib/export";

export async function GET(_req: Request, ctx: RouteContext<"/api/d/[jeton]/export">) {
  const { jeton } = await ctx.params;
  const dossier = await trouverDossier(jeton);
  if (!dossier) return erreur(404, LIEN_INVALIDE);
  const maintenant = new Date();
  const markdown = exporterMarkdown(dossier, await chargerEtat(dossier.id), maintenant);
  const slug = dossier.entreprise.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const nom = `preparation-${slug}-${maintenant.toISOString().slice(0, 10)}.md`;
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": pieceJointe(nom),
      "Cache-Control": "no-store",
    },
  });
}
