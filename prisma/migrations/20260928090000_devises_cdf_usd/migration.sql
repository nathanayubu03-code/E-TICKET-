-- Paiement en CDF ou en USD. Aucune donnée perdue : les colonnes en CDF sont renommées
-- (RENAME COLUMN, pas de suppression) et toutes les lignes existantes prennent la devise CDF.

CREATE TYPE "Devise" AS ENUM ('CDF', 'USD');

-- Catégorie de billet : prix en USD facultatif, en centimes.
ALTER TABLE "TicketType" ADD COLUMN "prixUsd" INTEGER;

-- Commande
ALTER TABLE "Order" ADD COLUMN "devise" "Devise" NOT NULL DEFAULT 'CDF';
ALTER TABLE "Order" RENAME COLUMN "sousTotalCdf" TO "sousTotal";
ALTER TABLE "Order" RENAME COLUMN "remiseCdf" TO "remise";
ALTER TABLE "Order" RENAME COLUMN "totalCdf" TO "total";
ALTER TABLE "Order" RENAME COLUMN "commissionCdf" TO "montantCommission";
ALTER TABLE "Order" RENAME COLUMN "netOrganisateurCdf" TO "netOrganisateur";

ALTER TABLE "OrderItem" RENAME COLUMN "prixUnitaireCdf" TO "prixUnitaire";

-- Paiement Mobile Money et paiement chez un agent
ALTER TABLE "Payment" RENAME COLUMN "montantCdf" TO "montant";
ALTER TABLE "Payment" ADD COLUMN "devise" "Devise" NOT NULL DEFAULT 'CDF';
ALTER TABLE "ManualPaymentClaim" RENAME COLUMN "montantCdf" TO "montant";
ALTER TABLE "ManualPaymentClaim" ADD COLUMN "devise" "Devise" NOT NULL DEFAULT 'CDF';

-- Billet
ALTER TABLE "Ticket" RENAME COLUMN "prixPayeCdf" TO "prixPaye";
ALTER TABLE "Ticket" ADD COLUMN "devise" "Devise" NOT NULL DEFAULT 'CDF';

-- Codes promo : les montants fixes existants étaient en CDF ; les pourcentages n'ont pas de devise.
ALTER TABLE "PromoCode" ADD COLUMN "devise" "Devise";
UPDATE "PromoCode" SET "devise" = 'CDF' WHERE "type" = 'MONTANT';
ALTER TABLE "PromoRedemption" RENAME COLUMN "remiseCdf" TO "remise";

-- Reversements aux organisateurs
ALTER TABLE "Payout" RENAME COLUMN "montantCdf" TO "montant";
ALTER TABLE "Payout" ADD COLUMN "devise" "Devise" NOT NULL DEFAULT 'CDF';
