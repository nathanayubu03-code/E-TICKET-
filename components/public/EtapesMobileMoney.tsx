import { getTranslations } from 'next-intl/server';
import { OPERATEURS } from '@/lib/operateurs';
import { ecart } from '@/lib/style';

export async function EtapesMobileMoney({ max }: { max: number }) {
  const t = await getTranslations('accueil');
  const etapes = [
    [t('etape1Titre'), t('etape1Texte', { max })],
    [t('etape2Titre'), t('etape2Texte')],
    [t('etape3Titre'), t('etape3Texte')],
  ];
  return (
    <section aria-labelledby="titre-comment">
      <div className="panneau pile" style={ecart(22)}>
        <h2 id="titre-comment" className="titre-section">{t('etapesTitre')}</h2>
        <div className="etapes">
          {etapes.map(([titre, texte], i) => (
            <div className="etape" key={i}><span className="num">{i + 1}</span><b style={{ fontSize: 18 }}>{titre}</b><p className="doux">{texte}</p></div>
          ))}
        </div>
        <div className="operateurs-ligne" aria-label={t('operateursAria')}>
          {OPERATEURS.map((o) => <span className="op-puce" key={o.k}><i style={{ background: o.fond }} />{o.nom}</span>)}
          <span className="op-puce">{t('paiementAgent')}</span>
        </div>
      </div>
    </section>
  );
}
