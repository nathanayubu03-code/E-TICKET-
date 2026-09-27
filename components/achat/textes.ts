import { getTranslations } from 'next-intl/server';
import type { TextesConnexion } from './ConnexionOtp';

export async function textesConnexion(): Promise<TextesConnexion> {
  const t = await getTranslations();
  return {
    label: t('telephone.label'), placeholder: t('telephone.placeholder'), detecte: t.raw('telephone.opDetecte') as string, inconnu: t('telephone.opInconnu'),
    recevoirCode: t('achat.recevoirCode'), codeEnvoye: t('achat.codeEnvoye'), modifier: t('achat.modifier'), codeLegend: t('achat.codeLegend'),
    chiffre: t.raw('achat.chiffre') as string, autoRemplissage: t('achat.autoRemplissage'), rienRecu: t('achat.rienRecu'),
    renvoyerDans: t.raw('achat.renvoyerDans') as string, renvoyer: t('achat.renvoyer'), validerCode: t('achat.validerCode'),
  };
}
