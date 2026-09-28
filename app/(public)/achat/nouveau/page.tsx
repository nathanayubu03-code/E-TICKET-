import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { texteEvenement } from '@/lib/langue';
import { Reservation } from '@/components/achat/Reservation';
import { textesConnexion } from '@/components/achat/textes';
import { cdf } from '@/lib/argent';
import { sessionCourante } from '@/lib/auth/session';
import { lireLignes } from '@/lib/commandes';
import { evenementPublic } from '@/lib/evenements';
import { ecart } from '@/lib/style';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('pages'))('achat'), robots: { index: false } };
}

export default async function NouvelAchat({ searchParams }: { searchParams: Promise<{ e?: string; l?: string }> }) {
  const { e: slug = '', l = '' } = await searchParams;
  const e = await evenementPublic(slug);
  const lignes = lireLignes(l);
  if (!e || lignes.length === 0) notFound();
  const t = await getTranslations();
  const langue = await getLocale();
  const detail = lignes.map((x) => ({ ...x, type: e.typesBillet.find((tb) => tb.id === x.typeId) })).filter((x) => x.type);
  const total = detail.reduce((s, x) => s + x.quantite * (x.type?.prixCdf ?? 0), 0);
  const nb = detail.reduce((s, x) => s + x.quantite, 0);
  return (
    <main className="conteneur">
      <div className="achat pile" style={ecart(18)}>
        <div className="panneau pile" style={ecart(10, { padding: '16px 20px' })}>
          <div className="rangee entre envelopper">
            <b>{t('achat.resume', { titre: texteEvenement(e, 'titre', langue), billets: t('evenement.nbBillets', { n: nb }), montant: cdf(total, undefined, langue) })}</b>
            <span className="doux">{t('achat.etapeConnexion')}</span>
          </div>
          <div className="progression" aria-hidden="true"><span className="fait" /><span /><span /><span /></div>
        </div>
        <Reservation
          connecte={Boolean(await sessionCourante())}
          slug={e.slug}
          lignes={l}
          textes={{ titre: t('achat.telTitre'), texte: t('achat.telTexte'), continuer: t('evenement.continuer'), codePromo: t('achat.codePromo'), retour: t('evenement.tous') }}
          textesConnexion={await textesConnexion()}
        />
      </div>
    </main>
  );
}
