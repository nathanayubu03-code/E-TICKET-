import type { Metadata } from 'next';
import Link from 'next/link';
import { Contact, Editeur } from '@/components/legal/Editeur';
import { parametre } from '@/lib/parametres';
import { ecart } from '@/lib/style';

export const metadata: Metadata = { title: 'Conditions' };

// Conditions d'utilisation et de vente, en français simple. Points à faire valider par un juriste :
// voir docs/legal-a-valider.md. Le français fait foi.
export default async function Conditions() {
  const max = await parametre('limite_billets');
  return (
    <main className="conteneur">
      <article className="panneau pile" style={ecart(18, { maxWidth: 820, marginInline: 'auto', lineHeight: 1.6 })}>
        <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Conditions</h1>
        <p>Ces conditions s&apos;appliquent à l&apos;utilisation d&apos;e-Ticket RDC et à tout achat de billet sur le site ou l&apos;application.</p>
        <Editeur />

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Le service</h2>
          <p>e-Ticket RDC vend en ligne des billets pour des événements organisés par d&apos;autres : concerts, matchs, festivals, conférences, spectacles. L&apos;organisateur de chaque événement est indiqué sur sa page. Il est responsable de l&apos;événement lui-même : programme, horaires, lieu, accueil, sécurité sur place.</p>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Votre compte</h2>
          <p>Vous vous connectez avec votre numéro de téléphone et un code reçu par SMS. Ne donnez ce code à personne. Toute commande faite depuis votre numéro est considérée comme faite par vous.</p>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Acheter</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Les prix sont en francs congolais (CDF). L&apos;équivalent en dollars est indicatif, au taux affiché.</li>
            <li>{max} billets maximum par personne et par événement, sauf limite différente indiquée sur l&apos;événement.</li>
            <li>Quand vous choisissez vos billets, vos places sont gardées 10 minutes pendant le paiement (2 heures pour un paiement chez un agent).</li>
            <li>Vous payez par Mobile Money : vous validez sur votre téléphone, dans le message de votre opérateur. e-Ticket ne vous demande jamais votre code secret, ni par appel, ni par SMS, ni sur WhatsApp.</li>
            <li>La vente est conclue quand l&apos;opérateur nous confirme le paiement. Vos billets arrivent alors sur le site et par SMS.</li>
            <li>Si votre compte est débité mais que la confirmation arrive en retard, vos billets arrivent par SMS dès qu&apos;elle arrive. Ne payez pas une deuxième fois.</li>
          </ul>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Vos billets</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>1 billet = 1 entrée. Le premier passage à l&apos;entrée l&apos;utilise ; un billet déjà scanné est refusé.</li>
            <li>Votre billet et le lien reçu par SMS valent titre d&apos;accès : ne les partagez pas. Une capture d&apos;écran ne reproduit pas le motif vivant et peut être refusée par le contrôleur.</li>
            <li>Gardez votre téléphone chargé. Le billet s&apos;ouvre même sans internet une fois enregistré sur votre téléphone ; un PDF est aussi disponible.</li>
            <li>La revente de billets n&apos;est pas proposée sur e-Ticket.</li>
          </ul>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Remboursement</h2>
          <p>Remboursement seulement si l&apos;événement est annulé. Il se fait sur le numéro Mobile Money qui a payé. Si votre paiement a été confirmé alors que les places avaient été prises pendant l&apos;attente, vous êtes remboursé et prévenu par SMS.</p>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Utilisation loyale</h2>
          <p>Il est interdit de copier ou de falsifier un billet, de tenter d&apos;accéder aux comptes d&apos;autres personnes ou de perturber le service. En cas de fraude, les billets concernés peuvent être annulés.</p>
        </section>

        <section className="pile" style={ecart(8)}>
          <h2 className="titre-section">Nous contacter</h2>
          <p>Une question, un problème de paiement ou de billet : <Contact objet="Question sur une commande" />. Consultez aussi l&apos;<Link href="/aide">aide</Link>.</p>
        </section>

        <p className="doux">Ces conditions peuvent évoluer ; la version en vigueur au moment de votre achat s&apos;applique à cet achat. Le texte français est la référence.</p>
      </article>
    </main>
  );
}
