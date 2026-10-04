import { PageSimple } from "@/components/PageSimple";

// L'accès se fait uniquement par le lien secret transmis par Bumps.
export default function Accueil() {
  return (
    <PageSimple eyebrow="Accès sur invitation" titre={<>Ce formulaire est <em>privé</em></>}>
      Utilisez le lien personnel qui vous a été transmis pour ouvrir le formulaire de préparation. Si vous
      l’avez égaré, demandez-le à votre interlocuteur chez Bumps.
    </PageSimple>
  );
}
