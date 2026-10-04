// Synchronisation avec le serveur, sans React : appels d'API et file d'enregistrement.

export type Statut = "ok" | "enCours" | "erreur";

export class ErreurApi extends Error {
  constructor(
    readonly statut: number | null,
    message: string,
  ) {
    super(message);
  }
}

export async function appeler<T = void>(url: string, methode = "GET", corps?: unknown): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(url, {
      method: methode,
      cache: "no-store",
      // Laisse partir les derniers enregistrements quand on ferme l'onglet.
      keepalive: methode !== "GET",
      headers: corps === undefined ? undefined : { "Content-Type": "application/json" },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
  } catch {
    throw new ErreurApi(null, "Connexion impossible.");
  }
  if (!reponse.ok) {
    const detail = await reponse.json().catch(() => null);
    throw new ErreurApi(reponse.status, detail?.erreur ?? "Erreur du serveur.");
  }
  return (reponse.status === 204 ? undefined : await reponse.json()) as T;
}

type Tache = () => Promise<void>;

/**
 * File d'enregistrement :
 * - regroupe les frappes rapprochées sur une même clé (délai) ;
 * - sérialise les envois par clé, pour qu'une ancienne valeur n'arrive jamais
 *   après une nouvelle ;
 * - réessaie tant que le réseau ou le serveur fait défaut, abandonne sur un
 *   refus définitif (ligne supprimée entre-temps, valeur invalide).
 */
export class FileEnregistrement {
  private attente = new Map<string, { tache: Tache; minuteur: ReturnType<typeof setTimeout> }>();
  private chaines = new Map<string, Promise<void>>();
  private enVol = 0;
  private echecs = new Set<string>();

  /** Dernière écriture locale ou confirmée : un rafraîchissement plus ancien est périmé. */
  derniereActivite = 0;

  constructor(
    private readonly notifier: (statut: Statut) => void,
    private readonly surNonIdentifie: () => void,
  ) {}

  get occupee() {
    return this.attente.size > 0 || this.enVol > 0;
  }

  toucher() {
    this.derniereActivite = Date.now();
  }

  planifier(cle: string, tache: Tache, delai = 700) {
    this.toucher();
    const existante = this.attente.get(cle);
    if (existante) clearTimeout(existante.minuteur);
    const minuteur = setTimeout(() => {
      this.attente.delete(cle);
      this.lancer(cle, tache);
    }, delai);
    this.attente.set(cle, { tache, minuteur });
    this.maj();
  }

  lancer(cle: string, tache: Tache) {
    this.toucher();
    this.enVol++;
    this.maj();
    const suite = (this.chaines.get(cle) ?? Promise.resolve()).then(async () => {
      try {
        await tache();
        this.echecs.delete(cle);
      } catch (e) {
        const statut = e instanceof ErreurApi ? e.statut : null;
        if (statut === 401) this.surNonIdentifie();
        if (statut !== null && statut !== 401 && statut < 500) {
          this.echecs.delete(cle);
        } else {
          this.echecs.add(cle);
          if (!this.attente.has(cle)) this.planifier(cle, tache, 4000);
        }
      } finally {
        this.enVol--;
        this.toucher();
        this.maj();
      }
    });
    this.chaines.set(cle, suite);
    void suite.then(() => {
      if (this.chaines.get(cle) === suite) this.chaines.delete(cle);
    });
  }

  /** Oublie un envoi pas encore parti (ligne supprimée avant enregistrement). */
  annuler(cle: string) {
    const existante = this.attente.get(cle);
    if (!existante) return;
    clearTimeout(existante.minuteur);
    this.attente.delete(cle);
    this.maj();
  }

  /** Envoie tout de suite ce qui attendait : sortie d'un champ, départ de la page. */
  vider() {
    for (const [cle, { tache, minuteur }] of this.attente) {
      clearTimeout(minuteur);
      this.attente.delete(cle);
      this.lancer(cle, tache);
    }
  }

  /** Pour les opérations hors file (envoi de fichier) : suspend les rafraîchissements. */
  debut() {
    this.enVol++;
    this.toucher();
    this.maj();
  }

  fin() {
    this.enVol--;
    this.toucher();
    this.maj();
  }

  private maj() {
    this.notifier(this.echecs.size ? "erreur" : this.occupee ? "enCours" : "ok");
  }
}
