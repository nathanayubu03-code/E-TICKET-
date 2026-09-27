import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FormAlerteSms } from '@/components/public/FormAlerteSms';
import { FormDesabonnement } from '@/components/public/FormDesabonnement';
import { villesEtCategoriesPubliques } from '@/lib/evenements';
import { ecart } from '@/lib/style';

export const metadata: Metadata = { title: 'Alertes SMS' };

export default async function PageAlertes() {
  const t = await getTranslations();
  const { villes } = await villesEtCategoriesPubliques();
  return (
    <main className="conteneur">
      <div className="achat pile" style={ecart(24)}>
        <section className="panneau pile" style={ecart(14)} aria-labelledby="t-alerte">
          <h1 id="t-alerte" className="affiche" style={{ fontSize: 'clamp(36px,6vw,52px)' }}>{t('alertes.titre')}</h1>
          <p className="doux" style={{ fontSize: 17 }}>{t('alertes.texte')}</p>
          <FormAlerteSms villes={villes} textes={{ titre: t('alertes.titre'), texte: t('alertes.texte'), numero: t('alertes.numero'), placeholder: t('telephone.placeholder'), ville: t('alertes.ville'), toutesVilles: t('alertes.toutesVilles'), consentement: t('alertes.consentement'), envoyer: t('alertes.envoyer') }} />
        </section>
        <section className="panneau pile" style={ecart(14)} aria-labelledby="t-desabo">
          <h2 id="t-desabo" className="titre-section">{t('alertes.desinscrireTitre')}</h2>
          <p className="doux">{t('alertes.desinscrireTexte')}</p>
          <FormDesabonnement textes={{ numero: t('alertes.numero'), placeholder: t('telephone.placeholder'), envoyer: t('alertes.desinscrire') }} />
        </section>
      </div>
    </main>
  );
}
