import { CELLULES, erreur, estTableau, preparerEcriture } from "@/lib/api";
import { creerLigne, estUuid } from "@/lib/dossier";

export async function POST(req: Request, ctx: RouteContext<"/api/d/[jeton]/lignes/[tableau]">) {
  const { jeton, tableau } = await ctx.params;
  if (!estTableau(tableau)) return erreur(404, "Tableau inconnu.");
  const c = await preparerEcriture(jeton, req);
  if (c instanceof Response) return c;
  const cellules = CELLULES[tableau].safeParse(c.corps.cellules ?? {});
  if (!estUuid(c.corps.id) || !cellules.success) return erreur(400, "Ligne invalide.");
  const ligne = await creerLigne(c.dossier.id, tableau, c.corps.id, cellules.data, c.participantId);
  return ligne ? Response.json(ligne, { status: 201 }) : erreur(409, "Cette ligne existe déjà.");
}
