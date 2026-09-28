-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "infosPratiquesEn" TEXT,
ADD COLUMN     "titreEn" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "langue" TEXT NOT NULL DEFAULT 'fr';

-- AlterTable
ALTER TABLE "SmsAlertSubscription" ADD COLUMN     "langue" TEXT NOT NULL DEFAULT 'fr';

-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "langue" TEXT NOT NULL DEFAULT 'fr';
