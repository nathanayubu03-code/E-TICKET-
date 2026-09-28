import { createHmac, timingSafeEqual } from 'node:crypto';
import { after } from 'next/server';
import type { Operateur } from '@/lib/db';
import type { CommandeAPayer, EvenementWebhook, PaymentProvider, RequeteBrute, StatutNormalise } from './fournisseur';

// Development et staging uniquement : interdit en production (lib/env.ts refuse de démarrer).
// Réponse de « l'opérateur » selon la fin du numéro, pour tester chaque état de la maquette :
//   …0000 → refusé, …9999 → aucune réponse (délai dépassé), autre → reçu après 4 secondes.
// La réponse arrive par un vrai webhook signé, traité comme celui d'un agrégateur.
export const SIGNATURE_SIMULATION = 'x-simulation-signature';

const secret = () => process.env.SIMULATION_WEBHOOK_SECRET || 'secret-simulation-developpement';
export const signerSimulation = (corps: string) => createHmac('sha256', secret()).update(corps).digest('hex');

export function issueSimulee(numero: string): StatutNormalise | null {
  if (numero.endsWith('0000')) return 'ECHOUE';
  if (numero.endsWith('9999')) return null;
  return 'REUSSI';
}

type Livreur = (corps: string, signature: string) => Promise<void>;
let livreur: Livreur | null = null;
/** Branché par la route webhook au démarrage : la simulation lui remet ses webhooks. */
export function brancherLivraisonSimulation(f: Livreur) { livreur = f; }
export let delaiSimulationMs = 4000;
export function reglerDelaiSimulation(ms: number) { delaiSimulationMs = ms; }

export class SimulationProvider implements PaymentProvider {
  readonly nom = 'simulation';

  async initier(commande: CommandeAPayer, numero: string, operateur: Operateur) {
    const issue = issueSimulee(numero);
    // L'issue est inscrite dans la référence : la vérification planifiée la retrouve si le webhook se perd.
    const reference = `SIM-${commande.paiementId}:${issue === 'REUSSI' ? 'R' : issue === 'ECHOUE' ? 'E' : 'N'}`;
    if (issue && livreur) {
      const corps = JSON.stringify({ id: `evt-${commande.paiementId}`, reference, paiementId: commande.paiementId, statut: issue, montant: commande.montant, devise: commande.devise, operateur });
      const l = livreur;
      const livrer = () => l(corps, signerSimulation(corps));
      const delai = delaiSimulationMs;
      try {
        // Sur Vercel (staging), une minuterie seule ne survit pas à la fin de la requête : after() garde la fonction active.
        after(() => new Promise<void>((fin) => setTimeout(() => { void livrer().finally(fin); }, delai)));
      } catch {
        // Hors requête (tests, scripts) : simple minuterie.
        setTimeout(() => { void livrer(); }, delai);
      }
    }
    return { statut: 'EN_ATTENTE' as const, referenceOperateur: reference, brut: 'PENDING' };
  }

  async verifierStatut(referenceOperateur: string | null) {
    const code = referenceOperateur?.match(/:([REN])$/)?.[1];
    const statut: StatutNormalise = code === 'R' ? 'REUSSI' : code === 'E' ? 'ECHOUE' : 'EN_ATTENTE';
    return { statut, referenceOperateur, brut: statut === 'EN_ATTENTE' ? 'PENDING' : statut };
  }

  async verifierWebhook({ corps, entetes }: RequeteBrute): Promise<EvenementWebhook | null> {
    const recu = Buffer.from(entetes.get(SIGNATURE_SIMULATION) ?? '');
    const attendu = Buffer.from(signerSimulation(corps));
    if (recu.length !== attendu.length || !timingSafeEqual(recu, attendu)) return null;
    const d = JSON.parse(corps) as { id: string; reference: string; paiementId: string; statut: string; montant: number; devise?: string };
    return { cleDedup: d.id, paiementId: d.paiementId, referenceOperateur: d.reference, statut: this.normaliserStatut(d.statut), montant: d.montant, devise: d.devise === 'USD' || d.devise === 'CDF' ? d.devise : null, brut: d.statut };
  }

  normaliserStatut(brut: string): StatutNormalise {
    return (['REUSSI', 'ECHOUE', 'EXPIRE'] as const).find((s) => s === brut) ?? 'EN_ATTENTE';
  }
}
