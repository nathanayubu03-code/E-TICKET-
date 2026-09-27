import { getTranslations } from 'next-intl/server';

export default async function Accueil() {
  const t = await getTranslations('accueil');
  return (
    <main className="conteneur">
      <section className="panneau pile" aria-labelledby="titre-attente">
        <h1 id="titre-attente" className="affiche" style={{ fontSize: 'clamp(40px, 6vw, 64px)' }}>{t('attenteTitre')}</h1>
        <p style={{ fontSize: 18, maxWidth: 620 }}>{t('attenteTexte')}</p>
      </section>
    </main>
  );
}
