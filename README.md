# e-Ticket RDC

Billetterie d'événements pour la République Démocratique du Congo : concerts, matchs, festivals, conférences, spectacles. Paiement Mobile Money (M-Pesa, Airtel Money, Orange Money, Afrimoney), billet vivant avec motif Kuba, billets et scanner qui marchent sans réseau. Conçu pour des Android d'entrée de gamme en 360 px et une 3G instable.

Le site part en production vide : tout ce qui s'affiche au public est saisi dans l'administration.

## Documents

| Fichier | Contenu |
|---|---|
| `PLAN.md` | Architecture, schéma de données, décisions, avancement, résultats des vérifications |
| `CLAUDE.md` | Règles permanentes du projet |
| `design/maquette/` | Maquette HTML validée, source de vérité visuelle (`python3 -m http.server -d design/maquette`) |
| `design/project/` | Canvas de design (écrans hors maquette HTML : scanner, tableau de bord, états) |
| `docs/deploiement.md` | Mise en ligne sur Vercel et Neon, cron, R2, domaine |
| `docs/paiement.md` | Fonctionnement du paiement et questions pour l'agrégateur |
| `docs/billet.md` | Billet, QR code, mesure de lisibilité, hors ligne |
| `docs/motifs.md` | Algorithme du motif Kuba |
| `docs/securite.md` | Mesures de sécurité |
| `docs/design.md` | Tokens et écarts avec `tokens/theme.css` |
| `docs/logos.md` | Logos des opérateurs : fichiers attendus, remplacement |
| `docs/traductions/en.md` | Textes anglais à relire |
| `docs/legal-a-valider.md` | Questions pour un juriste |
| `docs/reste-a-faire.md` | Ce qui manque pour la production réelle |
| `docs/captures/` | Captures de chaque étape, face à la maquette |

## Pile technique

Next.js 16 (App Router, Server Components, Server Actions, build webpack), TypeScript strict, Tailwind CSS v4 avec les tokens de la maquette, PostgreSQL et Prisma 7, Zod, next-intl, Serwist (PWA), Vitest, Playwright.

## Installation locale

Prérequis : Node.js 22, PostgreSQL 16 (ou plus récent), `openssl`.

```bash
git clone <dépôt> e-ticket && cd e-ticket
npm install
cp .env.example .env
```

Créez la base et un utilisateur :

```bash
createuser -P eticket          # choisissez un mot de passe
createdb -O eticket eticket
createdb -O eticket eticket_test
createdb -O eticket eticket_e2e
```

Remplissez `.env` (chaque variable est commentée dans `.env.example`). Au minimum pour le développement :

```bash
DATABASE_URL=postgresql://eticket:<mot de passe>@localhost:5432/eticket
SESSION_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -hex 24)
PAYMENT_PROVIDER=simulation
SMS_PROVIDER=simulation
STORAGE_DRIVER=local
SUPERADMIN_TELEPHONE=+243XXXXXXXXX
SUPERADMIN_MOT_DE_PASSE=<12 caractères minimum, lettres et chiffres>
```

Puis :

```bash
npx prisma migrate deploy   # crée les tables
npm run db:seed             # super-administrateur, catégories, villes, paramètres
npm run dev                 # http://localhost:3000
```

## Variables d'environnement

Toutes sont décrites dans `.env.example`. Les principales :

| Variable | Rôle |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL (poolée pour l'application, directe pour les migrations) |
| `SESSION_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` | Secrets, validés au démarrage |
| `APP_ENV` | `development`, `staging` (version de test en ligne : bandeau rouge, codes SMS affichés à l'écran) ou `production` |
| `PAYMENT_PROVIDER`, `SMS_PROVIDER` | `simulation` (development et staging, **refusé en production**), `non_configure`, ou un fournisseur réel |
| `STORAGE_DRIVER`, `S3_*` | Affiches : disque local ou Cloudflare R2 |
| `NEXT_PUBLIC_SITE_URL` | Adresse publique, pour les liens envoyés par SMS ; obligatoire en production, hors `vercel.app` |
| `CONTACT_ORGANISATEURS_EMAIL`, `CONTACT_ORGANISATEURS_TELEPHONE`, `CONTACT_EMAIL`, `EDITEUR_*` | Contacts et mentions ; vides, les blocs ne s'affichent pas |
| `SUPERADMIN_*` | Utilisées seulement par le seed de production |

## Seed de production et super-administrateur

`npm run db:seed` crée, sans rien écraser : le super-administrateur à partir de `SUPERADMIN_TELEPHONE`, `SUPERADMIN_MOT_DE_PASSE` et `SUPERADMIN_NOM` ; les cinq catégories ; les villes de référence avec leur fuseau (Kinshasa UTC+1, Lubumbashi, Goma, Kisangani UTC+2…) ; les paramètres par défaut (commission 10 %, 4 billets par personne). Il est idempotent.

Connexion à l'administration : `/admin/connexion`, numéro et mot de passe, puis code reçu par SMS. En développement, avec `SMS_PROVIDER=simulation`, le code s'affiche dans la console du serveur et dans le journal « SMS envoyés ».

Données de démonstration (développement seulement) : `npm run db:seed-demo`. Tout est préfixé `[DEMO]`, et le script refuse de tourner en production ou sur une base qui n'est pas locale.

## Simulation du paiement (développement)

Avec `PAYMENT_PROVIDER=simulation`, la réponse de l'opérateur dépend de la fin du numéro de paiement : `…0000` refusé, `…9999` sans réponse (délai dépassé au bout de 2 minutes), tout autre numéro reçu après 4 secondes. La réponse arrive par un webhook signé, traité comme en production.

## Tests

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm test             # Vitest (base eticket_test recréée à chaque lancement)
npm run test:e2e     # Playwright sur next dev, port 3100 (development) et 3101 (staging), base eticket_e2e recréée
npm run test:pwa     # build de production puis test hors ligne réel (serveur arrêté)
```

Ce que couvrent les tests, entre autres : parité exacte du moteur Kuba avec la maquette, aucun contenu inventé dans le code, 20 demandes simultanées sur 3 places donnent exactement 3 succès, webhook reçu trois fois ne crée qu'un lot de billets, double scan orange et QR modifié rouge, scanner en mode avion, base vide propre, achat complet en simulation, création et publication d'un événement en moins de 5 minutes.

Captures face à la maquette : `ETAPE=XX CAPTURES='[{"nom":"accueil","app":"/","maquette":"index.html"}]' npx playwright test --project=captures`.

Playwright est figé en 1.56.1 pour correspondre au Chromium préinstallé de l'environnement de développement ; ailleurs, `npx playwright install chromium` suffit.

## Mise en ligne

Voir `docs/deploiement.md`, section 9 pour une version de test. Avant d'ouvrir la vente, lire `docs/reste-a-faire.md` : l'adaptateur de paiement réel et le fournisseur SMS manquent encore.
