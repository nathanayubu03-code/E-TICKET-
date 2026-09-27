import type { SmsProvider } from './fournisseur';

// Développement uniquement (interdit en production par lib/env.ts) : n'envoie rien.
// Le message est journalisé dans SmsLog par lib/sms/index.ts et affiché dans la console.
export class SimulationSmsProvider implements SmsProvider {
  readonly nom = 'simulation';
  async envoyer(telephone: string, texte: string) {
    if (process.env.NODE_ENV !== 'test') console.info(`[SMS simulé] ${telephone} : ${texte}`);
    return { reference: `sim-${Date.now().toString(36)}` };
  }
}
