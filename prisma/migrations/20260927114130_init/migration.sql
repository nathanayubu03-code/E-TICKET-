-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'AGENT', 'CONTROLEUR', 'ORGANISATEUR', 'ACHETEUR');

-- CreateEnum
CREATE TYPE "StatutEvenement" AS ENUM ('BROUILLON', 'A_VALIDER', 'PUBLIE', 'COMPLET', 'ANNULE', 'TERMINE');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('EN_ATTENTE', 'PAYEE', 'PAYEE_SANS_PLACE', 'EXPIREE', 'ECHOUEE', 'ANNULEE', 'REMBOURSEE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('MOBILE_MONEY', 'MANUEL', 'GRATUIT');

-- CreateEnum
CREATE TYPE "Operateur" AS ENUM ('MPESA', 'AIRTEL', 'ORANGE', 'AFRIMONEY');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('INITIE', 'EN_ATTENTE', 'REUSSI', 'ECHOUE', 'EXPIRE');

-- CreateEnum
CREATE TYPE "StatutReclamation" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "StatutBillet" AS ENUM ('VALIDE', 'UTILISE', 'ANNULE');

-- CreateEnum
CREATE TYPE "ResultatScan" AS ENUM ('VALIDE', 'DEJA_SCANNE', 'REFUSE', 'INCONNU');

-- CreateEnum
CREATE TYPE "TypePromo" AS ENUM ('POURCENTAGE', 'MONTANT');

-- CreateEnum
CREATE TYPE "ObjetOtp" AS ENUM ('CONNEXION', 'ADMIN_DEUXIEME_ETAPE');

-- CreateEnum
CREATE TYPE "StatutSms" AS ENUM ('EN_FILE', 'ENVOYE', 'ECHOUE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "nom" TEXT,
    "email" TEXT,
    "motDePasse" TEXT,
    "roles" "Role"[] DEFAULT ARRAY['ACHETEUR']::"Role"[],
    "organisateurId" TEXT,
    "desactiveLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "jetonHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deuxiemeEtapeLe" TIMESTAMP(3),
    "expireLe" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "objet" "ObjetOtp" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "essais" INTEGER NOT NULL DEFAULT 0,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organizer" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contactNom" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "reversementOperateur" "Operateur",
    "reversementNumeroChiffre" TEXT,
    "reversementNumeroFin" TEXT,
    "commissionBps" INTEGER,
    "verifie" BOOLEAN NOT NULL DEFAULT false,
    "verifieLe" TIMESTAMP(3),
    "verifieParId" TEXT,
    "archiveLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fuseau" TEXT NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "villeId" TEXT NOT NULL,
    "adresse" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "icone" TEXT NOT NULL,
    "fond" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "statut" "StatutEvenement" NOT NULL DEFAULT 'BROUILLON',
    "categorieId" TEXT,
    "organisateurId" TEXT,
    "lieuId" TEXT,
    "villeId" TEXT,
    "fuseau" TEXT,
    "ouverturePortesLe" TIMESTAMP(3),
    "debutLe" TIMESTAMP(3),
    "finLe" TIMESTAMP(3),
    "infosPratiques" TEXT,
    "afficheCle" TEXT,
    "afficheVariantes" JSONB,
    "selAffichage" TEXT NOT NULL,
    "limiteParPersonne" INTEGER,
    "archiveLe" TIMESTAMP(3),
    "publieLe" TIMESTAMP(3),
    "brouillonSauveLe" TIMESTAMP(3),
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventScheduleItem" (
    "id" TEXT NOT NULL,
    "evenementId" TEXT NOT NULL,
    "heure" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "detail" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketType" (
    "id" TEXT NOT NULL,
    "evenementId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "prixCdf" INTEGER NOT NULL,
    "quota" INTEGER NOT NULL,
    "restant" INTEGER NOT NULL,
    "venteDebutLe" TIMESTAMP(3),
    "venteFinLe" TIMESTAMP(3),
    "limiteParCommande" INTEGER,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "userId" TEXT,
    "evenementId" TEXT NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'EN_ATTENTE',
    "mode" "ModePaiement",
    "sousTotalCdf" INTEGER NOT NULL,
    "remiseCdf" INTEGER NOT NULL DEFAULT 0,
    "totalCdf" INTEGER NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "commissionCdf" INTEGER NOT NULL,
    "netOrganisateurCdf" INTEGER NOT NULL,
    "tauxUsdId" TEXT,
    "reserveJusquau" TIMESTAMP(3) NOT NULL,
    "stockLibere" BOOLEAN NOT NULL DEFAULT false,
    "payeeLe" TIMESTAMP(3),
    "annuleeLe" TIMESTAMP(3),
    "rembourseeLe" TIMESTAMP(3),
    "rembourseeParId" TEXT,
    "noteRemboursement" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "typeBilletId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaireCdf" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "operateur" "Operateur" NOT NULL,
    "telephone" TEXT NOT NULL,
    "montantCdf" INTEGER NOT NULL,
    "cleIdempotence" TEXT NOT NULL,
    "referenceOperateur" TEXT,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'INITIE',
    "statutBrut" TEXT,
    "motifEchec" TEXT,
    "nbVerifications" INTEGER NOT NULL DEFAULT 0,
    "prochaineVerifLe" TIMESTAMP(3),
    "confirmeLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paiementId" TEXT,
    "fournisseur" TEXT NOT NULL,
    "cleDedup" TEXT NOT NULL,
    "corpsBrut" TEXT NOT NULL,
    "entetes" JSONB NOT NULL,
    "signatureValide" BOOLEAN NOT NULL,
    "recuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteLe" TIMESTAMP(3),
    "erreur" TEXT,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualPaymentClaim" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "operateur" "Operateur" NOT NULL,
    "referenceTransaction" TEXT NOT NULL,
    "telephonePayeur" TEXT NOT NULL,
    "montantCdf" INTEGER NOT NULL,
    "statut" "StatutReclamation" NOT NULL DEFAULT 'EN_ATTENTE',
    "traiteParId" TEXT,
    "traiteLe" TIMESTAMP(3),
    "motifRefus" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualPaymentClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeEmpreinte" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "evenementId" TEXT NOT NULL,
    "typeBilletId" TEXT NOT NULL,
    "titulaire" TEXT,
    "entree" TEXT,
    "prixPayeCdf" INTEGER NOT NULL,
    "statut" "StatutBillet" NOT NULL DEFAULT 'VALIDE',
    "premierScanLe" TIMESTAMP(3),
    "premierePorte" TEXT,
    "emisLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "scanClientId" TEXT NOT NULL,
    "billetId" TEXT,
    "evenementId" TEXT NOT NULL,
    "appareilId" TEXT NOT NULL,
    "controleurId" TEXT NOT NULL,
    "resultat" "ResultatScan" NOT NULL,
    "chargeBrute" TEXT,
    "porte" TEXT,
    "horsLigne" BOOLEAN NOT NULL DEFAULT false,
    "scanneLe" TIMESTAMP(3) NOT NULL,
    "recuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conflit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "evenementId" TEXT NOT NULL,
    "libelle" TEXT,
    "derniereSynchroLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScannerDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventController" (
    "userId" TEXT NOT NULL,
    "evenementId" TEXT NOT NULL,
    "porte" TEXT,

    CONSTRAINT "EventController_pkey" PRIMARY KEY ("userId","evenementId")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "TypePromo" NOT NULL,
    "valeur" INTEGER NOT NULL,
    "evenementId" TEXT,
    "quota" INTEGER,
    "utilise" INTEGER NOT NULL DEFAULT 0,
    "debutLe" TIMESTAMP(3),
    "finLe" TIMESTAMP(3),
    "limiteParTelephone" INTEGER NOT NULL DEFAULT 1,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoRedemption" (
    "id" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "remiseCdf" INTEGER NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "evenementId" TEXT NOT NULL,
    "typeBilletId" TEXT,
    "telephone" TEXT NOT NULL,
    "consentementLe" TIMESTAMP(3) NOT NULL,
    "prevenuLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsAlertSubscription" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "villeId" TEXT,
    "consentementLe" TIMESTAMP(3) NOT NULL,
    "texteConsentement" TEXT NOT NULL,
    "desinscritLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsAlertSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "gabarit" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "statut" "StatutSms" NOT NULL DEFAULT 'EN_FILE',
    "referenceFournisseur" TEXT,
    "erreur" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "cdfParUsd" INTEGER NOT NULL,
    "effectifLe" TIMESTAMP(3) NOT NULL,
    "saisiParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "cle" TEXT NOT NULL,
    "valeur" JSONB NOT NULL,
    "majParId" TEXT,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "organisateurId" TEXT NOT NULL,
    "evenementId" TEXT NOT NULL,
    "montantCdf" INTEGER NOT NULL,
    "operateur" "Operateur",
    "referenceTransaction" TEXT NOT NULL,
    "effectueLe" TIMESTAMP(3) NOT NULL,
    "saisiParId" TEXT NOT NULL,
    "note" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "cle" TEXT NOT NULL,
    "compteur" INTEGER NOT NULL,
    "fenetreDebut" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "acteurId" TEXT,
    "acteurRole" "Role",
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "avant" JSONB,
    "apres" JSONB,
    "ip" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telephone_key" ON "User"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_jetonHash_key" ON "Session"("jetonHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "OtpCode_telephone_objet_creeLe_idx" ON "OtpCode"("telephone", "objet", "creeLe");

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_slug_key" ON "Organizer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "City_nom_key" ON "City"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_villeId_nom_key" ON "Venue"("villeId", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_code_key" ON "Event"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_statut_villeId_debutLe_idx" ON "Event"("statut", "villeId", "debutLe");

-- CreateIndex
CREATE INDEX "Event_statut_debutLe_idx" ON "Event"("statut", "debutLe");

-- CreateIndex
CREATE INDEX "EventScheduleItem_evenementId_ordre_idx" ON "EventScheduleItem"("evenementId", "ordre");

-- CreateIndex
CREATE INDEX "TicketType_evenementId_ordre_idx" ON "TicketType"("evenementId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");

-- CreateIndex
CREATE INDEX "Order_telephone_creeLe_idx" ON "Order"("telephone", "creeLe");

-- CreateIndex
CREATE INDEX "Order_statut_reserveJusquau_idx" ON "Order"("statut", "reserveJusquau");

-- CreateIndex
CREATE INDEX "Order_evenementId_statut_idx" ON "Order"("evenementId", "statut");

-- CreateIndex
CREATE INDEX "OrderItem_commandeId_idx" ON "OrderItem"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_cleIdempotence_key" ON "Payment"("cleIdempotence");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_referenceOperateur_key" ON "Payment"("referenceOperateur");

-- CreateIndex
CREATE INDEX "Payment_statut_prochaineVerifLe_idx" ON "Payment"("statut", "prochaineVerifLe");

-- CreateIndex
CREATE INDEX "Payment_commandeId_idx" ON "Payment"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_cleDedup_key" ON "PaymentEvent"("cleDedup");

-- CreateIndex
CREATE INDEX "ManualPaymentClaim_statut_creeLe_idx" ON "ManualPaymentClaim"("statut", "creeLe");

-- CreateIndex
CREATE UNIQUE INDEX "ManualPaymentClaim_operateur_referenceTransaction_key" ON "ManualPaymentClaim"("operateur", "referenceTransaction");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_publicId_key" ON "Ticket"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_codeEmpreinte_key" ON "Ticket"("codeEmpreinte");

-- CreateIndex
CREATE INDEX "Ticket_evenementId_statut_idx" ON "Ticket"("evenementId", "statut");

-- CreateIndex
CREATE INDEX "Ticket_commandeId_idx" ON "Ticket"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "Scan_scanClientId_key" ON "Scan"("scanClientId");

-- CreateIndex
CREATE INDEX "Scan_evenementId_scanneLe_idx" ON "Scan"("evenementId", "scanneLe");

-- CreateIndex
CREATE INDEX "Scan_billetId_idx" ON "Scan"("billetId");

-- CreateIndex
CREATE INDEX "Scan_evenementId_conflit_idx" ON "Scan"("evenementId", "conflit");

-- CreateIndex
CREATE INDEX "ScannerDevice_evenementId_idx" ON "ScannerDevice"("evenementId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PromoRedemption_commandeId_key" ON "PromoRedemption"("commandeId");

-- CreateIndex
CREATE INDEX "PromoRedemption_promoId_telephone_idx" ON "PromoRedemption"("promoId", "telephone");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_evenementId_telephone_key" ON "WaitlistEntry"("evenementId", "telephone");

-- CreateIndex
CREATE INDEX "SmsAlertSubscription_telephone_idx" ON "SmsAlertSubscription"("telephone");

-- CreateIndex
CREATE INDEX "SmsLog_telephone_creeLe_idx" ON "SmsLog"("telephone", "creeLe");

-- CreateIndex
CREATE INDEX "ExchangeRate_effectifLe_idx" ON "ExchangeRate"("effectifLe");

-- CreateIndex
CREATE INDEX "Payout_organisateurId_evenementId_idx" ON "Payout"("organisateurId", "evenementId");

-- CreateIndex
CREATE INDEX "AuditLog_entite_entiteId_idx" ON "AuditLog"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "AuditLog_creeLe_idx" ON "AuditLog"("creeLe");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisateurId_fkey" FOREIGN KEY ("organisateurId") REFERENCES "Organizer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_villeId_fkey" FOREIGN KEY ("villeId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organisateurId_fkey" FOREIGN KEY ("organisateurId") REFERENCES "Organizer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_lieuId_fkey" FOREIGN KEY ("lieuId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_villeId_fkey" FOREIGN KEY ("villeId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventScheduleItem" ADD CONSTRAINT "EventScheduleItem_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_typeBilletId_fkey" FOREIGN KEY ("typeBilletId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualPaymentClaim" ADD CONSTRAINT "ManualPaymentClaim_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_typeBilletId_fkey" FOREIGN KEY ("typeBilletId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_billetId_fkey" FOREIGN KEY ("billetId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_appareilId_fkey" FOREIGN KEY ("appareilId") REFERENCES "ScannerDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerDevice" ADD CONSTRAINT "ScannerDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerDevice" ADD CONSTRAINT "ScannerDevice_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventController" ADD CONSTRAINT "EventController_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventController" ADD CONSTRAINT "EventController_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_typeBilletId_fkey" FOREIGN KEY ("typeBilletId") REFERENCES "TicketType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsAlertSubscription" ADD CONSTRAINT "SmsAlertSubscription_villeId_fkey" FOREIGN KEY ("villeId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_organisateurId_fkey" FOREIGN KEY ("organisateurId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier que Prisma ne sait pas déclarer.
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_restant_borne" CHECK ("restant" >= 0 AND "restant" <= "quota");
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_prix_positif" CHECK ("prixCdf" >= 0 AND "quota" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_montants_positifs" CHECK ("totalCdf" >= 0 AND "sousTotalCdf" >= 0 AND "remiseCdf" >= 0);

-- Journal d'audit non modifiable : ni mise à jour, ni suppression, ni vidage.
CREATE OR REPLACE FUNCTION interdire_modif_audit() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Le journal d''audit ne peut pas être modifié';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_non_modifiable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION interdire_modif_audit();

CREATE TRIGGER audit_non_vidable
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION interdire_modif_audit();
