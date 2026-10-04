import { z } from "zod";
import { erreur, LIEN_INVALIDE } from "@/lib/api";
import { identifier, trouverDossier } from "@/lib/dossier";

const Identite = z.object({
  nom: z.string().trim().min(2).max(120),
  departement: z.string().trim().max(120).default(""),
});

export async function POST(req: Request, ctx: RouteContext<"/api/d/[jeton]/participants">) {
  const { jeton } = await ctx.params;
  const dossier = await trouverDossier(jeton);
  if (!dossier) return erreur(404, LIEN_INVALIDE);
  const identite = Identite.safeParse(await req.json().catch(() => null));
  if (!identite.success) return erreur(400, "Indiquez votre prénom et votre nom.");
  return Response.json(await identifier(dossier.id, identite.data.nom, identite.data.departement));
}
