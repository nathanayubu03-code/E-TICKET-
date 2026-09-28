import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { FormListeAttente } from '@/components/evenement/FormListeAttente';
import { Panier, type TypePanier } from '@/components/evenement/Panier';
import { Couverture } from '@/components/public/Couverture';
import { Icone } from '@/components/ui/Icone';
import { prixDouble } from '@/lib/argent';
import { nomCategorie } from '@/lib/categorie';
import type { EvenementDetail } from '@/lib/evenements';
import { texteEvenement } from '@/lib/langue';
import { dateCourte, dateLongue, heure, tampon } from '@/lib/fuseaux';
import { parametre } from '@/lib/parametres';
import { ecart } from '@/lib/style';

const COULEURS_PROGRAMME = ['#FFD21F', '#1E8FFF', '#C8102E'];

function initiales(nom: string) {
  return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');
}

export async function VueEvenement({ e, apercu = false }: { e: EvenementDetail; apercu?: boolean }) {
  const t = await getTranslations();
  const langue = await getLocale();
  const maxGlobal = await parametre('limite_billets');
  const max = e.limiteParPersonne ?? maxGlobal;
  const fuseau = e.ville?.fuseau ?? e.fuseau ?? undefined;
  const date = e.debutLe ? tampon(e.debutLe, fuseau, langue) : null;
  const maintenant = new Date();
  const types: TypePanier[] = e.typesBillet.map((tb) => ({
    id: tb.id, nom: tb.nom, description: tb.description, prixCdf: tb.prixCdf, prixUsd: tb.prixUsd, restant: tb.restant, limiteParCommande: tb.limiteParCommande,
    etat: tb.venteDebutLe && tb.venteDebutLe > maintenant ? 'pasEncore' : tb.venteFinLe && tb.venteFinLe < maintenant ? 'termine' : 'ouvert',
    ouvertureTexte: tb.venteDebutLe ? t('evenement.pasEncore', { date: dateLongue(tb.venteDebutLe, fuseau, langue) }) : undefined,
  }));
  const complet = e.statut === 'COMPLET' || (types.length > 0 && types.every((x) => x.restant === 0));
  const itineraire = e.lieu?.latitude && e.lieu.longitude
    ? `https://www.openstreetmap.org/?mlat=${e.lieu.latitude}&mlon=${e.lieu.longitude}#map=17/${e.lieu.latitude}/${e.lieu.longitude}`
    : e.lieu?.adresse ? `https://www.openstreetmap.org/search?query=${encodeURIComponent([e.lieu.adresse, e.ville?.nom].filter(Boolean).join(', '))}` : null;

  return (
    <>
      <Link className="lien-bouton" href="/" style={{ marginBottom: 8, background: 'var(--surface)', border: '2px solid var(--encre)', borderRadius: 12, padding: '0 14px', textDecoration: 'none', gap: 6 }}>
        <Icone nom="back" taille={22} />{t('evenement.tous')}
      </Link>
      <div className="evt-grille">
        <div className="pile" style={ecart(24)}>
          <article className="panneau evt-heros">
            <div className="visuel">
              <Couverture id={e.id} fond={e.categorie?.fond} variantes={e.afficheVariantes} format="16x9" cols={20} rows={7} alt="" />
              {date ? <span className="tampon" aria-hidden="true"><b>{date.jour}</b><span>{date.mois.toUpperCase()}</span></span> : null}
            </div>
            <div className="corps">
              <span style={{ fontWeight: 700 }}>{[nomCategorie(t, e.categorie), e.genre].filter(Boolean).join(' · ')}</span>
              <h1 className="affiche">{texteEvenement(e, 'titre', langue)}</h1>
              {e.sousTitre ? <p style={{ fontSize: 'var(--t-chapo)', fontWeight: 700 }}>{e.sousTitre}</p> : null}
            </div>
          </article>

          <section className="panneau pile" style={ecart(20)} aria-label={t('evenement.infosAria')}>
            <div className="infos">
              {e.debutLe ? (
                <div className="info"><span className="pic"><Icone nom="cal" taille={22} /></span><div><b style={{ fontSize: 'var(--t-texte)' }}>{dateCourte(e.debutLe, fuseau, langue)}</b>{e.ouverturePortesLe ? <div className="doux">{t('evenement.portes', { heure: heure(e.ouverturePortesLe, fuseau) })}</div> : null}</div></div>
              ) : null}
              {e.lieu ? (
                <div className="info"><span className="pic"><Icone nom="pin" taille={22} /></span><div><b style={{ fontSize: 'var(--t-texte)' }}>{e.lieu.nom}</b><div className="doux">{[e.lieu.adresse, e.ville?.nom].filter(Boolean).join(', ')}</div></div></div>
              ) : null}
            </div>
            {e.description ? <p style={{ whiteSpace: 'pre-line' }}>{texteEvenement(e, 'description', langue)}</p> : null}
            {itineraire ? (
              <div className="rangee entre envelopper"><span /><a href={itineraire} className="lien-bouton" target="_blank" rel="noopener noreferrer">{t('evenement.itineraire')}</a></div>
            ) : null}
            {e.organisateur ? (
              <div className="rangee" style={{ padding: 12, border: '2px solid var(--trait)', borderRadius: 16 }}>
                <span className="affiche" style={{ width: 48, height: 48, flex: 'none', borderRadius: 12, background: '#1E8FFF', color: '#14120E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initiales(e.organisateur.nom)}</span>
                <div style={{ flex: 1 }}><div className="doux" style={{ fontSize: 'var(--t-petit)' }}>{t('evenement.organisePar')}</div><b style={{ fontSize: 'var(--t-texte)' }}>{e.organisateur.nom}</b></div>
                {e.organisateur.verifie ? <span className="badge badge-info"><Icone nom="shieldOk" taille={14} epaisseur={3} />{t('evenement.verifie')}</span> : null}
              </div>
            ) : null}
          </section>

          <section className="panneau pile" aria-labelledby={e.programme.length ? 't-prog' : 't-savoir'}>
            {e.programme.length > 0 ? (
              <>
                <h2 id="t-prog" className="titre-section">{t('evenement.programme')}</h2>
                <ol className="programme">
                  {e.programme.map((p, i) => (
                    <li key={p.id}>
                      <span className="h">{p.heure}</span>
                      <span className="axe"><i style={{ background: COULEURS_PROGRAMME[i % 3] }} /><b /></span>
                      <span className="txt"><b>{p.titre}</b>{p.detail ? <span className="doux">{p.detail}</span> : null}</span>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            <h2 id="t-savoir" className="titre-section" style={e.programme.length ? { marginTop: 8 } : undefined}>{t('evenement.aSavoir')}</h2>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>{t('evenement.regle1')}</li>
              <li>{t('evenement.regle2')}</li>
              <li>{t('evenement.regle3')}</li>
            </ul>
            {e.infosPratiques ? <p style={{ whiteSpace: 'pre-line' }}>{texteEvenement(e, 'infosPratiques', langue)}</p> : null}
          </section>
        </div>

        {apercu ? (
          <aside className="panneau pile panier" style={ecart(14)}>
            <h2 className="titre-section">{t('evenement.vosBillets')}</h2>
            <p className="note note-info">Aperçu : le panier est désactivé.</p>
            {e.typesBillet.map((tb) => <div key={tb.id} className="categorie-billet"><h3>{tb.nom}</h3><b>{prixDouble(tb.prixCdf, tb.prixUsd, langue)}</b><span className="doux">{tb.restant} / {tb.quota}</span></div>)}
          </aside>
        ) : e.statut === 'ANNULE' || e.statut === 'TERMINE' ? (
          <aside className="panneau pile panier" style={ecart(14)}>
            <h2 className="titre-section">{t('evenement.vosBillets')}</h2>
            <p className="note note-attention">{e.statut === 'ANNULE' ? t('evenement.annule') : t('evenement.termine')}</p>
          </aside>
        ) : complet ? (
          <FormListeAttente
            evenementId={e.id}
            textes={{ titre: t('evenement.vosBillets'), statut: t('evenement.complet'), texte: t('evenement.listeAttenteTexte'), numero: t('telephone.label'), placeholder: t('telephone.placeholder'), consentement: t('evenement.listeAttenteConsentement'), envoyer: t('evenement.listeAttente') }}
          />
        ) : (
          <Panier
            slug={e.slug}
            types={types}
            max={max}
            langue={langue}
            textes={{
              vosBillets: t('evenement.vosBillets'), maxParPersonne: t.raw('evenement.maxParPersonne') as string, epuise: t('evenement.epuise'),
              plusQue: t.raw('evenement.plusQue') as string, disponible: t('evenement.disponible'), venteTerminee: t('evenement.venteTerminee'),
              retirer: t.raw('evenement.retirer') as string, ajouter: t.raw('evenement.ajouter') as string, quantite: t.raw('evenement.quantite') as string,
              limite: t.raw('evenement.limite') as string, aucunChoisi: t('evenement.aucunChoisi'), unBillet: t('evenement.nbBillets', { n: 1 }),
              plusieursBillets: '{n} ' + t('evenement.nbBillets', { n: 2 }).replace(/^\d+\s*/, ''), continuer: t('evenement.continuer'), gratuit: t('commun.gratuit'),
            }}
          />
        )}
      </div>
    </>
  );
}
