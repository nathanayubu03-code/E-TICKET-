import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { cdf, usd } from '@/lib/argent';
import { nomCategorie } from '@/lib/categorie';
import type { EvenementListe } from '@/lib/evenements';
import { texteEvenement } from '@/lib/langue';
import { dateCourte, tampon } from '@/lib/fuseaux';
import { Couverture } from './Couverture';

export async function CarteEvenement({ e, taux }: { e: EvenementListe; taux: number | null }) {
  const t = await getTranslations();
  const langue = await getLocale();
  const fuseau = e.ville?.fuseau ?? e.fuseau ?? undefined;
  const date = e.debutLe ? tampon(e.debutLe, fuseau, langue) : null;
  const plusieursPrix = new Set(e.typesBillet.map((x) => x.prixCdf)).size > 1;
  const alerte = e.complet ? t('accueil.complet') : e.restantTotal > 0 && e.restantTotal <= 20 ? t('accueil.plusQue', { n: e.restantTotal }) : null;
  const dollars = usd(e.prixMin, taux, langue);
  return (
    <Link className="carte" href={`/evenements/${e.slug}`}>
      <div className="vignette">
        <Couverture id={e.id} fond={e.categorie?.fond} variantes={e.afficheVariantes} format="16x9" cols={12} rows={5} />
        {date ? <span className="date">{date.jour}<small>{date.mois.toUpperCase()}</small></span> : null}
      </div>
      <div className="corps">
        <span className="doux" style={{ fontSize: 'var(--t-petit)', fontWeight: 700 }}>{[nomCategorie(t, e.categorie), e.genre].filter(Boolean).join(' · ')}</span>
        <h3>{texteEvenement(e, 'titre', langue)}</h3>
        {e.debutLe ? <span className="doux" style={{ fontSize: 'var(--t-texte)' }}>{dateCourte(e.debutLe, fuseau, langue)}</span> : null}
        <span className="doux" style={{ fontSize: 'var(--t-texte)' }}>{[e.lieu?.nom, e.ville?.nom].filter(Boolean).join(', ')}</span>
        <div className="bas">
          <span>
            <b style={{ fontSize: 'var(--t-texte)' }}>{plusieursPrix && e.prixMin > 0 ? `${t('commun.des')} ` : ''}{cdf(e.prixMin, t('commun.gratuit'), langue)}</b>{' '}
            {dollars ? <span className="doux" style={{ fontSize: 'var(--t-petit)' }}>{dollars}</span> : null}
          </span>
          {alerte ? <span className="badge badge-danger">{alerte}</span> : null}
        </div>
      </div>
    </Link>
  );
}
