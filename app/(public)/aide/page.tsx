import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EtapesMobileMoney } from '@/components/public/EtapesMobileMoney';
import { parametre } from '@/lib/parametres';
import { ecart } from '@/lib/style';

export const metadata: Metadata = { title: 'Aide' };

export default async function PageAide() {
  const t = await getTranslations('aide');
  const max = await parametre('limite_billets');
  return (
    <main className="conteneur">
      <div className="pile" style={ecart(28)}>
        <h1 className="affiche panneau" style={{ fontSize: 'var(--t-titre-page)', alignSelf: 'flex-start', padding: '14px 22px' }}>{t('titre')}</h1>
        <EtapesMobileMoney max={max} />
        <section className="alerte-secret" aria-labelledby="t-secret"><div className="pile" style={ecart(4)}><h2 id="t-secret" style={{ fontSize: 'var(--t-chapo)' }}>{t('secretTitre')}</h2><p>{t('secretTexte')}</p></div></section>
        <section className="panneau pile" aria-labelledby="t-rien">
          <h2 id="t-rien" className="titre-section">{t('rienRecuTitre')}</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>{t('rienRecu1')}</li><li>{t('rienRecu2')}</li><li>{t('rienRecu3')}</li><li><b>{t('rienRecu4')}</b></li>
          </ul>
        </section>
        <section id="agent" className="panneau pile" aria-labelledby="t-agent"><h2 id="t-agent" className="titre-section">{t('agentTitre')}</h2><p>{t('agentTexte')}</p></section>
        <section className="panneau pile" aria-labelledby="t-billets"><h2 id="t-billets" className="titre-section">{t('billetsTitre')}</h2><p>{t('billetsTexte')}</p></section>
        <section className="panneau pile" aria-labelledby="t-remb"><h2 id="t-remb" className="titre-section">{t('remboursementTitre')}</h2><p>{t('remboursementTexte')}</p></section>
      </div>
    </main>
  );
}
