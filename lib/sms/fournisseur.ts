// Interface unique des fournisseurs SMS. Un fournisseur réel se branche en ajoutant un adaptateur
// et une valeur à SMS_PROVIDER (lib/env.ts), sans toucher au reste.
export interface ResultatEnvoi { reference: string | null }

export interface SmsProvider {
  readonly nom: string;
  envoyer(telephone: string, texte: string): Promise<ResultatEnvoi>;
}

export class FournisseurSmsIndisponible extends Error {
  constructor() { super('Aucun fournisseur SMS configuré'); }
}
