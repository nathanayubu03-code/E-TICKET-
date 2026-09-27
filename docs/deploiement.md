# Mise en ligne : Vercel et Neon

Ce guide met l'application en ligne sur Vercel (application) et Neon (PostgreSQL), dans la même région européenne : Vercel `fra1` (Francfort, déjà fixé dans `vercel.json`) et Neon `AWS eu-central-1` (Francfort). Rien n'est déployé automatiquement par ce dépôt.

Vérifiez les limites et les prix actuels sur les sites de Vercel, Neon et Cloudflare avant de choisir un plan : ils changent souvent.

## 1. Base de données Neon

1. Créez un projet Neon, région **AWS Europe Central 1 (Frankfurt)**, PostgreSQL 16 ou plus récent.
2. Créez une base `eticket` et un rôle dédié.
3. Dans « Connection details », relevez deux chaînes :
   - la chaîne **poolée** (hôte contenant `-pooler`) : elle ira dans `DATABASE_URL` ;
   - la chaîne **directe** (sans `-pooler`) : elle ira dans `DIRECT_URL`, utilisée pour les migrations.
   Gardez `?sslmode=require` à la fin des deux.
4. Activez les sauvegardes et notez la durée de rétention de l'historique (point-in-time restore) de votre plan.

## 2. Stockage des affiches : Cloudflare R2

1. Dans Cloudflare, R2, créez un bucket (par exemple `eticket-affiches`).
2. Rendez-le lisible publiquement : de préférence un domaine personnalisé (`affiches.votre-domaine.cd`), sinon l'URL `r2.dev` fournie par Cloudflare.
3. Créez un jeton d'API R2 avec les droits **Object Read & Write** limités à ce bucket. Relevez l'identifiant de clé et le secret.
4. Variables à prévoir :
   - `STORAGE_DRIVER=s3`
   - `S3_ENDPOINT=https://<ID_COMPTE>.r2.cloudflarestorage.com`
   - `S3_REGION=auto`
   - `S3_BUCKET=eticket-affiches`
   - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
   - `S3_PUBLIC_URL=https://affiches.votre-domaine.cd` (sans barre finale ; son origine est ajoutée automatiquement à la CSP pour les images)

Le disque de Vercel est éphémère : `STORAGE_DRIVER=local` y perdrait les affiches.

## 3. Projet Vercel

1. Importez le dépôt GitHub dans Vercel (framework détecté : Next.js). La commande de build vient de `vercel.json` : `npm run vercel-build`, qui génère le client Prisma, applique les migrations (`prisma migrate deploy` sur `DIRECT_URL`, ou `DATABASE_URL_UNPOOLED` posée par l'intégration Neon de Vercel), met à jour le référentiel (catégories, villes, paramètres ; super-administrateur si `SUPERADMIN_TELEPHONE` est défini) puis construit l'application.
2. Dans Settings, Environment Variables, saisissez pour **Production** les variables de `.env.example` :
   - `DATABASE_URL`, `DIRECT_URL` (Neon) ;
   - `APP_ENV=production` ;
   - `NEXT_PUBLIC_SITE_URL=https://votre-domaine.cd` : **obligatoire en production, et refusée si c'est une adresse `vercel.app`** (l'application ne démarre pas). Le premier déploiement demande donc que le domaine soit déjà choisi (section 6) ;
   - `SESSION_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` (valeurs générées, propres à la production) ;
   - `PAYMENT_PROVIDER`, `SMS_PROVIDER` : la valeur de vos fournisseurs réels une fois leurs adaptateurs écrits. **`simulation` est refusé en production : l'application ne démarre pas.** En attendant les fournisseurs, `non_configure` permet de démarrer sans paiement en ligne ni SMS (donc sans connexion par code) ;
   - stockage R2 (section 2) ;
   - contacts et mentions de l'éditeur (`CONTACT_*`, `EDITEUR_*`).
3. Pour **Preview**, utilisez une autre base Neon (une branche Neon convient) et d'autres secrets. Mettez `APP_ENV=staging` : sans cette variable, un déploiement Vercel est traité comme la production (règles strictes, simulation refusée). Pour une version de test complète, avec tâche planifiée, suivez plutôt la section 9.
4. Déployez. Vérifiez `https://<projet>.vercel.app/api/sante` (réponse `{"ok":true}`).

## 4. Seed de production et super-administrateur

Le seed de production crée seulement le super-administrateur, les catégories, les villes de référence et les paramètres par défaut. Lancez-le une fois, depuis un poste de confiance :

```bash
DATABASE_URL="<chaîne directe Neon>" \
SUPERADMIN_TELEPHONE="+243XXXXXXXXX" \
SUPERADMIN_MOT_DE_PASSE="<12 caractères minimum, lettres et chiffres>" \
SUPERADMIN_NOM="<nom>" \
npm run db:seed
```

Il est idempotent : le relancer ne recrée ni ne modifie le mot de passe d'un super-administrateur existant. Ne mettez pas `SUPERADMIN_MOT_DE_PASSE` dans les variables de Vercel de la production. Chaque déploiement relance ce seed en mode `--deploiement` : sans `SUPERADMIN_TELEPHONE`, il met seulement à jour le référentiel. Le seed de démonstration (`npm run db:seed-demo`) refuse de s'exécuter sur une base distante.

Connexion : `/admin/connexion`, mot de passe puis code SMS. Il faut donc un fournisseur SMS configuré.

## 5. Tâche planifiée : vérification des paiements

`/api/cron/verifier-paiements` vérifie les paiements restés sans webhook (première vérification à 90 secondes, puis toutes les 2 minutes pendant 15 minutes) et libère les réservations expirées. Elle est idempotente et exige l'en-tête `Authorization: Bearer <CRON_SECRET>`.

**Planificateur externe (configuration du dépôt)**. `vercel.json` ne déclare pas de tâche planifiée, parce que le plan gratuit de Vercel limite les tâches planifiées à une exécution par jour, ce qui ne tient pas la promesse « vos billets arrivent dans les 15 minutes » quand un webhook se perd. N'importe quel service capable d'appeler une URL toutes les 1 ou 2 minutes convient (cron-job.org, Upstash QStash, un serveur à vous). Programmez :

```bash
curl -fsS -X POST https://votre-domaine.cd/api/cron/verifier-paiements \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Vercel Cron (plan payant)**. Ajoutez à `vercel.json` le bloc suivant ; Vercel envoie tout seul l'en-tête `Authorization` quand la variable `CRON_SECRET` est définie :

```json
"crons": [{ "path": "/api/cron/verifier-paiements", "schedule": "*/2 * * * *" }]
```

La réponse indique le nombre de paiements vérifiés, confirmés, expirés et de réservations libérées. Évitez les planificateurs dont l'exécution peut prendre plusieurs minutes de retard.

## 6. Domaine

1. Dans Vercel, Settings, Domains : ajoutez `votre-domaine.cd` et `www.votre-domaine.cd`, puis créez chez votre registraire les enregistrements DNS indiqués par Vercel.
2. Mettez à jour `NEXT_PUBLIC_SITE_URL` (utilisée dans les liens SMS) et redéployez.
3. L'application envoie `Strict-Transport-Security` avec `preload`. Ne soumettez le domaine à la liste de préchargement HSTS des navigateurs qu'une fois sûr que tous les sous-domaines sont servis en HTTPS.

## 7. Paiement et SMS réels

1. Écrivez les adaptateurs à partir des réponses de l'agrégateur et du fournisseur SMS (liste des questions : `docs/paiement.md`).
2. Déclarez chez l'agrégateur l'URL de webhook : `https://votre-domaine.cd/api/webhooks/paiement/<nom-du-fournisseur>`.
3. Testez d'abord dans leur environnement de test, sur un déploiement de prévisualisation.
4. Saisissez dans l'administration (Paramètres) les numéros marchands pour le paiement chez un agent, la commission et le taux CDF/USD.

## 8. Vérifications après mise en ligne

- `/` sans événement affiche la page « Les prochains événements arrivent ici ».
- `/manifest.webmanifest` répond, le site s'installe sur un Android.
- Un événement de test créé puis publié apparaît en « À la une ».
- Un achat réel de petit montant va au bout (paiement, SMS, billet), puis un remboursement manuel est enregistré.
- Le scanner télécharge la liste, fonctionne en mode avion et resynchronise.
- `/api/cron/verifier-paiements` sans en-tête répond 401.

## 9. Déployer une version de test

Une version de test (`APP_ENV=staging`) sert à faire essayer le parcours complet (achat, billet, scanner, administration) sans agrégateur ni fournisseur SMS. Elle tourne avec un serveur de production (`NODE_ENV=production`, même build qu'en production) mais garde la simulation :

| | `development` | `staging` | `production` |
|---|---|---|---|
| Simulation du paiement et des SMS | autorisée | autorisée | refusée au démarrage |
| `NEXT_PUBLIC_SITE_URL` | facultative | facultative, `vercel.app` accepté | obligatoire, `vercel.app` refusé |
| Bandeau rouge « Version de test : aucun paiement réel, codes SMS affichés à l'écran » | non | en haut de chaque page | non |
| Code SMS affiché sous le champ de saisie (acheteur et administrateur) | non | oui | non |

Si `APP_ENV` est vide, un serveur de production (`next start`, Vercel) applique les règles de production. Une version de test doit donc toujours être déclarée explicitement.

**Attention.** En staging, n'importe qui peut se connecter avec n'importe quel numéro, puisque le code s'affiche à l'écran. Le mot de passe protège encore l'administration, mais ne réutilisez jamais un mot de passe, un numéro de l'équipe ou des données de la production. Ne communiquez l'adresse qu'aux testeurs, et activez si possible la protection d'accès de Vercel (Settings, Deployment Protection ; selon le plan, elle peut ne couvrir que les prévisualisations, à vérifier sur la page des prix de Vercel). Le webhook de simulation est remis à l'intérieur du serveur, sans appel HTTP, donc cette protection ne le bloque pas.

### Étapes

1. **Base** : créez une base Neon séparée, ou une branche Neon de la base de production créée avant tout vrai client (une branche copie les données). Relevez les chaînes poolée et directe comme en section 1.
2. **Projet Vercel séparé** : importez une deuxième fois le même dépôt, sous un autre nom (par exemple `eticket-test`), région `fra1`. Dans Settings, Git, choisissez comme branche de production la branche à faire tester. Un projet séparé plutôt qu'un déploiement Preview, parce que Vercel n'exécute les tâches planifiées que sur les déploiements de production d'un projet : sans cela, la vérification des paiements ne tourne pas.
3. **Variables** (environnement Production de ce projet de test) :
   - `APP_ENV=staging` ;
   - `PAYMENT_PROVIDER=simulation`, `SMS_PROVIDER=simulation` ;
   - `DATABASE_URL`, `DIRECT_URL` de la base de test (déjà posées si la base est créée depuis Vercel, onglet Storage, avec l'intégration Neon) ;
   - `SESSION_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `SIMULATION_WEBHOOK_SECRET` : nouvelles valeurs, jamais celles de la production (`openssl rand -hex 32`, `openssl rand -base64 32`, `openssl rand -hex 24`) ;
   - `NEXT_PUBLIC_SITE_URL` : `https://eticket-test.vercel.app` convient, ou un sous-domaine comme `https://test.votre-domaine.cd` ;
   - stockage : un bucket R2 à part (`eticket-affiches-test`) avec son propre jeton. `STORAGE_DRIVER=local` démarre aussi, avec un avertissement, mais les affiches disparaissent à chaque redéploiement ;
   - `CONTACT_*`, `EDITEUR_*` : vides, ou les vraies valeurs si les testeurs doivent relire ces pages.
4. **Déployez**, puis vérifiez `https://<projet-test>.vercel.app/api/sante` et que le bandeau rouge s'affiche sur l'accueil.
5. **Seed** : sans ordinateur, ajoutez aux variables du projet de test `SUPERADMIN_TELEPHONE`, `SUPERADMIN_MOT_DE_PASSE` (réservé aux essais) et `SUPERADMIN_NOM`, puis redéployez : le build crée le compte. Supprimez ensuite `SUPERADMIN_MOT_DE_PASSE` des variables. Avec un ordinateur, lancez le seed comme en section 4. Le seed de démonstration refuse les bases distantes : créez les événements de test dans l'administration.
6. **Tâche planifiée** : les mêmes règles qu'en section 5. Programmez un planificateur externe sur `https://<projet-test>.vercel.app/api/cron/verifier-paiements` avec le `CRON_SECRET` de test.

### Paiement simulé sur Vercel

Le paiement simulé répond selon la fin du numéro de paiement : `…0000` refusé, `…9999` sans réponse (l'écran affiche « délai dépassé » au bout de 2 minutes, le serveur libère les places après 15 minutes de vérifications), tout autre numéro reçu après 4 secondes. Sur Vercel, la réponse est remise grâce à `after()`, qui garde la fonction active pendant ces 4 secondes. Si elle se perd quand même, l'issue est inscrite dans la référence du paiement et la vérification planifiée la retrouve au passage suivant (90 secondes au plus tôt).

### Passer de la version de test à la production

Ne transformez pas le projet de test en production : créez le projet de production (sections 1 à 6) avec sa propre base et ses propres secrets. Si `APP_ENV=production` est posée avec `simulation` ou sans domaine définitif, l'application refuse de démarrer et le journal du déploiement donne la raison exacte.
