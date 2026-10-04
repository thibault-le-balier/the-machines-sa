import Image from "next/image";
import type { ReactNode } from "react";

/** Page d'information minimale : accueil sans lien, lien invalide. */
export function PageSimple({ eyebrow, titre, children }: { eyebrow: string; titre: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 py-8 md:px-6 lg:px-12">
      <Image src="/bumps.svg" alt="Bumps" width={83} height={22} unoptimized priority />
      <div className="flex flex-1 flex-col justify-center py-16">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="titre-1 mt-5 max-w-[18ch]">{titre}</h1>
        <p className="chapo mt-6 max-w-[56ch]">{children}</p>
      </div>
    </main>
  );
}
