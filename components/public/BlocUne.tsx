import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Icone } from '@/components/ui/Icone';
import { cdf, usd } from '@/lib/argent';
import type { EvenementListe } from '@/lib/evenements';
import { dateCourte, heure, tampon } from '@/lib/fuseaux';
import { ecart } from '@/lib/style';
import type { Variantes } from './Couverture';

export async function BlocUne({ e, taux }: { e: EvenementListe; taux: number | null }) {
  const t = await getTranslations();
  const fuseau = e.ville?.fuseau ?? e.fuseau ?? undefined;
  const date = e.debutLe ? tampon(e.debutLe, fuseau) : null;
  const v = (e.afficheVariantes as Variantes | null)?.['16x9'];
  const rare = e.typesBillet.filter((x) => x.restant > 0 && x.restant <= 20).sort((a, b) => a.restant - b.restant)[0];
  const plusieursPrix = new Set(e.typesBillet.map((x) => x.prixCdf)).size > 1;
  const dollars = usd(e.prixMin, taux);
  return (
    <article className="panneau une">
      <div className="bandeau">
        {v?.webp || v?.avif ? (
          <picture>{v.avif ? <source srcSet={v.avif} type="image/avif" /> : null}<img src={v.webp ?? v.avif} alt="" fetchPriority="high" /></picture>
        ) : null}
        <span className="etiquette">{t('accueil.aLaUne')}</span>
        {date ? <span className="tampon" aria-hidden="true"><b>{date.jour}</b><span>{date.mois.toUpperCase()}</span></span> : null}
      </div>
      <div className="corps">
        <span style={{ fontWeight: 700 }}>{[e.categorie?.nom.replace(/s$/, ''), e.genre].filter(Boolean).join(' · ')}</span>
        <h1 className="affiche">{e.titre}</h1>
        {e.sousTitre ? <p style={{ fontSize: 18 }}>{e.sousTitre}</p> : null}
        <div className="meta">
          {e.debutLe ? <span><Icone nom="cal" />{dateCourte(e.debutLe, fuseau)}</span> : null}
          <span><Icone nom="pin" />{[e.lieu?.nom, e.ville?.nom].filter(Boolean).join(', ')}</span>
        </div>
        {e.description ? <p className="ligne-clamp" style={{ fontSize: 17, maxWidth: 520 }}>{e.description}</p> : null}
        <div className="rangee envelopper" style={ecart(8)}>
          {e.ouverturePortesLe ? <span className="badge" style={{ background: '#FBF5E6', color: '#14120E' }}>{t('accueil.portes', { heure: heure(e.ouverturePortesLe, fuseau) })}</span> : null}
          {e.nomsTypes.length > 1 ? <span className="badge" style={{ background: '#FBF5E6', color: '#14120E' }}>{e.nomsTypes.join(' · ')}</span> : null}
          {e.complet ? <span className="badge" style={{ background: '#FFD21F', color: '#14120E' }}>{t('accueil.complet')}</span>
            : rare ? <span className="badge" style={{ background: '#FFD21F', color: '#14120E' }}>{t('accueil.plusQue', { n: rare.restant })}{e.typesBillet.length > 1 ? ` ${rare.nom}` : ''}</span> : null}
        </div>
        <div className="rangee entre">
          <div className="prix">
            {plusieursPrix && e.prixMin > 0 ? <span style={{ fontSize: 14 }}>{t('commun.des')}</span> : null}
            <b>{cdf(e.prixMin, t('commun.gratuit'))}</b>
            {dollars ? <span>{dollars}</span> : null}
          </div>
          <Link className="btn btn-principal btn-grand" href={`/evenements/${e.slug}`}>{t('accueil.reserver')}</Link>
        </div>
      </div>
    </article>
  );
}
