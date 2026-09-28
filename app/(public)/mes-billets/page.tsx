import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { MesBillets } from '@/components/billet/MesBillets';
import { sessionCourante } from '@/lib/auth/session';
import { billetsDeLAcheteur } from '@/lib/billets/mes-billets';
import { dateLongue } from '@/lib/fuseaux';
import { texteEvenement } from '@/lib/langue';
import { deconnecter } from '../connexion/actions';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('pages'))('mesBillets'), robots: { index: false } };
}
export const dynamic = 'force-dynamic';

export default async function PageMesBillets() {
  const t = await getTranslations();
  const langue = await getLocale();
  const s = await sessionCourante();
  let serveur = null;
  const passes: { titre: string; info: string }[] = [];
  if (s) {
    const r = await billetsDeLAcheteur(s, new Date(), langue);
    serveur = r.aVenir;
    for (const b of r.passes) {
      const fuseau = b.evenement.fuseau ?? undefined;
      passes.push({ titre: texteEvenement(b.evenement, 'titre', langue), info: b.premierScanLe ? t('mesBillets.utiliseLe', { date: dateLongue(b.premierScanLe, fuseau, langue) }) : t('mesBillets.nonUtilise', { date: b.evenement.debutLe ? dateLongue(b.evenement.debutLe, fuseau, langue).split(/ (?:à|at) /)[0]! : '' }) });
    }
  }
  const tb = await getTranslations('billet');
  return (
    <main className="conteneur">
      <div className="pile" style={{ ['--gap' as string]: '12px' }}>
        <MesBillets
          serveur={serveur}
          passes={passes}
          connecte={Boolean(s)}
          textes={{
            titre: t('mesBillets.titre'), horsLigneTitre: t('mesBillets.horsLigneTitre'), horsLigneTexte: t('mesBillets.horsLigneTexte'), periode: t('mesBillets.periode'),
            aVenir: t.raw('mesBillets.aVenir') as string, passes: t.raw('mesBillets.passes') as string, surTelephone: t('mesBillets.surTelephone'), aTelecharger: t('mesBillets.aTelecharger'),
            unBillet: t.raw('mesBillets.unBillet') as string, conseil: t('mesBillets.conseil'), billetOuvert: t('mesBillets.billetOuvert'), videTitre: t('mesBillets.videTitre'),
            videTexte: t('mesBillets.videTexte'), voirEvenements: t('mesBillets.voirEvenements'), connecter: t('mesBillets.connecter'), seConnecter: t('entete.connexion'), enregistrer: t('mesBillets.enregistrer'),
            billet: { aria: tb.raw('aria') as string, unePersonne: tb.raw('unePersonne') as string, qrAria: tb.raw('qrAria') as string, jaugeAria: tb('jaugeAria'), changeDans: tb('changeDans'), titulaire: tb('titulaire'), entree: tb('entree'), numero: tb('numero'), prixPaye: tb('prixPaye'), horsLigne: tb('horsLigne') },
          }}
        />
        {s ? <form action={deconnecter} style={{ alignSelf: 'center' }}><button className="lien-bouton" type="submit">{t('entete.deconnexion')}</button></form> : null}
      </div>
    </main>
  );
}
