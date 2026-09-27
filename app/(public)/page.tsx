import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ApercuBillet } from '@/components/public/ApercuBillet';
import { BandeOrganisateurs } from '@/components/public/BandeOrganisateurs';
import { BlocUne } from '@/components/public/BlocUne';
import { CarteEvenement } from '@/components/public/CarteEvenement';
import { EtapesMobileMoney } from '@/components/public/EtapesMobileMoney';
import { EtatVide } from '@/components/public/EtatVide';
import { FormAlerteSms } from '@/components/public/FormAlerteSms';
import { Icone } from '@/components/ui/Icone';
import { evenementsPublics, villesEtCategoriesPubliques } from '@/lib/evenements';
import { parametre, tauxCourant } from '@/lib/parametres';
import { ecart } from '@/lib/style';

export const dynamic = 'force-dynamic';

type Params = Promise<{ ville?: string; cat?: string; q?: string }>;

function lien(base: { ville?: string; cat?: string; q?: string }, change: { ville?: string | null; cat?: string | null }) {
  const p = new URLSearchParams();
  const ville = change.ville === undefined ? base.ville : change.ville;
  const cat = change.cat === undefined ? base.cat : change.cat;
  if (ville) p.set('ville', ville);
  if (cat) p.set('cat', cat);
  if (base.q) p.set('q', base.q);
  const s = p.toString();
  return s ? `/?${s}#evenements` : '/#evenements';
}

export default async function Accueil({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const t = await getTranslations();
  const filtres = { ville: sp.ville || undefined, cat: sp.cat || undefined, q: sp.q?.slice(0, 80) || undefined };
  const [tous, { villes, categories }, taux, max] = await Promise.all([
    evenementsPublics(),
    villesEtCategoriesPubliques(),
    tauxCourant(),
    parametre('limite_billets'),
  ]);
  const cdfParUsd = taux?.cdfParUsd ?? null;
  const textesAlerte = {
    titre: t('alertes.titre'), texte: t('alertes.texte'), numero: t('alertes.numero'), placeholder: t('telephone.placeholder'),
    ville: t('alertes.ville'), toutesVilles: t('alertes.toutesVilles'), consentement: t('alertes.consentement'), envoyer: t('alertes.envoyer'),
  };

  // Aucun événement publié : page de marque, sans bloc « À la une » ni grille vide.
  if (tous.length === 0) {
    return (
      <main className="conteneur">
        <section className="heros" aria-labelledby="titre-attente">
          <article className="panneau une">
            <div className="bandeau"><span className="etiquette">e-Ticket RDC</span></div>
            <div className="corps">
              <h1 id="titre-attente" className="affiche">{t('accueil.attenteTitre')}</h1>
              <p style={{ fontSize: 18, maxWidth: 560 }}>{t('accueil.attenteTexte')}</p>
            </div>
          </article>
          <aside className="panneau pile" style={ecart(14)} aria-labelledby="titre-alerte">
            <h2 id="titre-alerte" className="titre-section">{t('alertes.titre')}</h2>
            <p className="doux">{t('alertes.texte')}</p>
            <FormAlerteSms textes={textesAlerte} villes={villes} />
          </aside>
        </section>
        <EtapesMobileMoney max={max} />
        <BandeOrganisateurs />
      </main>
    );
  }

  const une = tous[0]!;
  const unSeul = tous.length === 1;
  const filtre = filtres.ville || filtres.cat || filtres.q;
  const liste = filtre ? await evenementsPublics(filtres) : tous;
  const villeActive = villes.find((v) => v.slug === filtres.ville);

  return (
    <main className="conteneur">
      <section className="heros" aria-label={t('accueil.aLaUneAria')}>
        <BlocUne e={une} taux={cdfParUsd} />
        <ApercuBillet e={une} />
      </section>

      {unSeul ? null : (
        <>
          <section aria-labelledby="titre-liste">
            <div className="panneau pile" style={ecart(18)}>
              <div className="rangee entre envelopper">
                <h2 id="titre-liste" className="titre-section">{t('accueil.trouver')}</h2>
                <form action="/" method="get" role="search" className="saisie" style={{ minHeight: 48, maxWidth: 340, flex: '1 1 240px' }}>
                  <label className="sr" htmlFor="recherche">{t('accueil.rechercher')}</label>
                  <span className="prefixe" style={{ background: 'transparent', border: 'none', paddingRight: 0 }}><Icone nom="search" /></span>
                  <input id="recherche" type="search" name="q" defaultValue={filtres.q} placeholder={t('accueil.recherchePlaceholder')} style={{ fontSize: 17, letterSpacing: 0 }} />
                  {filtres.ville ? <input type="hidden" name="ville" value={filtres.ville} /> : null}
                  {filtres.cat ? <input type="hidden" name="cat" value={filtres.cat} /> : null}
                </form>
              </div>
              {villes.length > 1 ? (
                <div className="pastilles" role="group" aria-label={t('accueil.ville')}>
                  <Link className="pastille" href={lien(filtres, { ville: null })} aria-current={!filtres.ville ? 'true' : undefined}>{t('accueil.toutes')}</Link>
                  {villes.map((v) => (
                    <Link key={v.slug} className="pastille" href={lien(filtres, { ville: v.slug })} aria-current={filtres.ville === v.slug ? 'true' : undefined}>{v.nom}</Link>
                  ))}
                </div>
              ) : null}
              {categories.length > 1 ? (
                <div className="categories" role="group" aria-label={t('accueil.categorie')}>
                  {categories.map((c) => (
                    <Link key={c.slug} className="categorie" href={lien(filtres, { cat: filtres.cat === c.slug ? null : c.slug })} aria-current={filtres.cat === c.slug ? 'true' : undefined}>
                      <span className="pic" style={{ background: c.fond, color: c.texte }}><Icone nom={c.icone as 'music'} taille={24} /></span>{c.nom}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section id="evenements" aria-live="polite">
            <div className="rangee entre" style={{ marginBottom: 14 }}>
              <h2 className="titre-section panneau" style={{ padding: '10px 18px', boxShadow: 'none' }}>
                {villeActive ? t('accueil.aVilleBientot', { ville: villeActive.nom }) : t('accueil.partout')}
              </h2>
            </div>
            {liste.length > 0 ? (
              <div className="grille">{liste.map((e) => <CarteEvenement key={e.id} e={e} taux={cdfParUsd} />)}</div>
            ) : (
              <EtatVide titre={t('accueil.videTitre')} texte={t('accueil.videTexte')}>
                <Link className="btn btn-principal" href="/#evenements">{t('accueil.effacerFiltres')}</Link>
                <Link className="btn" href="/alertes">{t('accueil.alerterSms')}</Link>
              </EtatVide>
            )}
          </section>
        </>
      )}

      <EtapesMobileMoney max={max} />
      <BandeOrganisateurs />
    </main>
  );
}
