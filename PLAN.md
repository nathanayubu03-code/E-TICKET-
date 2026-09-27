# PLAN.md · e-Ticket RDC

Statut : en attente de validation. Aucune ligne de l'application n'est écrite avant ton accord.

## 0. Écarts entre le prompt et le dépôt, à trancher

Ces points changent le plan. Chacun porte ma recommandation.

1. **Emplacement de la maquette.** Le prompt parle de `/design/index.html`, `/design/assets/…`. Dans le dépôt, `design/` contient le canvas (`design/project/*.dc.html`, 47 planches) et la maquette HTML statique se trouve dans `site/`. J'ai lu les deux. Le contenu de `site/` est identique octet pour octet à l'artifact publié. Recommandation : `git mv site design/maquette` à l'étape 1, pour que la source de vérité ait un chemin stable et que la racine accueille l'application Next.js. Le canvas reste dans `design/project/` et sert de référence pour les écrans absents de la maquette HTML (scanner, tableau de bord, états).

2. **Deux jeux de tokens légèrement différents.** `site/assets/styles.css` et `tokens/theme.css` divergent sur trois points : ombre en mode sombre (`#000000` dans styles.css, `transparent` dans theme.css), `--focus-halo` et `--contour` absents de theme.css, bascule du thème par `[data-theme]` dans styles.css et par `.dark` dans theme.css. Le prompt désigne styles.css comme source de vérité : je reprends ses valeurs et son mécanisme `[data-theme]` + `prefers-color-scheme`, et je supprime `tokens/` une fois le thème Tailwind en place.

3. **Préfixes Afrimoney.** `app.js` dit 090 et 091, le prompt dit 090 seul. Je mets 090 et 091 dans le fichier de configuration avec un commentaire « à confirmer », puisque l'utilisateur peut corriger l'opérateur détecté. Confiance faible sur les deux listes : à valider auprès des opérateurs ou de l'agrégateur.

4. **Next.js 15.** Next.js 16 est sorti fin 2025 (confiance élevée). Le prompt impose 15 ; je m'y tiens (dernière 15.x) sauf avis contraire. Conséquence : Serwist exige un build webpack, donc pas de Turbopack pour `next build`.

5. **Taille du QR signé.** La charge utile `idBillet | idEvenement | signature Ed25519` fait environ 12 + 10 + 86 (64 octets en base64url) + séparateurs, soit à peu près 112 caractères. En mode octet, niveau de correction M, il faut un QR version 6 ou 7 (41 à 45 modules). La maquette prévoit 168 px CSS pour la zone QR, calculée pour 25 modules : on tomberait à environ 3,7 px par module, trop peu pour un scan fiable sur écran de téléphone bas de gamme en plein soleil. Deux leviers, que je combine : encoder la charge en base32 majuscules (mode alphanumérique du QR, 5,5 bits par caractère au lieu de 8) et agrandir le billet pour que la zone QR fasse au moins 220 px CSS (grille Kuba 13 × 13 au lieu de 11 × 11, anneau de 2 cases conservé). L'algorithme Kuba ne change pas, seul le paramètre `cols/rows` change. Confiance moyenne sur le seuil exact : je le vérifierai avec un vrai téléphone et BarcodeDetector à l'étape du scanner.

6. **Le « sel Kuba secret » n'est secret que du public.** Pour afficher le signe du moment hors ligne, le téléphone de l'acheteur doit connaître le sel de l'événement. Tout détenteur d'un billet le connaît donc. Le signe du moment reste utile contre les captures d'écran d'un autre événement ou d'une autre heure, mais la vraie protection reste la signature Ed25519 et la liste des billets déjà scannés. Je le documente tel quel, sans prétendre autre chose.

7. **Code 128 bits et identifiant lisible.** Le prompt définit les deux sans dire à quoi sert le code 128 bits. Proposition : l'identifiant lisible `ET-XXXX-XXXX` est public (affiché, dicté au support), le code 128 bits sert de jeton porteur dans le lien SMS (`/b/<code>`) pour ouvrir le billet sans se connecter. Il n'entre pas dans le QR.

8. **Seed de démonstration et « base de production ».** On ne peut pas deviner qu'une URL pointe vers la production. Règle proposée : `seed-demo.ts` refuse si `NODE_ENV=production`, si `APP_ENV=production`, ou si l'hôte de `DATABASE_URL` n'est pas dans une liste blanche (`localhost`, `127.0.0.1`, `db`, `postgres`).

9. **Journal d'audit non modifiable.** Prisma ne sait pas l'imposer. Je l'impose dans PostgreSQL : un trigger qui rejette `UPDATE` et `DELETE` sur `AuditLog`, ajouté dans une migration SQL, plus un rôle applicatif sans droit `TRUNCATE`.

10. **Réservation atomique sans SQL brut.** Je stocke un compteur `restant` sur `TicketType` et je fais `updateMany({ where: { id, restant: { gte: n } }, data: { restant: { decrement: n } } })`. Une seule instruction SQL, conditionnelle, sans lecture préalable. Si `count === 0`, la place n'est plus disponible. Même principe pour la libération (`increment`) à l'expiration.

## 1. Questions bloquantes (je ne choisis pas à ta place)

1. Agrégateur Mobile Money retenu (et sa documentation, identifiants de test). Bloque l'étape « adaptateur réel » seulement.
2. Fournisseur SMS. Bloque l'envoi réel seulement.
3. Hébergement : où tournent l'application, PostgreSQL et les tâches planifiées (vérification des paiements toutes les 2 minutes, expiration des réservations) ? Un hébergement serverless oblige à un cron externe qui appelle des routes protégées ; un VPS ou un conteneur permet un worker. Bloque l'étape paiement pour la partie planification.
4. Stockage des affiches (S3 compatible, Cloudflare R2, disque local du serveur ?). Bloque l'étape visuels.
5. Domaine de production et adresse de contact pour les organisateurs (bouton « Créer mon événement »).
6. Next.js 15 imposé ou passage à 16 accepté ?
7. Déplacement de `site/` vers `design/maquette/` accepté ?

En attendant, j'avance sur tout ce qui n'en dépend pas, avec les adaptateurs de simulation.

## 2. Arborescence

```
.
├── CLAUDE.md
├── PLAN.md
├── design/
│   ├── maquette/                 ← ex-site/, source de vérité visuelle, jamais importée par l'app
│   └── project/                  ← canvas (.dc.html)
├── app/
│   ├── layout.tsx                ← polices next/font, thème, next-intl
│   ├── globals.css               ← Tailwind v4 + tokens repris de styles.css
│   ├── manifest.ts
│   ├── sw.ts                     ← Serwist
│   ├── (public)/
│   │   ├── layout.tsx            ← en-tête, bandeau réseau, pied de page, motif de fond
│   │   ├── page.tsx              ← accueil
│   │   ├── evenements/[slug]/page.tsx
│   │   ├── achat/[code]/page.tsx ← connexion, paiement, attente, confirmation
│   │   ├── agent/[code]/page.tsx ← paiement chez un agent
│   │   ├── connexion/page.tsx
│   │   ├── mes-billets/page.tsx
│   │   ├── b/[jeton]/page.tsx    ← billet ouvert depuis le lien SMS
│   │   ├── organisateurs/page.tsx
│   │   ├── aide/page.tsx
│   │   ├── conditions/page.tsx
│   │   └── confidentialite/page.tsx
│   ├── scan/
│   │   ├── layout.tsx            ← plein écran, manifest scanner
│   │   ├── page.tsx              ← choix de l'événement
│   │   └── [evenementId]/page.tsx
│   ├── admin/
│   │   ├── layout.tsx            ← sans motif de fond
│   │   ├── connexion/page.tsx    ← téléphone + mot de passe + OTP
│   │   ├── page.tsx              ← tableau de bord
│   │   ├── evenements/…          ← liste, nouveau, [id]/(infos|lieu|billets|programme|pratique|visuels|apercu|publication)
│   │   ├── organisateurs/…
│   │   ├── commandes/…
│   │   ├── paiements/…           ← journal + file manuelle
│   │   ├── reversements/…
│   │   ├── controleurs/…
│   │   ├── promos/…
│   │   ├── parametres/page.tsx
│   │   └── audit/page.tsx
│   └── api/
│       ├── webhooks/paiement/[fournisseur]/route.ts
│       ├── cron/verifier-paiements/route.ts
│       ├── cron/expirer-reservations/route.ts
│       ├── commandes/[code]/statut/route.ts      ← sondage toutes les 3 s
│       ├── billets/[publicId]/pdf/route.ts
│       ├── scan/[evenementId]/manifeste/route.ts ← clé publique + billets valides
│       ├── scan/synchroniser/route.ts
│       └── exports/evenements/[id]/route.ts      ← Excel
├── components/
│   ├── ui/                       ← Bouton, Panneau, Badge, Note, Etiquette, Pastille, Saisie, ChampTel, Otp, Compteur, Dialogue, Onglets
│   ├── public/                   ← Entete, PiedDePage, BandeauReseau, CarteEvenement, BlocUne, Filtres, EtatVide, EtapesMobileMoney, BandeOrganisateurs, FormAlerteSms
│   ├── achat/                    ← ChoixOperateur, RecapMontant, Minuteur, BulleUssd, VueAttente, VueRecu, VueEchec, VueDelai, AlerteSecret
│   ├── billet/                   ← BilletVivant, MotifKuba, SigneDuMoment, JaugePhase
│   ├── scan/                     ← Viseur, EcranResultat, CompteurEntrees, EtatSynchro
│   └── admin/                    ← TableauDonnees, Kpi, Assistant (étapes), ListeManques, JournalAudit
├── lib/
│   ├── kuba/                     ← port TypeScript de kuba.js + rendu SVG
│   ├── db.ts                     ← client Prisma
│   ├── auth/                     ← sessions, OTP, rôles, garde des actions serveur
│   ├── paiement/                 ← PaymentProvider, simulation, adaptateurs, machine d'états
│   ├── sms/                      ← SmsProvider, simulation, gabarits
│   ├── billets/                  ← génération des identifiants, signature Ed25519, QR, PDF
│   ├── operateurs.ts             ← préfixes modifiables
│   ├── telephone.ts              ← normalisation +243XXXXXXXXX
│   ├── argent.ts                 ← entiers CDF, affichage USD indicatif
│   ├── fuseaux.ts                ← affichage dans le fuseau de la ville
│   ├── limites.ts                ← limite de débit (table PostgreSQL)
│   ├── audit.ts
│   ├── chiffrement.ts            ← AES-256-GCM pour les numéros de reversement
│   └── env.ts                    ← validation Zod des variables d'environnement, refus de démarrer
├── messages/fr.json, ln.json, sw.json
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed.ts                   ← production : superadmin, catégories, villes, paramètres
│   └── seed-demo.ts              ← développement uniquement, préfixe [DEMO]
├── scripts/
│   └── kuba-reference.mjs        ← exécute le kuba.js original, écrit tests/fixtures/kuba.json
├── tests/
│   ├── unit/                     ← Vitest
│   ├── fixtures/kuba.json
│   └── e2e/                      ← Playwright
├── middleware.ts                 ← rôles sur /admin et /scan, en-têtes de sécurité, CSP avec nonce
└── .env.example
```

## 3. Schéma Prisma

Montants en `Int` CDF. Dates en UTC. Identifiants `cuid()` sauf mention.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { SUPERADMIN ADMIN AGENT CONTROLEUR ORGANISATEUR ACHETEUR }
enum StatutEvenement { BROUILLON A_VALIDER PUBLIE COMPLET ANNULE TERMINE }
enum StatutCommande { EN_ATTENTE PAYEE PAYEE_SANS_PLACE EXPIREE ECHOUEE ANNULEE REMBOURSEE }
enum ModePaiement { MOBILE_MONEY MANUEL GRATUIT }
enum Operateur { MPESA AIRTEL ORANGE AFRIMONEY }
enum StatutPaiement { INITIE EN_ATTENTE REUSSI ECHOUE EXPIRE }
enum StatutReclamation { EN_ATTENTE VALIDEE REFUSEE }
enum StatutBillet { VALIDE UTILISE ANNULE }
enum ResultatScan { VALIDE DEJA_SCANNE REFUSE }
enum TypePromo { POURCENTAGE MONTANT }
enum ObjetOtp { CONNEXION ADMIN_DEUXIEME_ETAPE }
enum StatutSms { EN_FILE ENVOYE ECHOUE }

model User {
  id            String    @id @default(cuid())
  telephone     String    @unique            // +243XXXXXXXXX
  nom           String?
  email         String?   @unique
  motDePasse    String?                      // argon2id, obligatoire pour les rôles d'administration
  roles         Role[]    @default([ACHETEUR])
  organisateurId String?
  organisateur  Organizer? @relation(fields: [organisateurId], references: [id])
  desactiveLe   DateTime?
  creeLe        DateTime  @default(now())
  sessions      Session[]
  commandes     Order[]
  affectations  EventController[]
  appareils     ScannerDevice[]
}

model Session {
  id               String   @id @default(cuid())
  jetonHash        String   @unique           // SHA-256 du jeton du cookie
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deuxiemeEtapeLe  DateTime?                  // admin : OTP validé
  expireLe         DateTime
  ip               String?
  userAgent        String?
  creeLe           DateTime @default(now())
  @@index([userId])
}

model OtpCode {
  id        String   @id @default(cuid())
  telephone String
  objet     ObjetOtp
  codeHash  String                            // HMAC-SHA256 avec poivre serveur
  essais    Int      @default(0)              // 5 maximum
  expireLe  DateTime                          // +5 min
  utiliseLe DateTime?
  creeLe    DateTime @default(now())
  @@index([telephone, objet, creeLe])
}

model Organizer {
  id                  String    @id @default(cuid())
  nom                 String
  slug                String    @unique
  contactNom          String?
  telephone           String?
  email               String?
  reversementOperateur Operateur?
  reversementNumeroChiffre Bytes?             // AES-256-GCM
  reversementNumeroFin String?                // 4 derniers chiffres pour l'affichage
  commissionBps       Int?                    // null = taux global ; 1000 = 10 %
  verifie             Boolean   @default(false)
  verifieLe           DateTime?
  verifieParId        String?
  archiveLe           DateTime?
  creeLe              DateTime  @default(now())
  evenements          Event[]
  membres             User[]
  reversements        Payout[]
}

model City {
  id       String  @id @default(cuid())
  nom      String  @unique
  slug     String  @unique
  fuseau   String                             // Africa/Kinshasa ou Africa/Lubumbashi
  lieux    Venue[]
  evenements Event[]
  alertes  SmsAlertSubscription[]
}

model Venue {
  id       String   @id @default(cuid())
  nom      String
  villeId  String
  ville    City     @relation(fields: [villeId], references: [id])
  adresse  String?
  latitude  Decimal? @db.Decimal(9, 6)
  longitude Decimal? @db.Decimal(9, 6)
  evenements Event[]
  @@unique([villeId, nom])
}

model Category {
  id     String  @id @default(cuid())
  slug   String  @unique                      // concert, football, festival, conference, spectacle
  nom    String
  icone  String
  fond   String                               // couleurs reprises de app.js
  texte  String
  ordre  Int     @default(0)
  evenements Event[]
}

model Event {
  id              String          @id @default(cuid())
  code            String          @unique     // court et lisible, entre dans le QR (ex. E7K4Q9)
  slug            String          @unique
  titre           String
  description     String?
  statut          StatutEvenement @default(BROUILLON)
  categorieId     String
  categorie       Category        @relation(fields: [categorieId], references: [id])
  organisateurId  String?
  organisateur    Organizer?      @relation(fields: [organisateurId], references: [id])
  lieuId          String?
  lieu            Venue?          @relation(fields: [lieuId], references: [id])
  villeId         String?                     // dénormalisé depuis le lieu pour l'index public
  ville           City?           @relation(fields: [villeId], references: [id])
  fuseau          String?                     // copié de la ville
  ouverturePortesLe DateTime?
  debutLe         DateTime?
  finLe           DateTime?
  infosPratiques  String?
  afficheCle      String?                     // clé de stockage de l'original
  afficheVariantes Json?                      // { "4x5": {webp, avif}, "16x9": {...} }
  selKuba         String                      // 128 bits aléatoires, base32
  limiteParPersonne Int?                      // null = paramètre global
  archiveLe       DateTime?
  publieLe        DateTime?
  brouillonSauveLe DateTime?
  creeParId       String
  creeLe          DateTime        @default(now())
  majLe           DateTime        @updatedAt
  typesBillet     TicketType[]
  programme       EventScheduleItem[]
  commandes       Order[]
  billets         Ticket[]
  controleurs     EventController[]
  @@index([statut, villeId, debutLe])
  @@index([statut, debutLe])
}

model EventScheduleItem {
  id          String @id @default(cuid())
  evenementId String
  evenement   Event  @relation(fields: [evenementId], references: [id], onDelete: Cascade)
  heure       String                          // "HH:mm", heure locale de la ville
  titre       String
  detail      String?
  ordre       Int
}

model TicketType {
  id           String   @id @default(cuid())
  evenementId  String
  evenement    Event    @relation(fields: [evenementId], references: [id], onDelete: Cascade)
  nom          String
  description  String?
  prixCdf      Int                            // 0 = gratuit
  quota        Int
  restant      Int                            // décrémenté atomiquement à la réservation
  venteDebutLe DateTime?
  venteFinLe   DateTime?
  limiteParCommande Int?
  ordre        Int      @default(0)
  lignes       OrderItem[]
  billets      Ticket[]
  attente      WaitlistEntry[]
}

model Order {
  id              String         @id @default(cuid())
  code            String         @unique      // ET-XXXXXX
  telephone       String
  userId          String?
  user            User?          @relation(fields: [userId], references: [id])
  evenementId     String
  evenement       Event          @relation(fields: [evenementId], references: [id])
  statut          StatutCommande @default(EN_ATTENTE)
  mode            ModePaiement?
  sousTotalCdf    Int
  remiseCdf       Int            @default(0)
  totalCdf        Int
  commissionBps   Int                         // figé à la création
  commissionCdf   Int
  netOrganisateurCdf Int
  tauxUsdId       String?                     // taux affiché au moment de l'achat
  reserveJusquau  DateTime                    // +10 min, +2 h en paiement manuel
  payeeLe         DateTime?
  rembourseeLe    DateTime?
  rembourseeParId String?
  creeLe          DateTime       @default(now())
  lignes          OrderItem[]
  paiements       Payment[]
  reclamations    ManualPaymentClaim[]
  billets         Ticket[]
  promo           PromoRedemption?
  @@index([telephone, creeLe])
  @@index([statut, reserveJusquau])
  @@index([evenementId, statut])
}

model OrderItem {
  id           String     @id @default(cuid())
  commandeId   String
  commande     Order      @relation(fields: [commandeId], references: [id], onDelete: Cascade)
  typeBilletId String
  typeBillet   TicketType @relation(fields: [typeBilletId], references: [id])
  quantite     Int
  prixUnitaireCdf Int
}

model Payment {
  id             String         @id @default(cuid())
  commandeId     String
  commande       Order          @relation(fields: [commandeId], references: [id])
  fournisseur    String                        // simulation, <agrégateur>
  operateur      Operateur
  telephone      String
  montantCdf     Int
  cleIdempotence String         @unique        // dérivée de la commande et de la tentative
  referenceOperateur String?    @unique
  statut         StatutPaiement @default(INITIE)
  statutBrut     String?
  motifEchec     String?
  nbVerifications Int           @default(0)
  prochaineVerifLe DateTime?
  creeLe         DateTime       @default(now())
  majLe          DateTime       @updatedAt
  evenements     PaymentEvent[]
  @@index([statut, prochaineVerifLe])
}

model PaymentEvent {
  id            String   @id @default(cuid())
  paiementId    String?
  paiement      Payment? @relation(fields: [paiementId], references: [id])
  fournisseur   String
  cleDedup      String   @unique               // id d'événement du fournisseur, sinon SHA-256 du corps
  corpsBrut     String                         // enregistré avant tout traitement
  entetes       Json
  signatureValide Boolean
  recuLe        DateTime @default(now())
  traiteLe      DateTime?
  erreur        String?
}

model ManualPaymentClaim {
  id             String            @id @default(cuid())
  commandeId     String
  commande       Order             @relation(fields: [commandeId], references: [id])
  operateur      Operateur
  referenceTransaction String                  // normalisée (majuscules, sans espaces)
  telephonePayeur String
  montantCdf     Int
  statut         StatutReclamation @default(EN_ATTENTE)
  traiteParId    String?
  traiteLe       DateTime?
  motifRefus     String?
  creeLe         DateTime          @default(now())
  @@unique([operateur, referenceTransaction])
  @@index([statut, creeLe])
}

model Ticket {
  id           String       @id @default(cuid())
  publicId     String       @unique            // ET-XXXX-XXXX
  jeton        String       @unique            // 128 bits base32, lien SMS
  commandeId   String
  commande     Order        @relation(fields: [commandeId], references: [id])
  evenementId  String
  evenement    Event        @relation(fields: [evenementId], references: [id])
  typeBilletId String
  typeBillet   TicketType   @relation(fields: [typeBilletId], references: [id])
  titulaire    String?
  entree       String?
  prixPayeCdf  Int
  signature    String                          // Ed25519 de publicId|code événement
  cleVersion   Int          @default(1)        // rotation de clé
  statut       StatutBillet @default(VALIDE)
  premierScanId String?     @unique
  emisLe       DateTime     @default(now())
  scans        Scan[]
  @@index([evenementId, statut])
}

model Scan {
  id            String       @id @default(cuid())
  scanClientId  String       @unique           // généré par l'appareil, rend la synchro idempotente
  billetId      String?
  billet        Ticket?      @relation(fields: [billetId], references: [id])
  evenementId   String
  appareilId    String
  appareil      ScannerDevice @relation(fields: [appareilId], references: [id])
  controleurId  String
  resultat      ResultatScan
  chargeBrute   String?                         // pour les refus
  porte         String?
  scanneLe      DateTime                        // heure appareil corrigée du décalage
  recuLe        DateTime     @default(now())
  conflit       Boolean      @default(false)    // doublon hors ligne signalé à l'admin
  @@index([evenementId, scanneLe])
  @@index([billetId])
}

model ScannerDevice {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  evenementId String
  libelle     String?
  derniereSynchroLe DateTime?
  creeLe      DateTime @default(now())
  scans       Scan[]
}

model EventController {
  userId      String
  user        User   @relation(fields: [userId], references: [id])
  evenementId String
  evenement   Event  @relation(fields: [evenementId], references: [id])
  porte       String?
  @@id([userId, evenementId])
}

model PromoCode {
  id          String    @id @default(cuid())
  code        String    @unique
  type        TypePromo
  valeur      Int                               // bps si pourcentage, CDF si montant
  evenementId String?                           // null = global
  quota       Int?
  utilise     Int       @default(0)
  debutLe     DateTime?
  finLe       DateTime?
  limiteParTelephone Int @default(1)
  actif       Boolean   @default(true)
  utilisations PromoRedemption[]
}

model PromoRedemption {
  id          String    @id @default(cuid())
  promoId     String
  promo       PromoCode @relation(fields: [promoId], references: [id])
  commandeId  String    @unique
  commande    Order     @relation(fields: [commandeId], references: [id])
  telephone   String
  remiseCdf   Int
  creeLe      DateTime  @default(now())
  @@index([promoId, telephone])
}

model WaitlistEntry {
  id           String      @id @default(cuid())
  evenementId  String
  typeBilletId String?
  typeBillet   TicketType? @relation(fields: [typeBilletId], references: [id])
  telephone    String
  consentementLe DateTime
  prevenuLe    DateTime?
  creeLe       DateTime    @default(now())
  @@unique([evenementId, telephone])
}

model SmsAlertSubscription {
  id             String    @id @default(cuid())
  telephone      String
  villeId        String?
  ville          City?     @relation(fields: [villeId], references: [id])
  consentementLe DateTime
  texteConsentement String                      // version exacte du texte accepté
  desinscritLe   DateTime?
  creeLe         DateTime  @default(now())
  @@index([telephone])
}

model SmsLog {
  id          String    @id @default(cuid())
  telephone   String
  gabarit     String                            // otp, billets, attente, paye_sans_place…
  fournisseur String
  statut      StatutSms @default(EN_FILE)
  referenceFournisseur String?
  erreur      String?
  creeLe      DateTime  @default(now())
  @@index([telephone, creeLe])
}

model ExchangeRate {
  id        String   @id @default(cuid())
  cdfParUsd Int
  effectifLe DateTime
  saisiParId String
  creeLe    DateTime @default(now())
  @@index([effectifLe])
}

model Setting {
  cle       String   @id                        // commission_bps, limite_billets, numeros_marchands…
  valeur    Json
  majParId  String?
  majLe     DateTime @updatedAt
}

model Payout {
  id             String    @id @default(cuid())
  organisateurId String
  organisateur   Organizer @relation(fields: [organisateurId], references: [id])
  evenementId    String
  montantCdf     Int
  operateur      Operateur?
  referenceTransaction String
  effectueLe     DateTime
  saisiParId     String
  note           String?
  creeLe         DateTime  @default(now())
  @@index([organisateurId, evenementId])
}

model RateLimit {
  cle        String   @id                        // action:telephone ou action:ip
  compteur   Int
  fenetreDebut DateTime
}

model AuditLog {
  id        BigInt   @id @default(autoincrement())
  acteurId  String?
  acteurRole Role?
  action    String                               // evenement.publier, paiement.valider_manuel…
  entite    String
  entiteId  String?
  avant     Json?
  apres     Json?
  ip        String?
  creeLe    DateTime @default(now())
  @@index([entite, entiteId])
  @@index([creeLe])
}
```

Migration SQL ajoutée à la main : trigger `interdire_modif_audit` (rejette `UPDATE`/`DELETE` sur `AuditLog`) et contrainte `CHECK (restant >= 0 AND restant <= quota)` sur `TicketType`.

## 4. Flux critiques

**Réservation.** Action serveur `creerCommande` : validation Zod, limite de débit, champ piège, limite par téléphone et par événement (billets PAYEE + commandes EN_ATTENTE non expirées), puis transaction : `updateMany` conditionnel sur chaque `TicketType`, création `Order` + `OrderItem`, `reserveJusquau = now + 10 min`. Un `count === 0` annule la transaction et renvoie « plus assez de places ».

**Paiement.** `initierPaiement(code, operateur, numero)` : clé d'idempotence `commande.id + ':' + numéro de tentative`, contrainte unique en base. Un double clic tombe sur la contrainte et renvoie le paiement existant. Le client sonde `/api/commandes/[code]/statut` toutes les 3 s (lecture base uniquement).

**Webhook.** Lecture du corps brut, enregistrement `PaymentEvent` (y compris signature invalide, pour l'enquête), vérification de signature, puis `appliquerConfirmation(paiementId)` dans une transaction : `updateMany({ where: { id, statut: { not: REUSSI } } })` sur le paiement. Si `count === 0`, déjà traité, on s'arrête. Sinon commande → PAYEE et génération des billets dans la même transaction. Si la réservation a expiré et que la reprise du stock échoue : PAYEE_SANS_PLACE, SMS, priorité admin.

**Vérification planifiée.** Toutes les minutes : paiements EN_ATTENTE avec `prochaineVerifLe <= now`. Première vérification à 90 s, puis toutes les 2 min jusqu'à 15 min. Même fonction `appliquerConfirmation`. Expiration des réservations : libération du stock pour les commandes EN_ATTENTE échues sans paiement réussi.

**Démarrage.** `lib/env.ts` valide l'environnement au chargement ; si `NODE_ENV=production` et `PAYMENT_PROVIDER=simulation` ou `SMS_PROVIDER=simulation`, l'application lève une erreur dans `instrumentation.ts` et ne démarre pas.

## 5. Routes

Public : `/`, `/evenements/[slug]`, `/achat/[code]`, `/agent/[code]`, `/connexion`, `/mes-billets`, `/b/[jeton]`, `/organisateurs`, `/aide`, `/conditions`, `/confidentialite`.

Scanner (CONTROLEUR, ADMIN, SUPERADMIN) : `/scan`, `/scan/[evenementId]`.

Administration : `/admin/connexion`, `/admin`, `/admin/evenements`, `/admin/evenements/nouveau`, `/admin/evenements/[id]/[etape]`, `/admin/organisateurs`, `/admin/organisateurs/[id]`, `/admin/commandes`, `/admin/commandes/[code]`, `/admin/paiements`, `/admin/paiements/manuels`, `/admin/reversements`, `/admin/controleurs`, `/admin/promos`, `/admin/parametres`, `/admin/audit`.

Accès par rôle (vérifié dans `middleware.ts` et à nouveau dans chaque action serveur par `exigerRole()`) :

| Zone | SUPERADMIN | ADMIN | AGENT | CONTROLEUR | ORGANISATEUR |
|---|---|---|---|---|---|
| Tableau de bord | tout | tout | non | non | ses événements, lecture |
| Événements, organisateurs, promos | oui | oui | non | non | lecture des siens |
| Commandes | oui | oui | lecture | non | non |
| Paiements manuels | oui | oui | valider / refuser | non | non |
| Reversements | oui | oui | non | non | lecture des siens |
| Contrôleurs | oui | oui | non | non | non |
| Paramètres, comptes admin | oui | lecture | non | non | non |
| Audit | oui | oui | non | non | non |
| Scanner | oui | oui | non | ses événements | non |

API : `POST /api/webhooks/paiement/[fournisseur]`, `POST /api/cron/verifier-paiements` et `POST /api/cron/expirer-reservations` (secret `CRON_SECRET`), `GET /api/commandes/[code]/statut`, `GET /api/billets/[publicId]/pdf`, `GET /api/scan/[evenementId]/manifeste`, `POST /api/scan/synchroniser`, `GET /api/exports/evenements/[id]`.

Langue : cookie `NEXT_LOCALE` sans préfixe d'URL (le sélecteur de la maquette ne change pas l'adresse). Français par défaut, repli français clé par clé.

## 6. Composants

Repris un pour un de la maquette, avec les mêmes classes traduites en utilitaires Tailwind : `Entete`, `BandeauReseau`, `PiedDePage`, `Panneau`, `Etiquette`, `Tampon`, `Bouton` (principal, secondaire, danger, grand, plein), `LienBouton`, `Badge` (danger, succès, info, attention, neutre), `Note`, `Pastille`, `CarteCategorie`, `CarteEvenement`, `BlocUne`, `EtatVide`, `EtapesMobileMoney`, `PucesOperateurs`, `BandeOrganisateurs`, `InfosPratiques`, `Programme`, `CategorieBillet` + `Compteur`, `Progression`, `ChampTel` (drapeau, +243, détection opérateur), `SaisieOtp` (collage, `one-time-code`), `CarteOperateur`, `RecapMontant`, `Minuteur`, `BulleUssd`, `ListeNumerotee`, `AlerteSecret`, `AideRienRecu`, `CarteAgent`, `RondEtat`, `BarreIndeterminee`, `BilletVivant`, `LigneBillet`, `Onglets`.

Nouveaux, dans le même langage : `FormAlerteSms`, `PanneauMarqueVide` (accueil sans événement), `ListeAttente`, `EcranResultatScan` (vert, rouge, orange), `EtatSynchro`, `Kpi`, `TableauDonnees`, `AssistantEvenement`, `ListeManques`, `ApercuPublic`, `RecadrageAffiche`.

Composants client seulement là où il le faut (filtres, compteur de billets, parcours d'achat, billet vivant, scanner). Le reste en Server Components pour tenir les 150 ko.

Retirés de la maquette : bloc « Démonstration : simuler la réponse de l'opérateur », « Démo : n'importe quel code à 6 chiffres », billet de démonstration de l'aperçu d'accueil (remplacé par un billet dont l'identifiant affiche clairement `ET-XXXX-XXXX` et « Exemple »), taux fixe, tableaux de données.

## 7. Étapes

Chaque étape se termine par `pnpm lint`, `pnpm typecheck`, `pnpm test` et les tests Playwright concernés, puis un point avec toi : ce qui est fait, comment le vérifier.

1. **Socle et thème.** Next.js 15, TypeScript strict, Tailwind v4, tokens de styles.css, polices next/font, en-tête, pied de page, fond Kuba, bascule clair/sombre, next-intl, `lib/env.ts`, CLAUDE.md, test anti-contenu inventé. Vérif : page vide stylée identique à la maquette en 360 px et 1280 px, captures Playwright comparées à `design/maquette`.
2. **Module Kuba.** `scripts/kuba-reference.mjs` (20 identifiants, phases 0, 1, 2, 29, 58 000 000, grilles 11, 13, 4 × 5, 12 × 5, 20 × 7), port TypeScript, tests Vitest d'égalité stricte des SVG et des signes. Vérif : `pnpm test kuba`.
3. **Schéma et seeds.** Migration initiale + triggers, `seed.ts`, `seed-demo.ts` avec ses garde-fous. Vérif : `prisma migrate reset` puis seed prod, base sans aucun événement ; seed démo refusé avec `NODE_ENV=production`.
4. **Pages publiques et états vides.** Accueil (0, 1, n événements), filtres dérivés des données, page événement, complet → liste d'attente, alertes SMS. Vérif : test Playwright « base vide ».
5. **Administration des événements.** Connexion admin provisoire, assistant en étapes, sauvegarde auto, règle de publication, organisateurs, lieux, aperçu, visuels (dépend de la question 4). Vérif : création + publication en moins de 5 min, apparition en « À la une ».
6. **Connexion OTP.** Acheteurs et admins (mot de passe + OTP), sessions, limites de débit.
7. **Commande et réservation.** Test de concurrence sur la dernière place (deux transactions parallèles sur PostgreSQL réel).
8. **Paiement.** Interface, simulation, webhook idempotent (test : trois fois le même webhook), cron de vérification, paiement manuel et file AGENT, PAYEE_SANS_PLACE. Adaptateur réel quand j'ai la documentation.
9. **Billets et PDF.** Identifiants, signature Ed25519, QR réel (`qrcode`), PDF (`pdf-lib`), lien SMS.
10. **Mes billets hors ligne.** IndexedDB, décalage d'horloge, état vide.
11. **Scanner.** Manifeste, validation hors ligne, IndexedDB, synchro, conflits, BarcodeDetector puis `@zxing/browser`. Vérif : Playwright en mode hors ligne, doublon orange, QR modifié rouge.
12. **SMS.** Interface, simulation journalisée, gabarits.
13. **Tableau de bord, reversements, exports.** Zéros lisibles sans vente, export Excel.
14. **PWA.** Serwist, manifestes public et scanner, cache des billets.
15. **Sécurité.** CSP avec nonce, en-têtes, origine des actions serveur, chiffrement des numéros, revue.
16. **Traductions et pages légales.** Fichiers ln/sw avec clés vides, repli français ; Conditions et Confidentialité avec la liste des points à faire valider par un juriste.

## 8. Dépendances prévues

next@15, react@19, typescript, tailwindcss@4, @prisma/client + prisma, zod, next-intl, @serwist/next, @noble/ed25519 (signature, fonctionne aussi dans le navigateur du scanner), qrcode, @zxing/browser, pdf-lib, sharp, exceljs, argon2 (ou @node-rs/argon2), idb, vitest, @playwright/test, eslint, prettier. shadcn/ui seulement pour Dialog, DropdownMenu et Select (Radix), restylés.

## 9. Ce que je ne peux pas garantir sans mesure

Budget de 150 ko de JS sur l'accueil avec next-intl et React 19 : atteignable si l'accueil reste en Server Components avec un seul îlot client pour les filtres (confiance moyenne, je mesure dès l'étape 4 avec `next build` et Lighthouse en 3G lente). Lighthouse Performance 90 en 3G lente dépend aussi de l'hébergement (latence vers Kinshasa) : je mesure, je ne promets pas avant d'avoir la réponse à la question 3.
