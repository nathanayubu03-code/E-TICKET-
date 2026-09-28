import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Icone } from '@/components/ui/Icone';
import { Prix } from '@/components/ui/Prix';
import { nomCategorie } from '@/lib/categorie';
import type { EvenementListe } from '@/lib/evenements';
import { texteEvenement } from '@/lib/langue';
import { dateCourte, heure, tampon } from '@/lib/fuseaux';
import { ecart } from '@/lib/style';
import type { Variantes } from './Couverture';

export async function BlocUne({ e }: { e: EvenementListe }) {
  const t = await getTranslations();
  const langue = await getLocale();
  const fuseau = e.ville?.fuseau ?? e.fuseau ?? undefined;
  const date = e.debutLe ? tampon(e.debutLe, fuseau, langue) : null;
  const v = (e.afficheVariantes as Variantes | null)?.['16x9'];
  const rare = e.typesBillet.filter((x) => x.restant > 0 && x.restant <= 20).sort((a, b) => a.restant - b.restant)[0];
  const plusieursPrix = new Set(e.typesBillet.map((x) => x.prixCdf)).size > 1;
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
        <span style={{ fontWeight: 700 }}>{[nomCategorie(t, e.categorie), e.genre].filter(Boolean).join(' · ')}</span>
        <h1 className="affiche">{texteEvenement(e, 'titre', langue)}</h1>
        {e.sousTitre ? <p style={{ fontSize: 'var(--t-chapo)' }}>{e.sousTitre}</p> : null}
        <div className="meta">
          {e.debutLe ? <span><Icone nom="cal" />{dateCourte(e.debutLe, fuseau, langue)}</span> : null}
          <span><Icone nom="pin" />{[e.lieu?.nom, e.ville?.nom].filter(Boolean).join(', ')}</span>
        </div>
        {e.description ? <p className="ligne-clamp" style={{ fontSize: 'var(--t-texte)', maxWidth: 520 }}>{texteEvenement(e, 'description', langue)}</p> : null}
        <div className="rangee envelopper" style={ecart(8)}>
          {e.ouverturePortesLe ? <span className="badge" style={{ background: '#FBF5E6', color: '#14120E' }}>{t('accueil.portes', { heure: heure(e.ouverturePortesLe, fuseau) })}</span> : null}
          {e.nomsTypes.length > 1 ? <span className="badge" style={{ background: '#FBF5E6', color: '#14120E' }}>{e.nomsTypes.join(' · ')}</span> : null}
          {e.complet ? <span className="badge" style={{ background: '#FFD21F', color: '#14120E' }}>{t('accueil.complet')}</span>
            : rare ? <span className="badge" style={{ background: '#FFD21F', color: '#14120E' }}>{t('accueil.plusQue', { n: rare.restant })}{e.typesBillet.length > 1 ? ` ${rare.nom}` : ''}</span> : null}
        </div>
        <div className="rangee entre">
          <div className="prix">
            {plusieursPrix && e.prixMin > 0 ? <span style={{ fontSize: 'var(--t-petit)' }}>{t('commun.des')}</span> : null}
            <b><Prix cdf={e.prixMin} usd={e.prixMinUsd} langue={langue} gratuit={t('commun.gratuit')} /></b>
          </div>
          <Link className="btn btn-principal btn-grand" href={`/evenements/${e.slug}`}>{t('accueil.reserver')}</Link>
        </div>
      </div>
    </article>
  );
}
