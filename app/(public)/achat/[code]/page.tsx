import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CLES_TEXTES_PAIEMENT, type TextesPaiement } from '@/components/achat/cles-paiement';
import { ParcoursPaiement } from '@/components/achat/ParcoursPaiement';
import { BilletVivant } from '@/components/billet/BilletVivant';
import { EnregistrerBillets } from '@/components/billet/EnregistrerBillets';
import { textesBillet } from '@/components/billet/textes';
import { Icone } from '@/components/ui/Icone';
import { commandeDeLAcheteur } from '@/lib/achat';
import { cdf, usd } from '@/lib/argent';
import { sessionCourante } from '@/lib/auth/session';
import { billetsHorsLigne } from '@/lib/billets/hors-ligne';
import { contenuQR, dessinQR } from '@/lib/billets/qr';
import { db } from '@/lib/db';
import { dateCourte, jourMois } from '@/lib/fuseaux';
import { OPERATEURS } from '@/lib/operateurs';
import { parametre } from '@/lib/parametres';
import { ecart } from '@/lib/style';
import { chiffresNationaux, formaterTelephone } from '@/lib/telephone';

export const metadata: Metadata = { title: 'Achat', robots: { index: false } };
export const dynamic = 'force-dynamic';


export default async function PageAchat({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const s = await sessionCourante();
  if (!s) redirect(`/connexion?suite=/achat/${code}`);
  const c = await commandeDeLAcheteur(code, s);
  if (!c) notFound();
  const t = await getTranslations();
  const e = c.evenement;
  const fuseau = e.ville?.fuseau ?? e.fuseau ?? undefined;
  const nb = c.lignes.reduce((a, l) => a + l.quantite, 0);
  const etape = c.statut === 'PAYEE' ? 4 : c.paiements[0]?.statut === 'EN_ATTENTE' ? 3 : 2;
  const libelleEtape = etape === 4 ? t('achat.etapeBillets') : etape === 3 ? t('achat.etapeValidation') : t('achat.etapePaiement');

  const entete = (
    <div className="panneau pile" style={ecart(10, { padding: '16px 20px' })}>
      <div className="rangee entre envelopper">
        <b>{t('achat.resume', { titre: e.titre, billets: t('evenement.nbBillets', { n: nb }), montant: cdf(c.totalCdf) })}</b>
        <span className="doux">{libelleEtape}</span>
      </div>
      <div className="progression" aria-hidden="true">{[1, 2, 3, 4].map((n) => <span key={n} className={n <= etape ? 'fait' : undefined} />)}</div>
    </div>
  );

  let contenu: React.ReactNode;
  if (c.statut === 'PAYEE') {
    const quand = e.debutLe ? dateCourte(e.debutLe, fuseau) : '';
    const lieu = [e.lieu?.nom, e.ville?.nom].filter(Boolean).join(', ');
    const partage = `https://wa.me/?text=${encodeURIComponent(t('achat.partageTexte', { titre: e.titre, date: quand }))}`;
    contenu = (
      <section className="panneau pile" style={ecart(18)} aria-labelledby="t-conf">
        <span className="badge badge-succes" style={{ alignSelf: 'flex-start', fontSize: 15 }}><Icone nom="check" taille={16} epaisseur={3} />{t('achat.confirme')}</span>
        <h1 id="t-conf" className="affiche" style={{ fontSize: 'clamp(38px,6vw,56px)' }}>{t('achat.confirmationTitre')}</h1>
        <p className="doux">{t('achat.smsParti', { tel: formaterTelephone(c.telephone) })}</p>
        <EnregistrerBillets billets={await billetsHorsLigne(c.billets.map((b) => b.id))} />
        {await Promise.all(c.billets.map(async (b, i) => (
          <BilletVivant
            key={b.id}
            arrive={i === 0}
            billet={{ publicId: b.publicId, categorie: b.typeBillet.nom, titulaire: b.titulaire, entree: b.entree, prix: cdf(b.prixPayeCdf, t('commun.gratuit')) }}
            evenement={{ titre: e.titre, sousTitre: e.sousTitre, quand, lieu, selAffichage: e.selAffichage }}
            qr={dessinQR(contenuQR(e.code, b.code))}
            textes={await textesBillet({ titre: e.titre, categorie: b.typeBillet.nom, publicId: b.publicId })}
          />
        )))}
        <div className="pile" style={ecart(10)}>
          {c.billets.map((b) => (
            <a key={b.id} className="btn btn-principal btn-grand" href={`/api/billets/${b.publicId}/pdf`}><Icone nom="download" taille={22} />{t('achat.telechargerPdf')}{c.billets.length > 1 ? ` · ${b.publicId}` : ''}</a>
          ))}
          <a className="btn btn-grand" href={partage} target="_blank" rel="noopener noreferrer"><Icone nom="chat" taille={22} />{t('achat.partagerWhatsapp')}</a>
          <Link className="lien-bouton" href="/mes-billets" style={{ alignSelf: 'center' }}>{t('achat.voirTous')}</Link>
        </div>
      </section>
    );
  } else if (c.statut === 'PAYEE_SANS_PLACE') {
    contenu = <section className="panneau pile"><p className="note note-attention" role="status">{t('achat.payeeSansPlace')}</p></section>;
  } else if (c.statut !== 'EN_ATTENTE') {
    contenu = (
      <section className="panneau pile" style={ecart(14)}>
        <p className="note note-attention" role="status">{t('achat.reservationExpiree')}</p>
        <Link className="btn btn-principal btn-grand" href={`/evenements/${e.slug}`}>{t('evenement.tous')}</Link>
      </section>
    );
  } else if (c.reclamations[0]?.statut === 'EN_ATTENTE') {
    contenu = (
      <section className="panneau pile" style={ecart(14)}>
        <p className="note note-info" role="status">{t('agent.recu')}</p>
        <p className="doux">{t('agent.reserveJusqua', { heure: dateCourte(c.reserveJusquau, fuseau).split(' · ')[1] ?? '' })}</p>
      </section>
    );
  } else {
    const [taux, numeros] = await Promise.all([c.tauxUsdId ? db.exchangeRate.findUnique({ where: { id: c.tauxUsdId } }) : null, parametre('numeros_marchands')]);
    const dollars = usd(c.totalCdf, taux?.cdfParUsd);
    const p = c.paiements[0];
    const lignes = [
      ...c.lignes.map((l) => ({ libelle: `${l.quantite} × ${l.typeBillet.nom}`, montant: cdf(l.quantite * l.prixUnitaireCdf) })),
      ...(c.remiseCdf ? [{ libelle: t('achat.remise'), montant: `- ${cdf(c.remiseCdf)}` }] : []),
      { libelle: t('achat.fraisService'), montant: '0 CDF' },
      { libelle: t('achat.total'), montant: cdf(c.totalCdf), gras: true },
    ];
    const textes = Object.fromEntries(CLES_TEXTES_PAIEMENT.map((k) => [k, t.raw(`achat.${k}`) as string])) as TextesPaiement;
    contenu = (
      <ParcoursPaiement
        code={c.code}
        total={c.totalCdf}
        montant={cdf(c.totalCdf)}
        dollars={dollars && taux ? `${dollars} · ${t('commun.tauxIndicatif', { date: jourMois(taux.effectifLe) })}` : null}
        lignes={lignes}
        operateurs={[...OPERATEURS]}
        chiffresInitiaux={chiffresNationaux(p?.telephone ?? c.telephone)}
        vueInitiale={p?.statut === 'EN_ATTENTE' || p?.statut === 'INITIE' ? 'attente' : 'paiement'}
        debutPaiement={p && (p.statut === 'EN_ATTENTE' || p.statut === 'INITIE') ? p.creeLe.getTime() : null}
        operateurInitial={p?.operateur ?? null}
        agentHref={Object.keys(numeros).length > 0 ? `/agent/${c.code}` : null}
        textes={textes}
      />
    );
  }

  return (
    <main className="conteneur">
      <div className="achat pile" style={ecart(18)}>
        {entete}
        {contenu}
      </div>
    </main>
  );
}
