import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cdf, usd } from '@/lib/argent';
import type { EvenementListe } from '@/lib/evenements';
import { dateCourte, tampon } from '@/lib/fuseaux';
import { Couverture } from './Couverture';

export async function CarteEvenement({ e, taux }: { e: EvenementListe; taux: number | null }) {
  const t = await getTranslations();
  const fuseau = e.ville?.fuseau ?? e.fuseau ?? undefined;
  const date = e.debutLe ? tampon(e.debutLe, fuseau) : null;
  const plusieursPrix = new Set(e.typesBillet.map((x) => x.prixCdf)).size > 1;
  const alerte = e.complet ? t('accueil.complet') : e.restantTotal > 0 && e.restantTotal <= 20 ? t('accueil.plusQue', { n: e.restantTotal }) : null;
  const dollars = usd(e.prixMin, taux);
  return (
    <Link className="carte" href={`/evenements/${e.slug}`}>
      <div className="vignette">
        <Couverture id={e.id} fond={e.categorie?.fond} variantes={e.afficheVariantes} format="16x9" cols={12} rows={5} />
        {date ? <span className="date">{date.jour}<small>{date.mois.toUpperCase()}</small></span> : null}
      </div>
      <div className="corps">
        <span className="doux" style={{ fontSize: 'var(--t-petit)', fontWeight: 700 }}>{[e.categorie?.nom.replace(/s$/, ''), e.genre].filter(Boolean).join(' · ')}</span>
        <h3>{e.titre}</h3>
        {e.debutLe ? <span className="doux" style={{ fontSize: 'var(--t-texte)' }}>{dateCourte(e.debutLe, fuseau)}</span> : null}
        <span className="doux" style={{ fontSize: 'var(--t-texte)' }}>{[e.lieu?.nom, e.ville?.nom].filter(Boolean).join(', ')}</span>
        <div className="bas">
          <span>
            <b style={{ fontSize: 'var(--t-texte)' }}>{plusieursPrix && e.prixMin > 0 ? `${t('commun.des')} ` : ''}{cdf(e.prixMin, t('commun.gratuit'))}</b>{' '}
            {dollars ? <span className="doux" style={{ fontSize: 'var(--t-petit)' }}>{dollars}</span> : null}
          </span>
          {alerte ? <span className="badge badge-danger">{alerte}</span> : null}
        </div>
      </div>
    </Link>
  );
}
