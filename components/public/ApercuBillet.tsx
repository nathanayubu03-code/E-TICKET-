import { getTranslations } from 'next-intl/server';
import { BilletVivant } from '@/components/billet/BilletVivant';
import { textesBillet } from '@/components/billet/textes';
import { cdf } from '@/lib/argent';
import { dessinQR } from '@/lib/billets/qr';
import type { EvenementListe } from '@/lib/evenements';
import { dateCourte } from '@/lib/fuseaux';

// Aperçu du billet vivant sur l'accueil. Données de l'événement à la une, numéro de billet
// neutre (ET-XXXX-XXXX) et QR qui ne contient que le mot EXEMPLE : il ne vaut rien au scanner.
export async function ApercuBillet({ e }: { e: EvenementListe }) {
  const t = await getTranslations('accueil');
  const type = e.typesBillet[0];
  const categorie = type?.nom ?? t('apercuExemple');
  const publicId = 'ET-XXXX-XXXX';
  return (
    <aside className="panneau apercu-billet" aria-label={t('apercuAria')}>
      <span className="etiquette" style={{ alignSelf: 'flex-start' }}>{t('apercuEtiquette')}</span>
      <h2 className="affiche">{t('apercuTitre')}</h2>
      <p className="doux">{t('apercuTexte')}</p>
      <div style={{ marginTop: 4 }}>
        <BilletVivant
          billet={{ publicId, categorie, prix: cdf(type?.prixCdf ?? 0) }}
          evenement={{ titre: e.titre, sousTitre: e.sousTitre, quand: e.debutLe ? dateCourte(e.debutLe, e.ville?.fuseau ?? undefined) : '', lieu: [e.lieu?.nom, e.ville?.nom].filter(Boolean).join(', '), selAffichage: e.id }}
          qr={dessinQR('EXEMPLE')}
          textes={{ ...(await textesBillet({ titre: e.titre, categorie, publicId })), unePersonne: t('apercuExemple') }}
          horsLigne={false}
        />
      </div>
    </aside>
  );
}
