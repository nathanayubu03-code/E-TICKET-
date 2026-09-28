import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { LogoOperateur } from '@/components/ui/LogoOperateur';
import { FICHIERS_LOGOS, OPERATEURS } from '@/lib/operateurs';
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
            <div className="etape" key={i}><span className="num">{i + 1}</span><b style={{ fontSize: 'var(--t-chapo)' }}>{titre}</b><p className="doux">{texte}</p></div>
          ))}
        </div>
        <div className="operateurs-ligne" aria-label={t('operateursAria')}>
          {/* Un clic sur un opérateur le retient pour le paiement et mène aux événements, pour acheter tout de suite. */}
          {OPERATEURS.map((o) => (
            <Link className="op-puce" key={o.k} href={`/payer-avec/${FICHIERS_LOGOS[o.k]}`} prefetch={false}>
              {o.logo ? <LogoOperateur op={o} taille={24} /> : <i style={{ background: o.fond }} />}{o.nom}
            </Link>
          ))}
          <span className="op-puce">{t('paiementAgent')}</span>
        </div>
      </div>
    </section>
  );
}
