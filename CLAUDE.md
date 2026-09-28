# CLAUDE.md · règles permanentes d'e-Ticket RDC

À lire avant toute modification. `PLAN.md` donne l'état d'avancement, les décisions et la suite.

## Source de vérité visuelle

- La maquette validée est `design/maquette/` (HTML statique : index, evenement, achat, mes-billets, assets). Le canvas `design/project/*.dc.html` couvre les écrans absents de la maquette HTML (scanner, tableau de bord, états).
- Les variables et classes de `design/maquette/assets/styles.css` sont reprises dans `app/styles/tokens.css` et `app/styles/maquette.css`. Ne change aucune couleur, rayon, ombre ou espacement. Les nouveaux écrans vont dans `app/styles/complements.css`, avec les mêmes variables.
- Typographie (décision du 28/09/2026) : toutes les tailles de texte passent par les jetons de `app/styles/typo.css` (`--t-texte` 16 px minimum, `--t-titre-*`, `--t-bouton`, `--h-bouton` 48 px...). Aucune taille en dur dans un composant ni dans une feuille de style : `style={{ fontSize: 'var(--t-petit)' }}` et non `fontSize: 14`. Champs de saisie à 16 px minimum.
- Police des titres : choisie par la seule ligne d'export de `app/polices/titre.ts` (option 1 Bricolage Grotesque, 2 Unbounded, 3 Anybody adoucie). Comparaison sur `/test-typo` (development et staging uniquement).
- `tokens/theme.css` n'est pas la référence et ne doit pas être modifié (écarts listés dans `docs/design.md`).
- Panneaux pleins à bordure de 2 px et ombre décalée posés sur le motif Kuba ; jamais de texte directement sur le motif. Boutons de 52 px minimum, zones tactiles de 48 px minimum. Pas de motif derrière les tableaux de l'administration.
- Polices : titres selon `app/polices/titre.ts`, texte en Atkinson Hyperlegible, via `next/font/google`.
- Animations en CSS uniquement, pas de Framer Motion.

## Aucun contenu inventé

- Tout ce qui s'affiche au public vient de la base de données. Aucun événement, lieu, organisateur, prix, image, témoignage, chiffre ou logo codé en dur.
- Pas de texte de remplissage, pas d'emoji, pas de tiret cadratin ni demi-cadratin dans les textes d'interface.
- Pas d'image générée ni de photo de stock : sans affiche, la couverture est un motif Kuba calculé à partir de l'identifiant de l'événement.
- Villes et catégories des filtres : seulement celles qui ont un événement publié.
- Aucune adresse, aucun numéro, même en exemple. Les contacts viennent de `CONTACT_ORGANISATEURS_EMAIL` et `CONTACT_ORGANISATEURS_TELEPHONE` ; vide, le bloc ne s'affiche pas.
- `tests/unit/contenu-invente.test.ts` échoue si un nom de démonstration ou un tiret long apparaît dans `app/`, `components/`, `lib/` ou `messages/`.
- Le seed de démonstration (`prisma/seed-demo.ts`) préfixe tout par `[DEMO]` et refuse de tourner en production.

## Argent

- Tous les montants sont des entiers en CDF (`Int`). L'USD est un affichage indicatif calculé avec le dernier taux saisi par un administrateur (« taux indicatif du JJ/MM »). Jamais de taux codé en dur.
- Commission en points de base (1000 = 10 %), figée sur la commande à sa création.

## Paiement, SMS, stockage

- Fournisseurs derrière une interface (`lib/paiement`, `lib/sms`, `lib/stockage`), choisis par variable d'environnement.
- `APP_ENV` : `development`, `staging` ou `production` (vide sur un serveur de production : production). La simulation est autorisée en development et en staging, interdite en production : `lib/env.ts` (`verifierDemarrage`) refuse de démarrer, et exige aussi en production un `NEXT_PUBLIC_SITE_URL` hors `vercel.app`. Ne contourne jamais ces règles.
- En staging seulement : bandeau rouge fixe dans `app/layout.tsx`, code OTP renvoyé par `envoyerOtp` (`codeTest`) et affiché sous le champ. Jamais en production.
- Les billets ne sont générés que sur confirmation vérifiée côté serveur (webhook signé ou `verifierStatut`), jamais sur un retour navigateur.
- Réservation atomique : décrément conditionnel de `TicketType.restant` par `updateMany`, jamais lecture puis écriture.

## Billets et scanner

- QR : identifiant court de l'événement + code aléatoire de 128 bits en base32. Pas de signature dans le QR.
- Le scanner télécharge la liste des empreintes SHA-256 des codes valides avant de démarrer et se resynchronise toutes les 60 s. Hors ligne, un code absent de la liste donne l'état orange « Inconnu, à vérifier ».
- `Event.selAffichage` est public : il sert au signe du moment, pas à la sécurité.
- `lib/kuba` doit reproduire exactement `design/maquette/assets/kuba.js` (tests de parité). En cas d'écart, c'est le TypeScript qui a tort.

## Sécurité

- Rôles vérifiés côté serveur : dans `proxy.ts` et dans chaque action serveur (`exigerRole`). Jamais seulement côté client.
- Zod sur toute entrée. Prisma uniquement, pas de SQL brut non paramétré. Secrets en variables d'environnement.
- Journal d'audit (`lib/audit.ts`) sur toute action d'administration et toute transaction ; la table refuse UPDATE et DELETE.

## Langues, heures

- Français complet dans `messages/fr.json`. `ln.json` et `sw.json` ne contiennent que des clés relues ; le reste retombe sur le français. Aucune traduction automatique.
- Dates stockées en UTC, affichées dans le fuseau de la ville (Kinshasa UTC+1, Lubumbashi, Goma, Kisangani UTC+2).

## Commandes

- `npm run lint`, `npm run typecheck`, `npm test` (Vitest, base `eticket_test`), `npm run test:e2e` (Playwright sur `next dev`, port 3100).
- Captures : `ETAPE=XX CAPTURES='[...]' npx playwright test --project=captures` écrit dans `docs/captures/etape-XX/`.
- Chromium est préinstallé : ne lance pas `playwright install`. `@playwright/test` est figé en 1.56.1 pour correspondre au navigateur.
- Build : `npm run build` (webpack, requis par Serwist).
- Chaque étape : lint, typecheck, tests verts, puis commit en français préfixé du numéro d'étape, puis push. Ne jamais pousser un build cassé. Ne rien fusionner dans `main`.
