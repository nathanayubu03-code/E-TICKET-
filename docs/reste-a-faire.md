# Reste à faire pour la production réelle

Classé par ordre de blocage : chaque point du haut empêche d'ouvrir la vente.

## 1. Bloquant : paiement Mobile Money réel

- Choisir l'agrégateur, lui envoyer la liste de questions de `docs/paiement.md`, obtenir les identifiants de test puis de production.
- Écrire l'adaptateur (`lib/paiement/<agregateur>.ts`) : `initier`, `verifierStatut`, `verifierWebhook`, `normaliserStatut`. Le reste (réservation, idempotence, billets, vérification planifiée, administration) est prêt.
- Tester dans leur bac à sable : succès, refus, absence de réponse, webhook reçu plusieurs fois, montant différent.
- Confirmer les préfixes des numéros par opérateur (`lib/operateurs.ts`, en particulier Africell 090 et 091, marqués « à confirmer »).
- Décider du plan Vercel ou du planificateur externe pour la vérification toutes les 2 minutes (`docs/deploiement.md`, section 5).

## 2. Bloquant : fournisseur SMS

- Choisir le fournisseur, écrire l'adaptateur `SmsProvider` (`lib/sms/`), tester la délivrance chez les quatre opérateurs.
- Sans SMS, personne ne peut se connecter (acheteurs comme administrateurs) : c'est aussi bloquant que le paiement.
- Vérifier la longueur et l'encodage des messages (les accents peuvent faire passer un SMS en plusieurs parties) et l'identifiant d'expéditeur.

## 3. Bloquant : pages Conditions et Confidentialité validées par un juriste

- Questions listées dans `docs/legal-a-valider.md` (Code du numérique, transfert des données hors de la RDC, conservation, rétractation, statut de l'encaissement pour le compte des organisateurs).
- Renseigner les variables `EDITEUR_*` et `CONTACT_EMAIL`.
- Rédiger le contrat avec les organisateurs (commission, reversements, remboursements).

## 4. Bloquant : domaine et mise en ligne

- Choisir le domaine, configurer Vercel, Neon et R2 (`docs/deploiement.md`).
- Renseigner `NEXT_PUBLIC_SITE_URL` (sans elle, les SMS de billets ne contiennent pas de lien), `CONTACT_ORGANISATEURS_*`.
- Lancer le seed de production et créer les comptes de l'équipe (ADMIN, AGENT).

## 5. Avant l'ouverture : essais sur le terrain

- Lisibilité du QR : essai réel avec des téléphones de contrôleurs et d'acheteurs, en extérieur, luminosité au maximum (`docs/billet.md`).
- Scanner : une répétition complète avec deux appareils, dont un en mode avion, puis synchronisation.
- Lighthouse sur le domaine réel depuis Kinshasa ou une connexion équivalente (les mesures de `PLAN.md` sont faites en local).
- Test d'intrusion externe, sauvegarde et restauration de la base testées, rotation des secrets documentée (`docs/securite.md`).

## 6. Traductions lingala et swahili

- `messages/ln.json` et `messages/sw.json` ne contiennent que les libellés déjà proposés par la maquette ; tout le reste s'affiche en français.
- Faire traduire puis relire par des locuteurs natifs (Kinshasa pour le lingala ; Lubumbashi et Goma pour le swahili, qui diffère du swahili standard), en ajoutant les clés dans ces fichiers. Aucune traduction automatique.
- Les pages Conditions et Confidentialité et l'administration restent en français.

## 7. Prévu en V1 (hors MVP)

- Libre-service des organisateurs avec validation par l'administrateur (le statut `A_VALIDER` existe déjà).
- Connexion par e-mail et Google.
- Codes promo avancés, liste d'attente avec proposition automatique des places libérées (aujourd'hui : prévenue par un administrateur).
- Reçus fiscaux.
- Désinscription des alertes par SMS (mot-clé STOP), selon le fournisseur.
- Suppression automatique des données selon les durées de conservation décidées avec le juriste.

## 8. Prévu en V2

Application scanner native, revente encadrée entre particuliers, plans de salle avec places numérotées, statistiques avancées, API pour les partenaires.
