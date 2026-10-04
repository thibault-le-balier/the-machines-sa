import { erreur, preparerEcriture } from "@/lib/api";
import { enregistrerReponse } from "@/lib/dossier";
import { validerReponse } from "@/lib/questionnaire";

export async function PUT(req: Request, ctx: RouteContext<"/api/d/[jeton]/reponses/[cle]">) {
  const { jeton, cle } = await ctx.params;
  const c = await preparerEcriture(jeton, req);
  if (c instanceof Response) return c;
  const valeur = validerReponse(cle, c.corps.valeur);
  if (valeur === null) return erreur(400, "Réponse invalide.");
  return Response.json(await enregistrerReponse(c.dossier.id, cle, valeur, c.participantId));
}
