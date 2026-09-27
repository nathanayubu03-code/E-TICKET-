import { env } from '@/lib/env';

// Textes des SMS. Courts : un SMS fait 160 caractères, les accents peuvent réduire la limite.
const site = () => env().NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';

export function smsBillets(titre: string, codes: string[]): string {
  const base = site();
  const liens = base ? codes.map((c) => `${base}/b/${c}`).join(' ') : '';
  return `e-Ticket RDC : paiement reçu, vos billets pour ${titre} sont prêts.${liens ? ' ' + liens : ' Ouvrez « Mes billets » sur le site.'}`;
}

export const smsPayeeSansPlace = (titre: string, code: string) =>
  `e-Ticket RDC : paiement reçu pour ${titre} (commande ${code}), mais les places ont été prises pendant l'attente. Vous serez remboursé. Notre équipe vous contacte.`;

export const smsReclamationRefusee = (code: string) =>
  `e-Ticket RDC : la référence de paiement de la commande ${code} n'a pas pu être vérifiée. Contactez-nous depuis la page Aide.`;

export const smsListeAttente = (titre: string, slug: string) =>
  `e-Ticket RDC : des places sont disponibles pour ${titre}.${site() ? ' ' + site() + '/evenements/' + slug : ''}`;
