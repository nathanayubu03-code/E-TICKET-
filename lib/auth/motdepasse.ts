import { hash, verify } from '@node-rs/argon2';

// argon2id, paramètres recommandés par l'OWASP (19 Mio, 2 passes).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hacherMotDePasse = (motDePasse: string) => hash(motDePasse, OPTIONS);
export async function verifierMotDePasse(empreinte: string, motDePasse: string): Promise<boolean> {
  try {
    return await verify(empreinte, motDePasse);
  } catch {
    return false;
  }
}

/** Mot de passe fort : 12 caractères minimum, avec au moins une lettre et un chiffre. */
export function motDePasseFort(motDePasse: string): boolean {
  return motDePasse.length >= 12 && /[a-zA-Z]/.test(motDePasse) && /\d/.test(motDePasse);
}
