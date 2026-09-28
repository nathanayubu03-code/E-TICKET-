# Textes anglais à relire

Fichier généré par `node outils/doc-traductions.mjs` à partir de `messages/fr.json` et `messages/en.json`. Ne pas modifier à la main : corriger `messages/en.json`, puis relancer le script.

Consignes suivies : anglais simple et naturel, phrases courtes, même ton que le français, pas de traduction mot à mot. Les mots entre accolades (`{montant}`, `{n}`...) sont remplacés par le site ; les balises `<b>` mettent en gras. Les garder tels quels.

Hors de ce fichier, aussi à relire :

- les SMS (`lib/sms/gabarits.ts`) : billets prêts, paiement reçu sans place, référence refusée, liste d'attente, nouvel événement, code de connexion ;
- le PDF du billet (clés `billet.*` ci-dessous) ;
- les pages Conditions et Confidentialité restent en français (texte juridique à faire valider par un juriste avant toute traduction) ; un visiteur en anglais voit la mention `pages.francaisSeulement`.

328 textes.

## commun

| Clé | Français | Anglais |
|---|---|---|
| `commun.marque` | e-Ticket | e-Ticket |
| `commun.rdc` | RDC | RDC |
| `commun.chargement` | Chargement… | Loading… |
| `commun.reessayer` | Réessayer | Try again |
| `commun.gratuit` | Gratuit | Free |
| `commun.surInscription` | sur inscription | registration required |
| `commun.environUsd` | ≈ {montant} USD | ≈ {montant} USD |
| `commun.tauxIndicatif` | taux indicatif du {date} | indicative rate of {date} |
| `commun.cdf` | {montant} CDF | {montant} CDF |
| `commun.des` | Dès | From |
| `commun.fermer` | Fermer | Close |
| `commun.retour` | Retour | Back |
| `commun.erreurInconnue` | Une erreur est survenue. Réessayez dans un instant. | Something went wrong. Please try again in a moment. |
| `commun.tropDeDemandes` | Trop de demandes. Réessayez dans quelques minutes. | Too many requests. Please try again in a few minutes. |
| `commun.champObligatoire` | Ce champ est obligatoire. | This field is required. |
| `commun.bandeauTest` | Version de test : aucun paiement réel, codes SMS affichés à l'écran | Test version: no real payments, SMS codes shown on screen |

## reseau

| Clé | Français | Anglais |
|---|---|---|
| `reseau.horsLigne` | Pas de connexion. Vos billets restent disponibles hors ligne. | No connection. Your tickets are still available offline. |
| `reseau.coupe` | La connexion a coupé | The connection dropped |
| `reseau.verifier` | Vérifiez vos données mobiles ou le wifi. | Check your mobile data or wifi. |
| `reseau.billetsDispo` | Vos billets restent disponibles hors ligne. | Your tickets are still available offline. |
| `reseau.ouvrirBillets` | Ouvrir mes billets | Open my tickets |

## entete

| Clé | Français | Anglais |
|---|---|---|
| `entete.accueil` | e-Ticket RDC, accueil | e-Ticket RDC, home |
| `entete.principale` | Principale | Main |
| `entete.evenements` | Événements | Events |
| `entete.billets` | Mes billets | My tickets |
| `entete.orga` | Organisateurs | Organizers |
| `entete.connexion` | Se connecter | Log in |
| `entete.deconnexion` | Se déconnecter | Log out |
| `entete.langue` | Langue | Language |
| `entete.themeSombre` | Passer en mode sombre | Switch to dark mode |
| `entete.themeClair` | Passer en mode clair | Switch to light mode |

## pied

| Clé | Français | Anglais |
|---|---|---|
| `pied.aria` | Pied de page | Footer |
| `pied.aide` | Aide | Help |
| `pied.agent` | Payer chez un agent | Pay at an agent |
| `pied.conditions` | Conditions | Terms |
| `pied.confidentialite` | Confidentialité | Privacy |
| `pied.alertes` | Alertes SMS | SMS alerts |

## accueil

| Clé | Français | Anglais |
|---|---|---|
| `accueil.aLaUne` | À la une | Featured |
| `accueil.aLaUneAria` | À la une | Featured |
| `accueil.reserver` | Réserver ma place | Book my seat |
| `accueil.portes` | Portes {heure} | Doors {heure} |
| `accueil.plusQue` | Plus que {n} places | Only {n} left |
| `accueil.complet` | Complet | Sold out |
| `accueil.apercuAria` | Le billet vivant | The living ticket |
| `accueil.apercuEtiquette` | Nouveau | New |
| `accueil.apercuTitre` | Un billet vivant, impossible à copier en capture d'écran | A living ticket that a screenshot can't copy |
| `accueil.apercuTexte` | Chaque billet porte un motif Kuba unique qui bouge et change toutes les 30 secondes. Le contrôleur voit tout de suite si c'est un vrai. | Each ticket has its own Kuba pattern that moves and changes every 30 seconds. The gate staff can tell at a glance if it's real. |
| `accueil.apercuExemple` | Exemple | Example |
| `accueil.trouver` | Trouver un événement | Find an event |
| `accueil.rechercher` | Rechercher | Search |
| `accueil.recherchePlaceholder` | Artiste, équipe, lieu… | Artist, team, venue… |
| `accueil.ville` | Ville | City |
| `accueil.categorie` | Catégorie | Category |
| `accueil.toutes` | Toutes | All |
| `accueil.aVilleBientot` | À {ville} bientôt | Coming soon in {ville} |
| `accueil.partout` | Partout en RDC | All over the DRC |
| `accueil.videTitre` | Rien ici pour le moment | Nothing here yet |
| `accueil.videVille` | Rien à {ville} pour le moment | Nothing in {ville} yet |
| `accueil.aucunResultat` | Aucun résultat | No results |
| `accueil.videTexte` | Revenez bientôt, ou regardez ce qui se passe dans les autres villes. | Come back soon, or see what's on in other cities. |
| `accueil.voirToutesVilles` | Voir toutes les villes | See all cities |
| `accueil.effacerFiltres` | Effacer les filtres | Clear filters |
| `accueil.alerterSms` | M'alerter par SMS | Alert me by SMS |
| `accueil.attenteTitre` | Les prochains événements arrivent ici | Upcoming events will appear here |
| `accueil.attenteTexte` | Concerts, matchs, festivals, conférences et spectacles : dès qu'un événement est ouvert à la vente, il s'affiche sur cette page. | Concerts, matches, festivals, talks and shows: as soon as tickets go on sale, the event shows up on this page. |
| `accueil.etapesTitre` | Payer avec Mobile Money, en 3 étapes | Pay with Mobile Money in 3 steps |
| `accueil.etape1Titre` | Choisissez vos billets | Pick your tickets |
| `accueil.etape1Texte` | Prix en CDF, avec l'équivalent en USD. {max} billets maximum par personne. | Prices in CDF, with the USD equivalent. Up to {max} tickets per person. |
| `accueil.etape2Titre` | Validez sur votre téléphone | Confirm on your phone |
| `accueil.etape2Texte` | Un message de votre opérateur s'affiche. Vous tapez votre code secret dedans. Nous ne le demandons jamais. | A message from your mobile operator pops up. You type your PIN in it. We never ask for it. |
| `accueil.etape3Titre` | Montrez votre billet | Show your ticket |
| `accueil.etape3Texte` | Il s'ouvre même sans internet. Montrez-le à l'entrée, le contrôleur le scanne. | It opens even without internet. Show it at the entrance and the staff will scan it. |
| `accueil.operateursAria` | Opérateurs acceptés | Accepted operators |
| `accueil.paiementAgent` | Paiement chez un agent | Pay at an agent |
| `accueil.orgaTitre` | Vous organisez un événement ? | Organizing an event? |
| `accueil.orgaTexte` | Vendez vos billets en ligne, suivez vos ventes par opérateur et par catégorie, contrôlez les entrées même sans réseau au stade. | Sell your tickets online, track sales by operator and by category, and check people in even with no network at the stadium. |
| `accueil.orgaBouton` | Créer mon événement | Create my event |

## alertes

| Clé | Français | Anglais |
|---|---|---|
| `alertes.titre` | M'alerter par SMS | Alert me by SMS |
| `alertes.texte` | Recevez un SMS quand un nouvel événement est publié. | Get an SMS when a new event is published. |
| `alertes.numero` | Numéro | Phone number |
| `alertes.ville` | Ville (facultatif) | City (optional) |
| `alertes.toutesVilles` | Toutes les villes | All cities |
| `alertes.consentement` | J'accepte de recevoir des SMS d'e-Ticket RDC quand un événement est publié. Je peux me désinscrire à tout moment sur la page Alertes SMS. | I agree to receive SMS from e-Ticket RDC when an event is published. I can unsubscribe at any time on the SMS alerts page. |
| `alertes.consentementRequis` | Cochez la case pour accepter de recevoir des SMS. | Tick the box to agree to receive SMS. |
| `alertes.envoyer` | M'alerter | Alert me |
| `alertes.succes` | C'est noté. Vous recevrez un SMS dès qu'un événement est publié. | Done. You'll get an SMS as soon as an event is published. |
| `alertes.desinscrireTitre` | Ne plus recevoir d'alertes | Stop alerts |
| `alertes.desinscrireTexte` | Entrez votre numéro : nous arrêtons tout de suite les alertes SMS. | Enter your number and we'll stop the SMS alerts right away. |
| `alertes.desinscrire` | Me désinscrire | Unsubscribe |
| `alertes.desinscrit` | C'est fait. Vous ne recevrez plus d'alertes SMS. | Done. You won't get any more SMS alerts. |

## telephone

| Clé | Français | Anglais |
|---|---|---|
| `telephone.label` | Numéro | Phone number |
| `telephone.placeholder` | XX XXX XX XX | XX XXX XX XX |
| `telephone.invalide` | Entrez un numéro à 9 chiffres, sans le 0 du début. | Enter a 9-digit number, without the leading 0. |
| `telephone.opDetecte` | {operateur} détecté d'après le {prefixe} | {operateur} detected from {prefixe} |
| `telephone.opInconnu` | Opérateur non reconnu : vous le choisirez à l'étape suivante. | Operator not recognized: you'll choose it in the next step. |

## evenement

| Clé | Français | Anglais |
|---|---|---|
| `evenement.tous` | Tous les événements | All events |
| `evenement.infosAria` | Infos pratiques | Practical info |
| `evenement.portes` | Portes {heure} | Doors {heure} |
| `evenement.itineraire` | Ouvrir l'itinéraire | Get directions |
| `evenement.organisePar` | Organisé par | Organized by |
| `evenement.verifie` | Vérifié | Verified |
| `evenement.programme` | Programme | Schedule |
| `evenement.aSavoir` | À savoir | Good to know |
| `evenement.regle1` | 1 billet = 1 entrée. Gardez votre téléphone chargé. | 1 ticket = 1 entry. Keep your phone charged. |
| `evenement.regle2` | Le billet s'ouvre même sans internet. | The ticket opens even without internet. |
| `evenement.regle3` | Remboursement seulement si l'événement est annulé. | Refunds only if the event is cancelled. |
| `evenement.vosBillets` | Vos billets | Your tickets |
| `evenement.maxParPersonne` | {max} billets maximum par personne | Up to {max} tickets per person |
| `evenement.epuise` | Épuisé | Sold out |
| `evenement.plusQue` | Plus que {n} places | Only {n} left |
| `evenement.disponible` | Disponible | Available |
| `evenement.pasEncore` | En vente le {date} | On sale from {date} |
| `evenement.venteTerminee` | Vente terminée | Sales closed |
| `evenement.retirer` | Retirer un billet {nom} | Remove one {nom} ticket |
| `evenement.ajouter` | Ajouter un billet {nom} | Add one {nom} ticket |
| `evenement.quantite` | {nom}, quantité | {nom}, quantity |
| `evenement.limite` | Limite atteinte : {max} billets par personne | Limit reached: {max} tickets per person |
| `evenement.aucunChoisi` | Aucun billet choisi | No tickets selected |
| `evenement.nbBillets` | {n, plural, one {# billet} other {# billets}} | {n, plural, one {# ticket} other {# tickets}} |
| `evenement.continuer` | Continuer | Continue |
| `evenement.complet` | Complet | Sold out |
| `evenement.annule` | Événement annulé | Event cancelled |
| `evenement.termine` | Événement terminé | Event over |
| `evenement.listeAttente` | Rejoindre la liste d'attente | Join the waiting list |
| `evenement.listeAttenteTexte` | Laissez votre numéro : nous vous envoyons un SMS si des places se libèrent. | Leave your number and we'll text you if seats become available. |
| `evenement.listeAttenteOk` | C'est noté. Nous vous prévenons par SMS si des places se libèrent. | Done. We'll text you if seats become available. |
| `evenement.plusAssez` | Il n'y a plus assez de places. Choisissez une autre quantité. | There aren't enough seats left. Please choose a different quantity. |
| `evenement.limiteNumero` | Ce numéro a déjà atteint la limite de {max} billets pour cet événement. | This number has already reached the limit of {max} tickets for this event. |
| `evenement.listeAttenteConsentement` | J'accepte de recevoir un SMS d'e-Ticket RDC si des places se libèrent pour cet événement. | I agree to receive an SMS from e-Ticket RDC if seats become available for this event. |
| `evenement.listeAttenteEnvoyer` | M'inscrire sur la liste d'attente | Join the waiting list |

## achat

| Clé | Français | Anglais |
|---|---|---|
| `achat.etapeConnexion` | Étape 1 sur 4 · Connexion | Step 1 of 4 · Log in |
| `achat.etapePaiement` | Étape 2 sur 4 · Paiement | Step 2 of 4 · Payment |
| `achat.etapeValidation` | Étape 3 sur 4 · Validation | Step 3 of 4 · Confirmation |
| `achat.etapeBillets` | Étape 4 sur 4 · Billets | Step 4 of 4 · Tickets |
| `achat.resume` | {titre} · {billets} · {montant} | {titre} · {billets} · {montant} |
| `achat.telTitre` | Votre numéro de téléphone | Your phone number |
| `achat.telTexte` | Nous vous envoyons un code par SMS. Pas de mot de passe à retenir. | We'll send you a code by SMS. No password to remember. |
| `achat.recevoirCode` | Recevoir le code | Get the code |
| `achat.codeEnvoye` | Code envoyé au | Code sent to |
| `achat.modifier` | Modifier | Change |
| `achat.codeLegend` | Code à 6 chiffres | 6-digit code |
| `achat.chiffre` | Chiffre {n} | Digit {n} |
| `achat.autoRemplissage` | Le code se remplit tout seul si votre téléphone le permet. | The code fills in by itself if your phone allows it. |
| `achat.rienRecu` | Rien reçu ? | Didn't get it? |
| `achat.renvoyerDans` | Renvoyer dans {temps} | Resend in {temps} |
| `achat.renvoyer` | Renvoyer le code | Resend the code |
| `achat.validerCode` | Valider le code | Confirm the code |
| `achat.codeFaux` | Code incorrect. Il vous reste {n, plural, one {# essai} other {# essais}}. | Wrong code. You have {n, plural, one {# try} other {# tries}} left. |
| `achat.codeExpire` | Ce code a expiré ou a trop servi. Demandez un nouveau code. | This code has expired or been used too many times. Ask for a new one. |
| `achat.payerAvec` | Payer avec | Pay with |
| `achat.operateurAria` | Opérateur Mobile Money | Mobile Money operator |
| `achat.detecte` | Détecté · {prefixe} | Detected · {prefixe} |
| `achat.numeroOperateur` | Numéro {operateur} | {operateur} number |
| `achat.demandeArrive` | La demande de paiement arrivera sur ce numéro. | The payment request will be sent to this number. |
| `achat.montantExact` | Montant exact à valider | Exact amount to confirm |
| `achat.fraisService` | Frais de service | Service fee |
| `achat.remise` | Code promo | Promo code |
| `achat.total` | Total | Total |
| `achat.securite` | Vous validerez sur votre téléphone. | You'll confirm on your phone. |
| `achat.securiteGras` | Nous ne demandons jamais votre code secret. | We never ask for your PIN. |
| `achat.payer` | Payer {montant} | Pay {montant} |
| `achat.payerAgent` | Payer chez un agent | Pay at an agent |
| `achat.codePromo` | Code promo | Promo code |
| `achat.appliquer` | Appliquer | Apply |
| `achat.promoInvalide` | Ce code promo n'est pas valable. | This promo code isn't valid. |
| `achat.reservationExpiree` | Votre réservation a expiré. Choisissez de nouveau vos billets. | Your booking has expired. Please pick your tickets again. |
| `achat.paiementIndisponible` | Le paiement en ligne n'est pas encore ouvert. Utilisez le paiement chez un agent. | Online payment isn't open yet. Please pay at an agent. |
| `achat.pourValider` | pour valider | to confirm |
| `achat.minuteurAria` | Temps restant pour valider | Time left to confirm |
| `achat.attenteTitre` | Validez sur votre téléphone | Confirm on your phone |
| `achat.messageVa` | Ce message va s'afficher : | This message will appear: |
| `achat.bulleLigne1` | Payer {montant} CDF à E-TICKET RDC ? | Pay {montant} CDF to E-TICKET RDC? |
| `achat.bulleLigne2` | Entrez votre code secret : | Enter your PIN: |
| `achat.attente1` | Attendez le message {operateur} sur ce téléphone. | Wait for the {operateur} message on this phone. |
| `achat.attente2` | Vérifiez le montant : <b>{montant}</b>. | Check the amount: <b>{montant}</b>. |
| `achat.attente3` | Tapez votre code secret <b>dans ce message</b>, puis validez. | Type your PIN <b>in that message</b>, then confirm. |
| `achat.recuTitre` | Paiement reçu | Payment received |
| `achat.recuTexte` | {operateur} a confirmé <b>{montant}</b>. Nous préparons vos billets. | {operateur} confirmed <b>{montant}</b>. We're getting your tickets ready. |
| `achat.nePasFermer` | Ne fermez pas la page. | Don't close this page. |
| `achat.echecTitre` | Paiement refusé | Payment declined |
| `achat.echecTexte` | {operateur} a refusé la demande. Le solde est peut-être insuffisant, ou le code secret incorrect. | {operateur} declined the request. Your balance may be too low, or the PIN was wrong. |
| `achat.aucunDebit` | Aucun montant n'a été débité. | No money was taken. |
| `achat.delaiTitre` | Temps écoulé | Time's up |
| `achat.delaiTexte` | La demande a expiré après 2 minutes. | The request expired after 2 minutes. |
| `achat.delaiAide` | <b>Vous avez validé quand même ?</b> Si votre compte est débité, vos billets arrivent tout seuls par SMS dans les 15 minutes. <b>Ne payez pas une deuxième fois.</b> | <b>Did you confirm anyway?</b> If money was taken, your tickets will arrive by SMS within 15 minutes. <b>Don't pay a second time.</b> |
| `achat.secretTitre` | Votre code secret reste secret | Your PIN stays secret |
| `achat.secretTexte` | Tapez-le seulement dans le message {operateur}. e-Ticket ne le demande jamais : ni par appel, ni par SMS, ni sur WhatsApp. | Only type it in the {operateur} message. e-Ticket never asks for it: not by phone call, SMS or WhatsApp. |
| `achat.aide1` | Vérifiez que ce téléphone a du réseau. | Check that this phone has network. |
| `achat.aide2Ussd` | Ouvrez le menu {operateur} (<b>{ussd}</b>) pour voir la demande en attente. | Open the {operateur} menu (<b>{ussd}</b>) to see the pending request. |
| `achat.aide2` | Ouvrez le menu {operateur} pour voir la demande en attente. | Open the {operateur} menu to see the pending request. |
| `achat.aide3` | Vérifiez votre solde : il faut au moins <b>{montant}</b>. | Check your balance: you need at least <b>{montant}</b>. |
| `achat.renvoyerDemandeDans` | Renvoyer la demande dans {temps} | Resend the request in {temps} |
| `achat.renvoyerDemande` | Renvoyer la demande | Resend the request |
| `achat.changerMoyen` | Changer de moyen de paiement | Change payment method |
| `achat.autreOperateur` | Choisir un autre opérateur | Choose another operator |
| `achat.relancer` | Relancer la demande | Send the request again |
| `achat.verifier` | Vérifier mon paiement | Check my payment |
| `achat.agentTitre` | Payer avec un agent | Pay at an agent |
| `achat.agentTexte` | Donnez le code <b>{code}</b> à un agent Mobile Money. | Give the code <b>{code}</b> to a Mobile Money agent. |
| `achat.confirme` | Paiement confirmé | Payment confirmed |
| `achat.confirmationTitre` | C'est bon ! Vos billets sont prêts. | All set! Your tickets are ready. |
| `achat.smsParti` | Un SMS avec le lien est parti vers le {tel}. | An SMS with the link has been sent to {tel}. |
| `achat.telechargerPdf` | Télécharger en PDF | Download as PDF |
| `achat.partagerWhatsapp` | Partager sur WhatsApp | Share on WhatsApp |
| `achat.partageTexte` | J'ai mon billet pour {titre} ({date}) sur e-Ticket ! | I've got my ticket for {titre} ({date}) on e-Ticket! |
| `achat.voirTous` | Voir tous mes billets | See all my tickets |
| `achat.payeeSansPlace` | Votre paiement est bien reçu, mais les places ont été prises pendant l'attente. Vous serez remboursé : notre équipe vous contacte par SMS. | We received your payment, but the seats were taken while you were paying. You'll be refunded: our team will contact you by SMS. |
| `achat.commandeIntrouvable` | Commande introuvable. | Order not found. |
| `achat.reessayer` | Réessayer | Try again |
| `achat.codeTest` | Code de test : {code} | Test code: {code} |

## agent

| Clé | Français | Anglais |
|---|---|---|
| `agent.titre` | Payer chez un agent | Pay at an agent |
| `agent.etape1` | Envoyez exactement <b>{montant}</b> à l'un des numéros marchands ci-dessous, chez un agent ou depuis votre téléphone. | Send exactly <b>{montant}</b> to one of the merchant numbers below, at an agent or from your phone. |
| `agent.etape2` | Vous recevez un SMS de votre opérateur avec une référence de transaction. | Your operator sends you an SMS with a transaction reference. |
| `agent.etape3` | Entrez cette référence ici. Nous vérifions et vos billets arrivent par SMS. | Enter that reference here. We check it and your tickets arrive by SMS. |
| `agent.code` | Code de commande | Order code |
| `agent.numeroMarchand` | Numéro marchand {operateur} | {operateur} merchant number |
| `agent.aucunNumero` | Le paiement chez un agent n'est pas encore ouvert. | Paying at an agent isn't open yet. |
| `agent.operateur` | Opérateur utilisé | Operator used |
| `agent.reference` | Référence de transaction | Transaction reference |
| `agent.referenceAide` | Elle figure dans le SMS de confirmation de votre opérateur. | You'll find it in your operator's confirmation SMS. |
| `agent.numeroPayeur` | Numéro qui a payé | Number that paid |
| `agent.envoyer` | Envoyer la référence | Send the reference |
| `agent.recu` | Référence reçue. Un agent la vérifie, vos billets arrivent par SMS dès la validation. | Reference received. An agent is checking it; your tickets arrive by SMS as soon as it's approved. |
| `agent.dejaUtilisee` | Cette référence a déjà été utilisée. | This reference has already been used. |
| `agent.reserveJusqua` | Vos places sont réservées jusqu'à {heure}. | Your seats are held until {heure}. |
| `agent.refusee` | La référence a été refusée : {motif} | The reference was rejected: {motif} |

## billet

| Clé | Français | Anglais |
|---|---|---|
| `billet.aria` | Billet {titre}, {categorie} | Ticket {titre}, {categorie} |
| `billet.unePersonne` | {categorie} · 1 personne | {categorie} · 1 person |
| `billet.jaugeAria` | Temps avant le prochain motif | Time until the next pattern |
| `billet.changeDans` | Motif vivant · change dans | Living pattern · changes in |
| `billet.secondes` | {n} s | {n} s |
| `billet.titulaire` | Titulaire | Holder |
| `billet.entree` | Entrée | Entrance |
| `billet.numero` | Billet n° | Ticket no. |
| `billet.prixPaye` | Prix payé | Price paid |
| `billet.horsLigne` | Enregistré sur ce téléphone · marche sans internet | Saved on this phone · works without internet |
| `billet.qrAria` | QR code du billet {id} entouré de son motif vivant | QR code for ticket {id}, surrounded by its living pattern |
| `billet.annule` | Billet annulé | Ticket cancelled |
| `billet.utilise` | Billet déjà utilisé | Ticket already used |
| `billet.categorie` | Catégorie | Category |
| `billet.pdfTitre` | Billet {id} | Ticket {id} |
| `billet.pdfMention` | 1 billet = 1 entrée. Le billet vivant sur téléphone reste le plus sûr à l'entrée. | 1 ticket = 1 entry. The living ticket on your phone is still the safest option at the gate. |

## mesBillets

| Clé | Français | Anglais |
|---|---|---|
| `mesBillets.titre` | Mes billets | My tickets |
| `mesBillets.horsLigneTitre` | Pas d'internet ? Pas de souci. | No internet? No problem. |
| `mesBillets.horsLigneTexte` | Les billets marqués « Sur ce téléphone » s'ouvrent quand même. | Tickets marked "On this phone" still open. |
| `mesBillets.periode` | Période | Period |
| `mesBillets.aVenir` | À venir ({n}) | Upcoming ({n}) |
| `mesBillets.passes` | Passés ({n}) | Past ({n}) |
| `mesBillets.surTelephone` | Sur ce téléphone | On this phone |
| `mesBillets.aTelecharger` | À télécharger | To download |
| `mesBillets.unBillet` | 1 billet · {categorie} | 1 ticket · {categorie} |
| `mesBillets.conseil` | À l'entrée, montez la luminosité et montrez l'écran. Le contrôleur vérifie que le motif bouge et que le signe correspond au sien. | At the entrance, turn up the brightness and show the screen. The staff check that the pattern moves and that the sign matches theirs. |
| `mesBillets.billetOuvert` | Billet ouvert | Ticket open |
| `mesBillets.utiliseLe` | Utilisé le {date} | Used on {date} |
| `mesBillets.nonUtilise` | Non utilisé · {date} | Not used · {date} |
| `mesBillets.videTitre` | Aucun billet pour le moment | No tickets yet |
| `mesBillets.videTexte` | Vos billets s'affichent ici dès que vous en achetez un. | Your tickets show up here as soon as you buy one. |
| `mesBillets.voirEvenements` | Voir les événements | See events |
| `mesBillets.connecter` | Connectez-vous avec votre numéro pour retrouver vos billets. | Log in with your number to find your tickets. |
| `mesBillets.enregistrer` | Enregistrer sur ce téléphone | Save on this phone |

## connexion

| Clé | Français | Anglais |
|---|---|---|
| `connexion.titre` | Se connecter | Log in |
| `connexion.texte` | Nous vous envoyons un code par SMS. Pas de mot de passe à retenir. | We'll send you a code by SMS. No password to remember. |

## scan

| Clé | Français | Anglais |
|---|---|---|
| `scan.titre` | Scanner du contrôleur | Gate scanner |
| `scan.choisir` | Choisissez l'événement à contrôler | Choose the event to check |
| `scan.aucun` | Aucun événement ne vous est attribué. | No event has been assigned to you. |
| `scan.telechargement` | Téléchargement de la liste des billets… | Downloading the ticket list… |
| `scan.listeRequise` | Le scanner ne peut pas démarrer sans la liste des billets. Connectez-vous à internet une première fois. | The scanner can't start without the ticket list. Connect to the internet once first. |
| `scan.enLigne` | En ligne · à jour | Online · up to date |
| `scan.horsLigne` | Hors ligne · {n} à envoyer | Offline · {n} to send |
| `scan.synchro` | Synchronisé à {heure} | Synced at {heure} |
| `scan.entrees` | / {total} entrées | / {total} entries |
| `scan.signe` | Signe | Sign |
| `scan.placer` | Placez le QR code dans le cadre | Place the QR code inside the frame |
| `scan.verifierSigne` | Puis vérifiez que le motif bouge et que le signe est un | Then check that the pattern moves and that the sign is a |
| `scan.lampe` | Lampe | Light |
| `scan.saisir` | Saisir le n° | Enter the no. |
| `scan.saisirLabel` | Code du billet | Ticket code |
| `scan.valider` | Vérifier | Check |
| `scan.motifAttendu` | Motif attendu maintenant. | Expected pattern right now. |
| `scan.motifTexte` | Le téléphone doit montrer le même, en mouvement. | The phone must show the same one, moving. |
| `scan.suivant` | Scanner le suivant | Scan the next one |
| `scan.valide` | Valide | Valid |
| `scan.refuse` | Refusé | Rejected |
| `scan.deja` | Déjà scanné | Already scanned |
| `scan.dejaTexte` | Premier scan à {heure}, {porte}. | First scanned at {heure}, {porte}. |
| `scan.inconnu` | Inconnu, à vérifier | Unknown, check it |
| `scan.inconnuTexte` | Ce code n'est pas dans la liste de cet appareil. Appelez un responsable avant de laisser entrer. | This code isn't in this device's list. Call a supervisor before letting the person in. |
| `scan.refuseTexte` | Ce QR code n'est pas un billet de cet événement. | This QR code isn't a ticket for this event. |
| `scan.camera` | Autorisez la caméra pour scanner, ou saisissez le numéro du billet. | Allow the camera to scan, or type in the ticket number. |
| `scan.porte` | Porte | Gate |

## aide

| Clé | Français | Anglais |
|---|---|---|
| `aide.titre` | Aide | Help |
| `aide.payerTitre` | Payer avec Mobile Money | Paying with Mobile Money |
| `aide.secretTitre` | Votre code secret reste secret | Your PIN stays secret |
| `aide.secretTexte` | Tapez votre code secret seulement dans le message de votre opérateur, sur votre téléphone. e-Ticket ne le demande jamais : ni par appel, ni par SMS, ni sur WhatsApp. | Only type your PIN in your operator's message, on your phone. e-Ticket never asks for it: not by phone call, SMS or WhatsApp. |
| `aide.rienRecuTitre` | Rien reçu ? | Didn't get anything? |
| `aide.rienRecu1` | Vérifiez que votre téléphone a du réseau. | Check that your phone has network. |
| `aide.rienRecu2` | Ouvrez le menu de votre opérateur pour voir la demande en attente. | Open your operator's menu to see the pending request. |
| `aide.rienRecu3` | Vérifiez votre solde : il faut au moins le montant affiché. | Check your balance: you need at least the amount shown. |
| `aide.rienRecu4` | Si votre compte est débité, vos billets arrivent tout seuls par SMS dans les 15 minutes. Ne payez pas une deuxième fois. | If money was taken, your tickets will arrive by SMS within 15 minutes. Don't pay a second time. |
| `aide.agentTitre` | Payer chez un agent | Paying at an agent |
| `aide.agentTexte` | Choisissez « Payer chez un agent » au moment du paiement. Vous recevez un code de commande et le numéro marchand. Envoyez le montant exact, puis entrez la référence de transaction reçue par SMS. Vos places sont gardées 2 heures et vos billets arrivent par SMS dès qu'un agent a vérifié le paiement. | Choose "Pay at an agent" when paying. You get an order code and the merchant number. Send the exact amount, then enter the transaction reference you receive by SMS. Your seats are held for 2 hours and your tickets arrive by SMS as soon as an agent has checked the payment. |
| `aide.billetsTitre` | Vos billets | Your tickets |
| `aide.billetsTexte` | Vos billets s'ouvrent même sans internet une fois enregistrés sur votre téléphone. Vous les retrouvez dans « Mes billets » en vous connectant avec votre numéro, ou avec le lien reçu par SMS. À l'entrée, montez la luminosité et montrez l'écran. | Once saved on your phone, your tickets open even without internet. Find them in "My tickets" by logging in with your number, or with the link you got by SMS. At the entrance, turn up the brightness and show the screen. |
| `aide.remboursementTitre` | Remboursement | Refunds |
| `aide.remboursementTexte` | Remboursement seulement si l'événement est annulé. | Refunds only if the event is cancelled. |

## categories

| Clé | Français | Anglais |
|---|---|---|
| `categories.concert.un` | Concert | Concert |
| `categories.concert.plusieurs` | Concerts | Concerts |
| `categories.football.un` | Football | Football |
| `categories.football.plusieurs` | Football | Football |
| `categories.festival.un` | Festival | Festival |
| `categories.festival.plusieurs` | Festivals | Festivals |
| `categories.conference.un` | Conférence | Talk |
| `categories.conference.plusieurs` | Conférences | Talks |
| `categories.spectacle.un` | Spectacle | Show |
| `categories.spectacle.plusieurs` | Spectacles | Shows |

## pages

| Clé | Français | Anglais |
|---|---|---|
| `pages.billet` | Billet | Ticket |
| `pages.alertes` | Alertes SMS | SMS alerts |
| `pages.conditions` | Conditions | Terms |
| `pages.connexion` | Connexion | Log in |
| `pages.achat` | Achat | Purchase |
| `pages.mesBillets` | Mes billets | My tickets |
| `pages.agent` | Payer chez un agent | Pay at an agent |
| `pages.organisateurs` | Organisateurs | Organizers |
| `pages.aide` | Aide | Help |
| `pages.horsLigne` | Pas de connexion | No connection |
| `pages.confidentialite` | Confidentialité | Privacy |
| `pages.scanner` | Scanner | Scanner |
| `pages.francaisSeulement` | Cette page n'existe qu'en français. | This page is only available in French. |
