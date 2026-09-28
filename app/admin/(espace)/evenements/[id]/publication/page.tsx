import { BoutonAction } from '@/components/admin/BoutonAction';
import { evenementAEditer } from '@/lib/admin/charger';
import { manquesPublication } from '@/lib/admin/evenements';
import { LIBELLES_STATUT } from '@/lib/admin/libelles';
import { db } from '@/lib/db';
import { changerStatut, prevenirAttente } from '../../actions';

export default async function EtapePublication({ params }: { params: Promise<{ id: string }> }) {
  const e = await evenementAEditer((await params).id);
  const manques = manquesPublication(e);
  const attente = await db.waitlistEntry.count({ where: { evenementId: e.id, prevenuLe: null } });
  return (
    <section className="admin-panneau pile" style={{ ['--gap' as string]: '16px' }} aria-label="Publication">
      <p>Statut actuel : <b>{LIBELLES_STATUT[e.statut]}</b></p>
      {e.statut === 'BROUILLON' || e.statut === 'A_VALIDER' ? (
        manques.length > 0 ? (
          <div className="note note-attention" style={{ display: 'block' }} role="status">
            <b>Pour publier, il manque :</b>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>{manques.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        ) : (
          <>
            <p className="note note-succes">Tout est prêt. Une fois publié, l&apos;événement apparaît tout de suite sur l&apos;accueil.</p>
            <BoutonAction classe="btn btn-principal btn-grand" libelle="Publier l'événement" action={changerStatut.bind(null, e.id, 'PUBLIE')} />
          </>
        )
      ) : null}
      <div className="rangee envelopper">
        {e.statut === 'PUBLIE' ? <BoutonAction libelle="Marquer complet" action={changerStatut.bind(null, e.id, 'COMPLET')} /> : null}
        {e.statut === 'COMPLET' ? <BoutonAction libelle="Rouvrir la vente" action={changerStatut.bind(null, e.id, 'PUBLIE')} /> : null}
        {e.statut === 'PUBLIE' ? <BoutonAction libelle="Repasser en brouillon" confirmation="L'événement disparaîtra du site. Continuer ?" action={changerStatut.bind(null, e.id, 'BROUILLON')} /> : null}
        {e.statut === 'PUBLIE' || e.statut === 'COMPLET' ? <BoutonAction libelle="Marquer terminé" confirmation="Marquer l'événement comme terminé ?" action={changerStatut.bind(null, e.id, 'TERMINE')} /> : null}
        {e.statut !== 'ANNULE' && e.statut !== 'TERMINE' ? <BoutonAction danger libelle="Annuler l'événement" confirmation="Annuler l'événement ? Les ventes s'arrêtent. Les remboursements se font ensuite depuis « Commandes »." action={changerStatut.bind(null, e.id, 'ANNULE')} /> : null}
      </div>
      {attente > 0 ? (
        <div className="pile" style={{ ['--gap' as string]: '8px', borderTop: '2px dashed var(--trait)', paddingTop: 16 }}>
          <p><b>{attente}</b> personne{attente > 1 ? 's' : ''} sur la liste d&apos;attente.</p>
          <BoutonAction libelle="Prévenir la liste d'attente par SMS" confirmation="Envoyer un SMS à la liste d'attente ? À faire quand des places sont de nouveau en vente." action={prevenirAttente.bind(null, e.id)} />
        </div>
      ) : null}
    </section>
  );
}
