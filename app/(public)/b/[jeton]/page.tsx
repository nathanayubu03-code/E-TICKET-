import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { BilletVivant } from '@/components/billet/BilletVivant';
import { EnregistrerBillets } from '@/components/billet/EnregistrerBillets';
import { textesBillet } from '@/components/billet/textes';
import { Icone } from '@/components/ui/Icone';
import { montant } from '@/lib/argent';
import { billetsHorsLigne } from '@/lib/billets/hors-ligne';
import { contenuQR, dessinQR } from '@/lib/billets/qr';
import { db } from '@/lib/db';
import { dateCourte } from '@/lib/fuseaux';
import { texteEvenement } from '@/lib/langue';
import { ecart } from '@/lib/style';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('pages'))('billet'), robots: { index: false, follow: false } };
}
export const dynamic = 'force-dynamic';

// Billet ouvert depuis le lien reçu par SMS : le code aléatoire de 128 bits vaut billet.
export default async function BilletParLien({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  if (!/^[A-Z2-7]{26}$/.test(jeton)) notFound();
  const b = await db.ticket.findUnique({ where: { code: jeton }, include: { typeBillet: true, evenement: { include: { lieu: true, ville: true } } } });
  if (!b) notFound();
  const t = await getTranslations();
  const langue = await getLocale();
  const e = b.evenement;
  return (
    <main className="conteneur">
      <div className="pile" style={ecart(14, { maxWidth: 420, marginInline: 'auto' })}>
        {b.statut === 'VALIDE' ? <EnregistrerBillets billets={await billetsHorsLigne([b.id], langue)} /> : null}
        <BilletVivant
          billet={{ publicId: b.publicId, categorie: b.typeBillet.nom, titulaire: b.titulaire, entree: b.entree, prix: montant(b.prixPaye, b.devise, langue, t('commun.gratuit')) }}
          evenement={{ titre: texteEvenement(e, 'titre', langue), sousTitre: e.sousTitre, quand: e.debutLe ? dateCourte(e.debutLe, e.ville?.fuseau ?? undefined, langue) : '', lieu: [e.lieu?.nom, e.ville?.nom].filter(Boolean).join(', '), selAffichage: e.selAffichage }}
          qr={b.statut === 'ANNULE' ? null : dessinQR(contenuQR(e.code, b.code))}
          textes={await textesBillet({ titre: texteEvenement(e, 'titre', langue), categorie: b.typeBillet.nom, publicId: b.publicId })}
          horsLigne={b.statut === 'VALIDE'}
          etat={b.statut === 'ANNULE' ? t('billet.annule') : b.statut === 'UTILISE' ? t('billet.utilise') : undefined}
        />
        <p className="panneau doux" style={{ padding: '14px 16px', fontSize: 'var(--t-texte)', boxShadow: 'none' }}>{t('mesBillets.conseil')}</p>
        {b.statut !== 'ANNULE' ? <a className="btn btn-principal btn-grand" href={`/api/billets/${b.publicId}/pdf?jeton=${b.code}`}><Icone nom="download" taille={22} />{t('achat.telechargerPdf')}</a> : null}
        <Link className="lien-bouton" href="/mes-billets" style={{ alignSelf: 'center' }}>{t('achat.voirTous')}</Link>
      </div>
    </main>
  );
}
