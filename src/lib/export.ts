// Export Markdown du questionnaire : prêt à relire, à archiver ou à donner à
// Claude pour préparer la journée.

import { formaterDate, formaterDateHeure, formaterHeures, formaterTaille } from "./format";
import { DOCUMENTS, QUESTIONS_INFRA, cleNoteDocument } from "./questionnaire";
import type { Dossier, Etat, Reponse, Suivi } from "./types";

const cellule = (texte: string) => texte.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim() || " ";

const tableau = (entetes: string[], lignes: string[][]) => [
  `| ${entetes.join(" | ")} |`,
  `| ${entetes.map(() => "---").join(" | ")} |`,
  ...lignes.map((l) => `| ${l.map(cellule).join(" | ")} |`),
];

export function exporterMarkdown(dossier: Dossier, etat: Etat, maintenant = new Date()): string {
  const nom = (id: string | null) => etat.participants.find((p) => p.id === id)?.nom ?? "personne inconnue";

  const suiviLigne = (l: Suivi) => {
    if (l.pre_rempli) return l.modifie_par ? `Vérifié par ${nom(l.modifie_par)}` : "Pré-rempli par Bumps, non vérifié";
    const auteur = nom(l.cree_par);
    return l.modifie_par && l.modifie_par !== l.cree_par ? `${auteur}, modifié par ${nom(l.modifie_par)}` : auteur;
  };

  const suiviReponse = (r: Reponse) =>
    r.pre_rempli && !r.modifie_par
      ? "pré-rempli par Bumps, non confirmé"
      : `${nom(r.modifie_par)}, ${formaterDate(r.modifie_le)}`;

  const texteReponse = (cle: string) => {
    const r = etat.reponses[cle];
    const valeur = Array.isArray(r?.valeur) ? r.valeur.join(", ") : (r?.valeur ?? "").trim();
    return r && valeur ? `${valeur} _(${suiviReponse(r)})_` : "_sans réponse_";
  };

  const md: string[] = [`# Préparation de la journée de conseil / ${dossier.entreprise}`, ""];
  md.push(`Export du ${formaterDateHeure(maintenant)}.`, "");
  if (etat.participants.length) {
    const liste = etat.participants.map((p) => (p.departement ? `${p.nom} (${p.departement})` : p.nom));
    md.push(`Contributeurs : ${liste.join(", ")}.`, "");
  }

  md.push("## 1. Vos outils", "");
  md.push(
    ...tableau(
      ["Outil", "Utilisé par", "À quoi il sert", "En ligne ou serveur interne", "Suivi"],
      etat.outils.map((o) => [o.outil, o.departements, o.usage, o.hebergement, suiviLigne(o)]),
    ),
    "",
  );

  md.push("## 2. Infrastructure et sécurité", "");
  for (const q of QUESTIONS_INFRA) {
    let ligne = `${q.sousQuestion ? "  " : ""}- **${q.libelle}** : ${texteReponse(q.cle)}`;
    if (q.type === "choix" && q.cleAutre && etat.reponses[q.cle]?.valeur === "Autre") {
      ligne += ` / précision : ${texteReponse(q.cleAutre)}`;
    }
    md.push(ligne);
  }
  md.push("");

  md.push("## 3. Ce qui vous fait perdre du temps", "");
  md.push(
    ...tableau(
      ["Département", "Tâche", "Temps estimé par semaine", "Renseigné par"],
      etat.taches.map((t) => [
        t.departement,
        t.tache,
        t.heures_semaine === null ? "" : formaterHeures(t.heures_semaine),
        suiviLigne(t),
      ]),
    ),
  );
  const total = etat.taches.reduce((s, t) => s + (t.heures_semaine ?? 0), 0);
  md.push("", `Total estimé : ${formaterHeures(total)} par semaine.`, "");

  md.push("## 4. Documents joints", "");
  for (const d of DOCUMENTS) {
    md.push(`### ${d.titre}`, "");
    const fichiers = etat.fichiers.filter((f) => f.categorie === d.cle);
    for (const f of fichiers) {
      md.push(`- ${f.nom} (${formaterTaille(f.taille)}), déposé par ${nom(f.depose_par)} le ${formaterDate(f.depose_le)}`);
    }
    if (!fichiers.length) md.push("- _Aucun document._");
    const note = etat.reponses[cleNoteDocument(d.cle)];
    if (typeof note?.valeur === "string" && note.valeur.trim()) md.push(`- Commentaire : ${texteReponse(cleNoteDocument(d.cle))}`);
    md.push("");
  }

  return md.join("\n");
}
