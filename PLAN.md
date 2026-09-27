# PLAN.md · e-Ticket RDC

Statut : plan validé le 27/09/2026, construction en cours. Voir la section « Avancement » en fin de fichier.

## 0. Décisions prises sur les écarts entre le prompt et le dépôt

1. **Emplacement de la maquette.** La maquette HTML statique est dans `design/maquette/` (déplacée depuis `site/` à l'étape 1). Le canvas reste dans `design/project/` et sert de référence pour le scanner, le tableau de bord et les états.
2. **Tokens.** `design/maquette/assets/styles.css` fait foi, avec son mécanisme `[data-theme]` + `prefers-color-scheme`. `tokens/theme.css` reste tel quel, non utilisé ; les écarts sont listés dans `docs/design.md`.
3. **Préfixes Afrimoney.** 090 et 091, marqués « à confirmer » dans `lib/operateurs.ts`. L'utilisateur peut corriger l'opérateur détecté.
4. **Next.js 16.** Décision : Next.js 16.3.6. Raison : au 27/09/2026, next-intl 4.14 déclare `next ^16.0.0` dans ses peerDependencies, @serwist/next 9.5 déclare `next >=14.0.0` (et Next 16 garde webpack via `next build --webpack`, requis par @serwist/next), Prisma 7.10 est indépendant de la version de Next (client généré + adaptateur `@prisma/adapter-pg`). Conséquences : `proxy.ts` remplace `middleware.ts`, paramètres de route asynchrones, ESLint en configuration plate, build en `--webpack`. Prisma : 7.10.0 (la balise « latest » du registre pointe vers une 8.0 release candidate, écartée).
5. **QR code.** Le QR contient seulement le code court de l'événement et le code aléatoire du billet (128 bits, base32), sans signature. Le scanner télécharge la liste des empreintes SHA-256 des codes valides avant de démarrer (refus sans elle), se resynchronise toutes les 60 s avec du réseau, vérifie côté serveur quand il est en ligne, et affiche l'état orange « Inconnu, à vérifier » pour un code absent de sa liste hors ligne. Grille Kuba 11 × 11 et zone QR de 168 px conservées. Mesure de lisibilité dans `docs/billet.md`.
6. **Sel d'affichage.** Le champ s'appelle `selAffichage` : il est public (le téléphone de l'acheteur en a besoin pour le signe du moment). La sécurité repose sur le code aléatoire et la liste côté scanner.
7. **Code 128 bits et identifiant lisible.** `ET-XXXX-XXXX` est public ; le code 128 bits est à la fois le contenu du QR et le jeton du lien SMS (`/b/<code>`). Sa possession vaut billet, comme le billet papier.
8. **Seed de démonstration.** Refus si `NODE_ENV=production`, si `APP_ENV=production`, ou si l'hôte de `DATABASE_URL` n'est pas `localhost`, `127.0.0.1`, `db` ou `postgres`.
9. **Journal d'audit non modifiable.** Trigger PostgreSQL qui rejette `UPDATE` et `DELETE` sur `AuditLog`.
10. **Réservation atomique.** Compteur `restant` sur `TicketType`, décrément par `updateMany` conditionnel. Test : 20 requêtes simultanées sur les 3 dernières places donnent exactement 3 succès.

## 1. Réponses aux questions (27/09/2026)

1. Agrégateur Mobile Money : non choisi. `SimulationProvider` en développement, interface `PaymentProvider` prête pour un adaptateur. Liste des informations à demander dans `docs/paiement.md`.
2. Fournisseur SMS : non choisi. `SimulationSmsProvider` qui écrit dans `SmsLog`, interdit en production.
3. Hébergement : Vercel + Neon, région européenne. `/api/cron/verifier-paiements` protégée par `CRON_SECRET`, idempotente, Vercel Cron dans `vercel.json`, alternative de planificateur externe dans `docs/deploiement.md`.
4. Stockage : compatible S3, cible Cloudflare R2 ; adaptateur disque local en développement.
5. Domaine et contact : variables `NEXT_PUBLIC_SITE_URL`, `CONTACT_ORGANISATEURS_EMAIL`, `CONTACT_ORGANISATEURS_TELEPHONE` ; bloc masqué si vide.
6. Next.js : 16 (voir 0.4).
7. Déplacement de `site/` : fait.

## 2. Arborescence

```
.
├── CLAUDE.md
├── PLAN.md
├── design/
│   ├── maquette/                 ← maquette HTML validée, source de vérité visuelle, jamais importée par l'app
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
├── proxy.ts                      ← rôles sur /admin et /scan, en-têtes de sécurité, CSP avec nonce (Next 16)
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
  selAffichage    String                      // public : sert au signe du moment, pas à la sécurité
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

Accès par rôle (vérifié dans `proxy.ts` et à nouveau dans chaque action serveur par `exigerRole()`) :

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

next@16, react@19, typescript, tailwindcss@4, @prisma/client + prisma, zod, next-intl, @serwist/next, @noble/ed25519 (signature, fonctionne aussi dans le navigateur du scanner), qrcode, @zxing/browser, pdf-lib, sharp, exceljs, argon2 (ou @node-rs/argon2), idb, vitest, @playwright/test, eslint, prettier. shadcn/ui seulement pour Dialog, DropdownMenu et Select (Radix), restylés.

## 9. Ce que je ne peux pas garantir sans mesure

Budget de 150 ko de JS sur l'accueil avec next-intl et React 19 : atteignable si l'accueil reste en Server Components avec un seul îlot client pour les filtres (confiance moyenne, je mesure dès l'étape 4 avec `next build` et Lighthouse en 3G lente). Lighthouse Performance 90 en 3G lente dépend aussi de l'hébergement (latence vers Kinshasa) : je mesure, je ne promets pas avant d'avoir la réponse à la question 3.

## Avancement

Mis à jour à la fin de chaque étape. Une nouvelle session reprend à la première étape non cochée.

### Étapes

- [x] 1. Socle et thème
- [x] 2. Module Kuba (parité exacte : 961 motifs, 960 SVG, 320 rendus inline, 160 signes, sur 20 identifiants et 8 phases)
- [x] 3. Schéma et seeds (migration initiale, CHECK sur le stock, trigger d'audit ; seed de production idempotent ; seed [DEMO] protégé)
- [x] 4. Pages publiques et états vides (accueil 0 / 1 / n événements, filtres dérivés des données, recherche, page événement, panier, liste d'attente, alertes SMS, aide, organisateurs ; 5 tests e2e)
- [x] 5. Administration des événements (connexion mot de passe + OTP, rôles vérifiés dans proxy.ts et en base, assistant en 8 étapes avec sauvegarde automatique, règle de publication avec liste des manques, duplication, archivage, organisateurs avec numéro de reversement chiffré, affiches recadrées 4:5 et 16:9 en WebP et AVIF ; e2e : création et publication en moins de 5 minutes)
- [x] 6. Connexion OTP (acheteurs : numéro + code à 6 chiffres, collage et remplissage SMS, renvoi après 45 s, compte créé au premier passage, session 30 jours ; e2e)
- [x] 7. Commande et réservation (décrément conditionnel du stock, verrou consultatif par numéro et événement pour la limite par personne, réservation de 10 min, expiration idempotente, codes promo, commandes gratuites ; test : 20 demandes simultanées sur 3 places donnent exactement 3 succès)
- [x] 8. Paiement (interface PaymentProvider, SimulationProvider par webhook signé, idempotence double clic, webhook enregistré brut puis traité une seule fois, vérification planifiée 90 s puis 2 min pendant 15 min, PAYEE_SANS_PLACE, paiement chez un agent avec validation AGENT ; adaptateur réel en attente de l'agrégateur, voir docs/paiement.md)
- [x] 9. Billets et PDF (code 128 bits base32 + identifiant ET-XXXX-XXXX, QR alphanumérique version 2 dans la zone de la grille 11 × 11, lisibilité mesurée dans docs/billet.md, PDF A6 de moins de 30 ko, page du lien SMS)
- [x] 10. Mes billets hors ligne (billets serveur et billets du téléphone fusionnés, IndexedDB avec décalage d'horloge, onglets à venir / passés, état vide ; lisibles sans session ; le chargement de la page sans réseau vient avec la PWA à l'étape 14)
- [x] 11. Scanner (manifeste des empreintes SHA-256 obligatoire au démarrage, resynchronisation toutes les 60 s, vérification serveur en ligne avec passage VALIDE → UTILISE conditionnel, mode avion avec état orange « Inconnu, à vérifier », synchronisation idempotente et doublons signalés, BarcodeDetector ou @zxing/browser, saisie du numéro, lampe ; administration des contrôleurs avec suivi en direct)
- [x] 12. SMS (interface SmsProvider, simulation journalisée et interdite en production, OTP masqués hors simulation, billets, payée sans place, réclamation refusée, alerte des abonnés à la première publication, liste d'attente prévenue par un administrateur, journal des SMS)
- [x] 13. Tableau de bord, reversements, exports (ventes du jour et du mois, brut, commission, net, par opérateur et par catégorie, zéros sans vente ; reversements dus et enregistrés ; export Excel ; commandes : recherche, renvoi SMS, annulation, remboursement, payées sans place en priorité ; codes promo ; paramètres ; journal d'audit ; SMS envoyés)
- [x] 14. PWA (Serwist : manifestes public et scanner, icônes, service worker qui garde en cache les pages des billets et du scanner, API jamais en cache, page de secours hors ligne ; test sur build de production avec serveur réellement arrêté)
- [ ] 15. Sécurité
- [ ] 16. Traductions et pages légales

### Environnement de travail

- PostgreSQL 16 local : base `eticket` (développement) et `eticket_test` (tests), utilisateur `eticket`. `service postgresql start` si le conteneur a redémarré.
- `.env` local non versionné (voir `.env.example`).
- Playwright 1.56.1 figé pour le Chromium préinstallé ; e2e sur `next dev` (port 3100, dossier `.next-e2e`) parce que la simulation est interdite par `next start`.

### Écarts avec la maquette, et pourquoi

- Texte de l'aperçu du billet : « si c'est une vraie » devient « si c'est un vrai » (accord avec « billet »).
- Pied de page : liens réels (Aide, Payer chez un agent, Alertes SMS, Conditions, Confidentialité). Le lien « Alertes SMS » est ajouté pour la désinscription, exigée par le consentement explicite. Les villes affichées viennent des événements publiés.
- Placeholder du numéro : « XX XXX XX XX » au lieu d'un numéro d'exemple, pour n'afficher aucun numéro inventé.

- Filtres de l'accueil en liens et recherche en formulaire GET, traités côté serveur : ils marchent sans JavaScript et n'alourdissent pas la page. La maquette filtrait en JavaScript ; le rendu est identique. Par défaut, « Toutes » les villes (la maquette partait de Kinshasa, ce qui masquerait les autres villes).
- Page événement : le plan de quartier dessiné de la maquette est retiré (ce serait un faux plan). À la place, l'adresse et le lien « Ouvrir l'itinéraire » vers OpenStreetMap, à partir des coordonnées GPS ou de l'adresse saisies.
- Billet d'aperçu de l'accueil : données de l'événement à la une, numéro neutre `ET-XXXX-XXXX`, étiquette « Exemple », QR qui ne contient que le mot EXEMPLE. Pas de titulaire ni de porte inventés.
- Couverture sans affiche : géométrie Kuba calculée sur l'identifiant de l'événement, couleurs de la palette Kuba dont le fond est celui de la catégorie (Spectacles : palette ivoire, la plus proche).
- Événement : champs `sousTitre` (ligne d'artistes) et `genre` ajoutés pour reproduire la maquette.
- Captures : les pages de la maquette s'affichent avec la police de repli dans l'environnement de test (Google Fonts n'y est pas joignable depuis le navigateur) ; l'application auto-héberge ses polices et les affiche correctement. Les captures pleine page de 1280 px montrent le fond Kuba seulement sur la hauteur de l'écran, parce que le fond est fixe (`background-attachment: fixed`) ; ce n'est pas visible en navigation.

- Administration : la maquette n'a pas d'écran d'administration en HTML ; les écrans reprennent ses variables, bordures et typographie, sans motif de fond (`app/styles/complements.css`).

- Écran de paiement : le bouton « Ajouter au portefeuille » de la maquette est retiré (Apple Wallet et Google Wallet demandent des comptes et certificats que nous n'avons pas). Le bloc « Démonstration » est retiré. Le paiement chez un agent n'apparaît que si un numéro marchand est saisi dans Paramètres.
- États « Paiement reçu », « Paiement refusé », « Temps écoulé » : l'annonce vocale (`role="status"` / `role="alert"`) est portée par le conteneur plutôt que par le titre, pour que le titre reste un titre pour les lecteurs d'écran.

### Décisions techniques

- Les classes de la maquette sont reprises comme composants CSS (`@layer components`) plutôt que réécrites en utilitaires : c'est le moyen le plus sûr de garder chaque valeur identique. Tailwind sert à la mise en page des nouveaux écrans, avec des utilitaires qui pointent vers les mêmes variables.
- Thème : cookie `et-theme` lu côté serveur pour poser `data-theme` sur `<html>` sans script inline (compatible CSP stricte). Sans cookie, `prefers-color-scheme` s'applique, comme dans la maquette.
- Langue : cookie `NEXT_LOCALE`, sans préfixe d'URL.
- L'administration reste en français uniquement (équipe interne) ; seules les pages publiques et le scanner passent par next-intl.
- `PAYMENT_PROVIDER` et `SMS_PROVIDER` acceptent `non_configure` : l'application démarre en production sans fournisseur, les achats en ligne affichent que le paiement n'est pas ouvert. La simulation reste interdite.
- Le socle d'authentification (sessions en cookie httpOnly, OTP haché, jeton de rôles signé lu par `proxy.ts`, `exigerRole` en base) est posé à l'étape 5 parce que l'administration en dépend ; l'étape 6 y ajoute la connexion des acheteurs.
- Recadrage des affiches : choix de la zone (automatique « attention » de sharp, haut, centre, bas) par format, plutôt qu'un outil de recadrage libre à la souris, pour garder un JavaScript minimal dans l'administration. L'original est réencodé (métadonnées EXIF supprimées).
- Jeton de rôles signé (HMAC) dans un cookie séparé : il permet au proxy de refuser tôt sans base de données ; chaque page et action serveur revérifie la session et les rôles en base.
- Tests Vitest et Playwright : les bases `eticket_test` et `eticket_e2e` sont recréées à chaque lancement (`prisma migrate reset`). Prisma 7 demande un consentement explicite quand un agent lance cette commande ; les scripts de test le donnent pour ces deux bases locales uniquement.
- Réservation : elle expire à 10 minutes même si un paiement est en cours, comme le demande le prompt ; une confirmation tardive retente la réservation (tout ou rien) et, faute de place, passe la commande en `PAYEE_SANS_PLACE`.
- Confirmation : la preuve de paiement (paiement `REUSSI` ou réclamation `VALIDEE`) et le passage de la commande en `PAYEE` avec génération des billets sont faits dans la même transaction, avec verrou sur la commande.
- Simulation : l'issue dépend de la fin du numéro (0000 refusé, 9999 sans réponse, sinon reçu en 4 s) et passe par un vrai webhook signé traité comme en production.
- Scanner : le motif attendu affiché sur l'écran vert est calculé à partir de l'identifiant lisible du billet (le manifeste associe chaque empreinte à son identifiant et à sa catégorie, qui sont publics). Le code secret du billet n'est jamais téléchargé par le scanner.
- Scanner : anti-rebond de 4 secondes sur la caméra (le même QR lu en boucle ne compte qu'une fois), pas sur la saisie manuelle.
- Tableau de bord : barres simples en HTML calculées sur les données réelles, pas de bibliothèque de graphiques ni de courbe décorative. Rien n'est affiché qui ne vienne de la base.
- Paramètres : modifiables par le seul super-administrateur ; l'ADMIN les lit.
- Export Excel : numéros complets pour l'équipe e-Ticket, masqués pour l'organisateur.
- PWA : `context.setOffline` de Playwright ne coupe pas les requêtes du service worker ; le test hors ligne (`npm run test:pwa`) démarre et arrête lui-même `next start` pour obtenir une vraie coupure. Les pages préchargées par Next.js (liens visibles) restent disponibles hors ligne ; seule une page jamais chargée affiche la page de secours.
