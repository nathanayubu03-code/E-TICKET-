# Points à faire valider par un juriste

Les pages `/conditions` et `/confidentialite` décrivent en français simple ce que fait réellement l'application. Elles ne citent aucun article de loi et n'affirment aucune obligation légale : c'est volontaire. Les questions ci-dessous demandent l'avis d'un juriste qui connaît le droit congolais, en particulier le Code du numérique (ordonnance-loi n° 23/010 du 13 mars 2023). Je n'ai pas vérifié le texte de ce code ; je ne peux donc pas dire lesquels de ces points il règle.

## Données personnelles

1. Faut-il une déclaration ou une autorisation préalable auprès d'une autorité de protection des données pour ce traitement (numéros de téléphone, historique d'achats, entrées aux événements) ? Laquelle, et selon quelle procédure ?
2. Hébergement en Europe (Vercel, Neon, Cloudflare R2) : le transfert de données hors de la RDC est-il encadré (autorisation, clauses contractuelles, information renforcée) ?
3. Durées de conservation : combien de temps garder commandes, paiements, billets, scans, journaux techniques, journal d'audit ? (Aujourd'hui, rien n'est effacé automatiquement.) Obligations comptables applicables ?
4. Base légale de chaque traitement (exécution de la vente, obligation légale, intérêt légitime pour la lutte contre la fraude, consentement pour les alertes) : la présentation actuelle convient-elle ?
5. Consentement aux alertes SMS : le texte actuel (« J'accepte de recevoir des SMS d'e-Ticket RDC quand un événement est publié. Je peux me désinscrire à tout moment sur la page Alertes SMS. ») suffit-il ? Faut-il un moyen de désinscription par SMS (mot-clé STOP) ?
6. Délai de réponse aux demandes d'accès, de rectification et de suppression ; vérification d'identité par le numéro de téléphone : acceptable ?
7. Désignation d'un responsable ou délégué à la protection des données : obligatoire ?
8. Notification des violations de données : à qui, sous quel délai ?
9. Stockage des billets sur le téléphone (IndexedDB) et cookies strictement nécessaires : une bannière d'information ou de consentement est-elle requise ?

## Vente et consommation

10. Mentions obligatoires de l'éditeur (raison sociale, forme, RCCM, identification nationale, numéro d'impôt, adresse, contact) : liste exacte. Elles s'affichent dès que les variables `EDITEUR_*` sont renseignées.
11. Statut d'e-Ticket dans la vente : intermédiaire (mandataire de l'organisateur) ou revendeur ? Conséquences sur la TVA, la facturation et la responsabilité.
12. Droit de rétractation pour la vente à distance de billets datés : s'applique-t-il ou existe-t-il une exception ? La règle « remboursement seulement si l'événement est annulé » (texte de la maquette) est-elle licite telle quelle ?
13. Événement reporté (et non annulé) : quelle règle de remboursement ?
14. Limitation de responsabilité d'e-Ticket vis-à-vis de l'événement lui-même : formulation acceptable ?
15. Loi applicable et tribunal compétent à mentionner.
16. Reçus : faut-il délivrer un reçu ou une facture à chaque achat ? (Les reçus fiscaux sont prévus en V1.)
17. Contrat avec les organisateurs (commission, reversements, responsabilité, remboursements) : à rédiger à part.

## Paiement

18. Encaissement pour le compte des organisateurs sur le compte marchand d'e-Ticket, puis reversement : faut-il un agrément ou un statut particulier (établissement de paiement, mandat d'encaissement) ?
19. Obligations de lutte contre le blanchiment liées à l'agrégateur et aux opérateurs (plafonds, vérification d'identité).
