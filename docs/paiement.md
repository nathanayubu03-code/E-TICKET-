# Paiement Mobile Money

## Architecture

Tout passe par l'interface `PaymentProvider` (`lib/paiement/fournisseur.ts`) :

| Méthode | Rôle |
|---|---|
| `initier(commande, numero, operateur)` | Envoie la demande de paiement sur le téléphone du client (push USSD). Reçoit une clé d'idempotence liée à la commande. |
| `verifierStatut(referenceOperateur, paiementId)` | Interroge le fournisseur pour un paiement sans webhook. |
| `verifierWebhook(requeteBrute)` | Vérifie la signature sur le corps brut et lit l'événement. Renvoie `null` si la signature est invalide. |
| `normaliserStatut(brut)` | Traduit le statut du fournisseur en `EN_ATTENTE`, `REUSSI`, `ECHOUE` ou `EXPIRE`. |

Le fournisseur est choisi par `PAYMENT_PROVIDER`. Pour brancher l'agrégateur retenu :

1. créer `lib/paiement/<agregateur>.ts` qui implémente `PaymentProvider` ;
2. ajouter sa valeur dans `FOURNISSEURS_PAIEMENT` (`lib/env.ts`) et ses variables (clé API, secret de webhook, URL) dans le schéma d'environnement ;
3. l'ajouter dans le `switch` de `fournisseurPaiement()` (`lib/paiement/index.ts`) ;
4. déclarer l'URL de webhook chez l'agrégateur : `https://<domaine>/api/webhooks/paiement/<agregateur>`.

Rien d'autre ne change : réservation, idempotence, génération des billets, vérification planifiée, SMS et administration sont indépendants du fournisseur.

## Déroulé

1. Choix des billets : commande `EN_ATTENTE`, places réservées 10 minutes par décrément conditionnel du stock (`lib/commandes.ts`).
2. Choix de l'opérateur et du numéro : `demanderPaiement` crée un `Payment` avec une clé d'idempotence unique `commande:tentative`. Un double clic ou un rechargement renvoie la demande en cours ; seul « Renvoyer la demande » crée une nouvelle tentative.
3. Écran d'attente de 2 minutes : le navigateur interroge `/api/commandes/<code>/statut` toutes les 3 secondes. Cette route lit notre base, jamais l'opérateur.
4. Webhook : corps brut enregistré dans `PaymentEvent` avant tout traitement (même quand la signature est fausse), signature vérifiée, montant comparé, puis confirmation idempotente. Le paiement passe `REUSSI`, la commande `PAYEE` et les billets sont générés dans une seule transaction. Le même webhook reçu trois fois ne produit les billets qu'une fois (test `tests/unit/paiement.test.ts`).
5. Vérification planifiée (`/api/cron/verifier-paiements`) : pour tout paiement sans réponse, premier appel à `verifierStatut` après 90 secondes, puis toutes les 2 minutes pendant 15 minutes. Au-delà, le paiement passe `EXPIRE`. C'est ce qui tient la promesse de l'écran « Temps écoulé » : « si votre compte est débité, vos billets arrivent tout seuls par SMS dans les 15 minutes ».
6. Paiement confirmé après expiration de la réservation : les places sont reprises si elles sont encore libres ; sinon la commande passe `PAYEE_SANS_PLACE`, un SMS prévient l'acheteur et la commande apparaît en priorité dans l'administration pour remboursement.
7. Les billets ne sont jamais générés sur un retour navigateur.

Montants : entiers en CDF. L'USD n'est qu'un affichage indicatif au taux saisi par un administrateur.

Contrainte métier : les agrégateurs en RDC ne partagent pas les revenus automatiquement. Tout arrive sur le compte marchand d'e-Ticket ; la commission est figée sur chaque commande ; les reversements aux organisateurs sont enregistrés ensuite dans l'administration.

## Devises (CDF ou USD)

- Chaque catégorie de billet a un prix en CDF (obligatoire) et un prix en USD (facultatif), saisis par l'administrateur. Aucune conversion automatique.
- Montants en entiers dans la plus petite unité : francs pour le CDF, centimes pour l'USD. Chaque commande, paiement, réclamation, billet et reversement porte sa devise. Le tableau de bord, les reversements et l'export Excel séparent toujours CDF et USD.
- La commande est réservée en CDF. Sur l'écran de paiement, l'acheteur choisit « Payer en CDF » ou « Payer en USD » (bouton USD seulement si chaque catégorie du panier a un prix USD). `choisirDevise` (`lib/commandes.ts`) recalcule alors prix unitaires, remise, total et commission ; refusé si un paiement est déjà en cours.
- La demande envoyée au fournisseur (`CommandeAPayer.devise`) et le webhook (`EvenementWebhook.devise`) portent la devise ; un webhook dans une autre devise que celle du paiement est refusé comme un montant différent.
- Devises acceptées par opérateur : `lib/operateurs.ts` (`devises`, `devisesAConfirmer`). CDF et USD partout tant que l'agrégateur n'a pas répondu (question 5). Un opérateur qui n'accepte pas la devise choisie est masqué.
- Codes promo : un pourcentage s'applique aux deux devises ; un montant fixe seulement dans sa devise.
- Paiement chez un agent : deux jeux de numéros marchands (paramètres `numeros_marchands` et `numeros_marchands_usd`). L'agent voit la devise et le montant attendus.

## Paiement chez un agent

L'acheteur reçoit son code de commande (`ET-XXXXXX`) et les numéros marchands saisis dans Paramètres, envoie le montant exact, puis saisit la référence de transaction reçue par SMS de son opérateur. La réservation passe à 2 heures. Un AGENT valide ou refuse dans `/admin/paiements/manuels`. Une référence ne sert qu'une fois (contrainte unique opérateur + référence).

## Simulation (développement uniquement)

`PAYMENT_PROVIDER=simulation` n'envoie rien à personne. L'application refuse de démarrer en production avec cette valeur. La réponse de « l'opérateur » dépend de la fin du numéro de paiement :

| Fin du numéro | Réponse |
|---|---|
| `0000` | refusé (écran « Paiement refusé ») |
| `9999` | aucune réponse (écran « Temps écoulé » après 2 minutes) |
| autre | reçu après 4 secondes |

La réponse arrive par un webhook signé (HMAC avec `SIMULATION_WEBHOOK_SECRET`) et suit exactement le même traitement qu'un webhook réel.

## Informations à demander à l'agrégateur

À envoyer tel quel à l'agrégateur retenu.

**Initiation du paiement**

1. Point d'accès et format de la requête de paiement (push USSD) pour chaque opérateur : M-Pesa (Vodacom), Airtel Money, Orange Money, Afrimoney (Africell).
2. Authentification : clé API, jeton OAuth, certificat client ? Durée de vie des jetons, renouvellement.
3. Idempotence : acceptez-vous une clé d'idempotence ou une référence marchande unique ? Que se passe-t-il si la même référence est envoyée deux fois ?
4. Pouvons-nous transmettre notre propre référence (identifiant de paiement) et la retrouvez-vous dans le webhook et l'API de statut ?
5. Quelles devises acceptez-vous pour chaque opérateur en RDC, et les frais sont-ils les mêmes en CDF et en USD ? Montants minimum et maximum par transaction et par devise. Le montant USD s'envoie-t-il en dollars avec décimales ou en centimes ?
6. Format du numéro attendu (`+243…`, `243…`, `0…`).
7. Délai d'expiration de la demande côté opérateur.

**Webhook**

8. Format exact du corps (exemples réels pour succès, échec, expiration, annulation par le client).
9. Méthode de signature : algorithme (HMAC-SHA256 ?), en-tête utilisé, ce qui est signé (corps brut, horodatage), secret par environnement, rotation du secret.
10. Identifiant unique de l'événement (pour dédoublonner) et politique de renvoi (nombre de tentatives, intervalle, codes HTTP considérés comme reçus).
11. Adresses IP d'origine, si vous en publiez la liste.
12. Le montant et la référence opérateur figurent-ils dans le webhook ?

**Statut**

13. API de consultation de statut par référence : point d'accès, limites de débit, liste complète des statuts possibles et leur signification.
14. Délai maximal au-delà duquel un statut « en attente » est définitif.

**Environnements et exploitation**

15. Environnement de test (bac à sable) : URL, identifiants, numéros de test qui simulent succès, refus et absence de réponse.
16. Procédure de passage en production et délais.
17. Relevés : export des transactions du compte marchand (format, fréquence) pour le rapprochement.
18. Remboursements : existe-t-il une API, ou faut-il passer par le support ?
19. Frais par transaction et par opérateur, délais de mise à disposition des fonds.
20. Contact technique et astreinte en cas d'incident.
