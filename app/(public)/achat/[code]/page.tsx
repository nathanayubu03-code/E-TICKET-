import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { commandeDeLAcheteur } from '@/lib/achat';
import { cdf } from '@/lib/argent';
import { sessionCourante } from '@/lib/auth/session';
import { ecart } from '@/lib/style';

export const metadata: Metadata = { title: 'Achat', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function PageAchat({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const s = await sessionCourante();
  if (!s) redirect(`/connexion?suite=/achat/${code}`);
  const c = await commandeDeLAcheteur(code, s);
  if (!c) notFound();
  const t = await getTranslations();
  const nb = c.lignes.reduce((a, l) => a + l.quantite, 0);
  return (
    <main className="conteneur">
      <div className="achat pile" style={ecart(18)}>
        <div className="panneau pile" style={ecart(10, { padding: '16px 20px' })}>
          <div className="rangee entre envelopper">
            <b>{t('achat.resume', { titre: c.evenement.titre, billets: t('evenement.nbBillets', { n: nb }), montant: cdf(c.totalCdf) })}</b>
            <span className="doux">{t('achat.etapePaiement')}</span>
          </div>
        </div>
        <section className="panneau pile" style={ecart(12)}>
          <div className="lignes">
            {c.lignes.map((l) => <div key={l.id}><span>{l.quantite} × {l.typeBillet.nom}</span><span>{cdf(l.quantite * l.prixUnitaireCdf)}</span></div>)}
            <div style={{ fontWeight: 700 }}><span>{t('achat.total')}</span><span>{cdf(c.totalCdf)}</span></div>
          </div>
        </section>
      </div>
    </main>
  );
}
