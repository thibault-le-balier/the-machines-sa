import { CELLULES, erreur, estTableau, preparerEcriture } from "@/lib/api";
import { estUuid, modifierLigne, supprimerLigne } from "@/lib/dossier";

type Ctx = RouteContext<"/api/d/[jeton]/lignes/[tableau]/[id]">;

/** Modifie des cellules, confirme une ligne pré-remplie (cellules vides) ou la restaure. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { jeton, tableau, id } = await ctx.params;
  if (!estTableau(tableau) || !estUuid(id)) return erreur(404, "Ligne introuvable.");
  const c = await preparerEcriture(jeton, req);
  if (c instanceof Response) return c;
  const cellules = CELLULES[tableau].safeParse(c.corps.cellules ?? {});
  if (!cellules.success) return erreur(400, "Ligne invalide.");
  const restaurer = c.corps.restaurer === true;
  const ligne = await modifierLigne(c.dossier.id, tableau, id, cellules.data, c.participantId, restaurer);
  return ligne ? Response.json(ligne) : erreur(404, "Cette ligne a été supprimée entre-temps.");
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { jeton, tableau, id } = await ctx.params;
  if (!estTableau(tableau) || !estUuid(id)) return erreur(404, "Ligne introuvable.");
  const c = await preparerEcriture(jeton, req);
  if (c instanceof Response) return c;
  const supprimee = await supprimerLigne(c.dossier.id, tableau, id, c.participantId);
  return supprimee ? new Response(null, { status: 204 }) : erreur(404, "Ligne introuvable.");
}
