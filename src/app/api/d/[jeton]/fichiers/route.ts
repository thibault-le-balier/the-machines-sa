import { erreur, LIEN_INVALIDE } from "@/lib/api";
import { ajouterFichier, espaceUtilise, participantDuDossier, trouverDossier } from "@/lib/dossier";
import { DOCUMENTS, TAILLE_MAX_FICHIER, TAILLE_MAX_DOSSIER } from "@/lib/questionnaire";

const TROP_GROS = "Fichier trop volumineux : 25 Mo maximum.";

export async function POST(req: Request, ctx: RouteContext<"/api/d/[jeton]/fichiers">) {
  const { jeton } = await ctx.params;
  const dossier = await trouverDossier(jeton);
  if (!dossier) return erreur(404, LIEN_INVALIDE);

  // Refus avant lecture du corps, qui serait sinon chargé entièrement en mémoire.
  if (Number(req.headers.get("content-length") ?? 0) > TAILLE_MAX_FICHIER + 1024 * 1024) {
    return erreur(413, TROP_GROS);
  }
  const form = await req.formData().catch(() => null);
  if (!form) return erreur(400, "Envoi invalide.");

  const participantId = await participantDuDossier(dossier.id, form.get("participantId"));
  if (!participantId) return erreur(401, "Indiquez votre nom pour déposer un fichier.");

  const categorie = form.get("categorie");
  const fichier = form.get("fichier");
  if (typeof categorie !== "string" || !DOCUMENTS.some((d) => d.cle === categorie) || !(fichier instanceof File)) {
    return erreur(400, "Envoi invalide.");
  }
  if (fichier.size === 0) return erreur(400, "Le fichier est vide.");
  if (fichier.size > TAILLE_MAX_FICHIER) return erreur(413, TROP_GROS);
  if ((await espaceUtilise(dossier.id)) + fichier.size > TAILLE_MAX_DOSSIER) {
    return erreur(413, "L’espace réservé aux documents est plein.");
  }

  const enregistre = await ajouterFichier(
    dossier.id,
    {
      categorie,
      nom: nettoyerNom(fichier.name),
      type_mime: fichier.type || "application/octet-stream",
      contenu: Buffer.from(await fichier.arrayBuffer()),
    },
    participantId,
  );
  return Response.json(enregistre, { status: 201 });
}

function nettoyerNom(nom: string) {
  const base = nom.split(/[\\/]/).pop() ?? "";
  // On garde la fin du nom : c'est là qu'est l'extension.
  const propre = base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(-200);
  return propre || "document";
}
