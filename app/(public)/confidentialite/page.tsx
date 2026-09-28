import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Contact, Editeur } from '@/components/legal/Editeur';
import { ecart } from '@/lib/style';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('pages'))('confidentialite') };
}

// Texte en français simple, fidèle à ce que fait l'application. Points à faire valider par un juriste :
// voir docs/legal-a-valider.md. Le français fait foi.
export default async function Confidentialite() {
  return (
    <main className="conteneur">
      <article className="panneau pile" style={ecart(18, { maxWidth: 820, marginInline: 'auto', lineHeight: 1.6 })}>
        <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Confidentialité</h1>
        {(await getLocale()) !== 'fr' ? <p className="note note-info" >{(await getTranslations('pages'))('francaisSeulement')}</p> : null}
        <p>Cette page explique quelles données e-Ticket RDC utilise, pourquoi, avec qui elles sont partagées et comment exercer vos droits. Elle s&apos;applique au site, à l&apos;application installée sur téléphone et au scanner des contrôleurs.</p>
        <Editeur />

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Ce que nous collectons</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><b>Votre numéro de téléphone.</b> Il sert à vous connecter par code SMS, à envoyer vos billets et à retrouver vos commandes. C&apos;est la seule donnée obligatoire.</li>
            <li><b>Vos commandes et vos billets :</b> événement, catégories, montants, date, statut, et l&apos;heure et la porte du passage à l&apos;entrée quand le billet est scanné.</li>
            <li><b>Vos paiements :</b> opérateur, numéro qui paie, montant et référence de transaction. Nous ne voyons jamais votre code secret Mobile Money : vous le tapez seulement dans le message de votre opérateur.</li>
            <li><b>Les alertes SMS</b>, si vous les demandez : numéro, ville choisie, date et texte exact de votre accord.</li>
            <li><b>La liste d&apos;attente</b>, si vous vous y inscrivez : numéro, événement et date de votre accord.</li>
            <li><b>Des données techniques</b> nécessaires au fonctionnement et à la sécurité : adresse IP (limitation des abus), cookies de session, journal des actions de l&apos;équipe e-Ticket.</li>
          </ul>
          <p>Nous ne demandons pas votre nom pour acheter. Nous n&apos;utilisons ni publicité, ni outil de mesure d&apos;audience, ni traceur d&apos;une autre société.</p>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Pourquoi</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Vendre et délivrer vos billets, et vous les renvoyer si vous les perdez.</li>
            <li>Contrôler les entrées et empêcher qu&apos;un billet serve deux fois.</li>
            <li>Vérifier les paiements, rembourser quand c&apos;est prévu, reverser leur part aux organisateurs.</li>
            <li>Prévenir la fraude et les abus (limites de tentatives, journal de sécurité).</li>
            <li>Vous envoyer des alertes sur les nouveaux événements, seulement si vous l&apos;avez demandé.</li>
          </ul>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Avec qui nous partageons</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><b>Les opérateurs Mobile Money et notre prestataire de paiement</b>, pour traiter le paiement : numéro qui paie, montant, référence.</li>
            <li><b>Notre prestataire SMS</b>, pour envoyer codes et billets : numéro et texte du message.</li>
            <li><b>Nos hébergeurs</b>, qui stockent le site, la base de données et les affiches. Ils sont situés en Europe.</li>
            <li><b>Les organisateurs</b> voient les ventes de leurs événements avec des numéros masqués (par exemple +243 97 *** ** 67).</li>
            <li><b>Les contrôleurs</b> ne reçoivent pas vos numéros : leur scanner ne connaît qu&apos;une empreinte de chaque billet.</li>
          </ul>
          <p>Nous ne vendons pas vos données.</p>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Sur votre téléphone</h2>
          <p>Pour que vos billets s&apos;ouvrent sans internet, ils sont enregistrés dans le stockage de votre navigateur (IndexedDB). Le site utilise aussi quelques cookies indispensables : session de connexion, langue et thème choisis. Vous pouvez tout effacer depuis les réglages de votre navigateur ; vos billets restent alors disponibles en vous reconnectant.</p>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Combien de temps</h2>
          <p>Les commandes, paiements et billets sont conservés tant que nécessaire pour les remboursements, les reversements aux organisateurs et nos obligations comptables. Les codes de connexion expirent après 5 minutes. Les alertes SMS cessent dès votre désinscription.</p>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Vos droits</h2>
          <p>Vous pouvez demander à consulter les données qui vous concernent, à les faire corriger ou supprimer quand la loi le permet, et vous opposer aux alertes SMS. Pour arrêter les alertes tout de suite : <Link href="/alertes">page Alertes SMS</Link>. Pour les autres demandes, écrivez-nous : <Contact objet="Données personnelles" />. Nous répondons depuis le numéro concerné, pour vérifier qu&apos;il s&apos;agit bien de vous.</p>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Sécurité</h2>
          <p>Connexions chiffrées, codes de connexion jamais stockés en clair, accès de l&apos;équipe protégé par mot de passe et code SMS, journal non modifiable des actions de l&apos;équipe, numéros de reversement des organisateurs chiffrés.</p>
        </section>

        <p className="doux">Cette page peut évoluer ; la version en ligne fait foi. Le texte français est la référence.</p>
      </article>
    </main>
  );
}
