import { PageSimple } from "@/components/PageSimple";

export default function Introuvable() {
  return (
    <PageSimple eyebrow="Lien invalide" titre={<>Ce lien ne mène <em>nulle part</em></>}>
      Vérifiez que vous avez copié le lien en entier. S’il a été renouvelé, demandez le nouveau à votre
      interlocuteur chez Bumps.
    </PageSimple>
  );
}
