// Jeton de rôles signé (HMAC-SHA256), lisible par proxy.ts sans accès à la base.
// Il ne remplace pas la vérification en base faite dans chaque page et action serveur.
// Web Crypto uniquement : fonctionne dans le proxy comme dans Node.

export const COOKIE_ROLES = 'et_roles';

const encodeur = new TextEncoder();
const b64url = (buf: ArrayBuffer) => Buffer.from(buf).toString('base64url');

async function cle(secret: string) {
  return crypto.subtle.importKey('raw', encodeur.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signerRoles(roles: string[], expireMs: number, deuxiemeEtape: boolean, secret: string): Promise<string> {
  const charge = Buffer.from(JSON.stringify({ r: roles, e: expireMs, d: deuxiemeEtape ? 1 : 0 })).toString('base64url');
  const sig = await crypto.subtle.sign('HMAC', await cle(secret), encodeur.encode(charge));
  return `${charge}.${b64url(sig)}`;
}

export async function lireRoles(jeton: string | undefined, secret: string): Promise<{ roles: string[]; deuxiemeEtape: boolean } | null> {
  if (!jeton || !jeton.includes('.')) return null;
  const [charge, sig] = jeton.split('.') as [string, string];
  try {
    const ok = await crypto.subtle.verify('HMAC', await cle(secret), Buffer.from(sig, 'base64url'), encodeur.encode(charge));
    if (!ok) return null;
    const v = JSON.parse(Buffer.from(charge, 'base64url').toString()) as { r: string[]; e: number; d: number };
    if (v.e < Date.now()) return null;
    return { roles: v.r, deuxiemeEtape: v.d === 1 };
  } catch {
    return null;
  }
}
