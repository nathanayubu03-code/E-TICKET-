import { getTranslations } from 'next-intl/server';
import type { TextesBillet } from './BilletVivant';

export async function textesBillet(p: { titre: string; categorie: string; publicId: string }): Promise<TextesBillet> {
  const t = await getTranslations('billet');
  return {
    aria: t('aria', { titre: p.titre, categorie: p.categorie }),
    unePersonne: t('unePersonne', { categorie: p.categorie }),
    jaugeAria: t('jaugeAria'),
    changeDans: t('changeDans'),
    titulaire: t('titulaire'),
    entree: t('entree'),
    numero: t('numero'),
    prixPaye: t('prixPaye'),
    horsLigne: t('horsLigne'),
    qrAria: t('qrAria', { id: p.publicId }),
  };
}
