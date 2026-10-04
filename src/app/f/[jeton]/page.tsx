import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Questionnaire } from "@/components/questionnaire/Questionnaire";
import { chargerEtat, trouverDossier } from "@/lib/dossier";

export const dynamic = "force-dynamic";

// Une seule requête par rendu, partagée entre les métadonnées et la page.
const dossierDuJeton = cache(trouverDossier);

export async function generateMetadata({ params }: PageProps<"/f/[jeton]">): Promise<Metadata> {
  const dossier = await dossierDuJeton((await params).jeton);
  return { title: dossier ? `Préparation de la journée de conseil / ${dossier.entreprise}` : "Lien invalide" };
}

export default async function PageFormulaire({ params }: PageProps<"/f/[jeton]">) {
  const { jeton } = await params;
  const dossier = await dossierDuJeton(jeton);
  if (!dossier) notFound();
  return (
    <Questionnaire
      jeton={jeton}
      dossierId={dossier.id}
      entreprise={dossier.entreprise}
      etatInitial={await chargerEtat(dossier.id)}
    />
  );
}
