import { env } from '@/lib/env';

// Textes des SMS, en français ou en anglais selon la langue du destinataire (le lingala et le
// swahili reçoivent le français tant que leurs traductions ne sont pas fournies).
// Courts : un SMS fait 160 caractères, les accents peuvent réduire la limite.
const site = () => env().NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
const en = (langue?: string) => langue === 'en';

/** `paye` : montant payé avec sa devise (« 10 USD »), pour que l'acheteur sache quel portefeuille a été débité. */
export function smsBillets(titre: string, codes: string[], langue?: string, paye?: string): string {
  const base = site();
  const liens = base ? codes.map((c) => `${base}/b/${c}`).join(' ') : '';
  return en(langue)
    ? `e-Ticket RDC: payment received${paye ? ` (${paye})` : ''}, your tickets for ${titre} are ready.${liens ? ' ' + liens : ' Open "My tickets" on the website.'}`
    : `e-Ticket RDC : paiement reçu${paye ? ` (${paye})` : ''}, vos billets pour ${titre} sont prêts.${liens ? ' ' + liens : ' Ouvrez « Mes billets » sur le site.'}`;
}

export const smsPayeeSansPlace = (titre: string, code: string, langue?: string) => en(langue)
  ? `e-Ticket RDC: payment received for ${titre} (order ${code}), but the seats were taken while you were paying. You will be refunded. Our team will contact you.`
  : `e-Ticket RDC : paiement reçu pour ${titre} (commande ${code}), mais les places ont été prises pendant l'attente. Vous serez remboursé. Notre équipe vous contacte.`;

export const smsReclamationRefusee = (code: string, langue?: string) => en(langue)
  ? `e-Ticket RDC: the payment reference for order ${code} could not be verified. Contact us from the Help page.`
  : `e-Ticket RDC : la référence de paiement de la commande ${code} n'a pas pu être vérifiée. Contactez-nous depuis la page Aide.`;

export const smsListeAttente = (titre: string, slug: string, langue?: string) => {
  const lien = site() ? ' ' + site() + '/evenements/' + slug : '';
  return en(langue) ? `e-Ticket RDC: seats are available for ${titre}.${lien}` : `e-Ticket RDC : des places sont disponibles pour ${titre}.${lien}`;
};

export const smsNouvelEvenement = (titre: string, ville: string | null, quand: string, slug: string, langue?: string) => {
  const lien = site() ? ' ' + site() + '/evenements/' + slug : '';
  return en(langue)
    ? `e-Ticket RDC: ${titre}${ville ? ' in ' + ville : ''}, ${quand}. Tickets on sale.${lien} Unsubscribe: SMS alerts page.`
    : `e-Ticket RDC : ${titre}${ville ? ' à ' + ville : ''}, ${quand}. Billets en vente.${lien} Désinscription : page Alertes SMS.`;
};

export const smsCodeOtp = (code: string, langue?: string) => en(langue)
  ? `e-Ticket RDC: your code is ${code}. It expires in 5 minutes. Don't share it with anyone.`
  : `e-Ticket RDC : votre code est ${code}. Il expire dans 5 minutes. Ne le donnez à personne.`;
