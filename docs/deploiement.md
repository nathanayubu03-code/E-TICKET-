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

1. Importez le dépôt GitHub dans Vercel (framework détecté : Next.js). La commande de build vient de `vercel.json` : `npm run vercel-build`, qui génère le client Prisma, applique les migrations (`prisma migrate deploy` sur `DIRECT_URL`) puis construit l'application.
2. Dans Settings, Environment Variables, saisissez pour **Production** les variables de `.env.example` :
   - `DATABASE_URL`, `DIRECT_URL` (Neon) ;
   - `APP_ENV=production` ;
   - `NEXT_PUBLIC_SITE_URL=https://votre-domaine.cd` ;
   - `SESSION_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` (valeurs générées, propres à la production) ;
   - `PAYMENT_PROVIDER`, `SMS_PROVIDER` : la valeur de vos fournisseurs réels une fois leurs adaptateurs écrits. **`simulation` est refusé en production : l'application ne démarre pas.** En attendant les fournisseurs, `non_configure` permet de démarrer sans paiement en ligne ni SMS (donc sans connexion par code) ;
   - stockage R2 (section 2) ;
   - contacts et mentions de l'éditeur (`CONTACT_*`, `EDITEUR_*`).
3. Pour **Preview**, utilisez une autre base Neon (une branche Neon convient) et d'autres secrets. Les déploiements de prévisualisation tournent aussi en mode production : la simulation y est refusée ; mettez `non_configure` ou les identifiants de test de vos fournisseurs.
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

Il est idempotent : le relancer ne recrée ni ne modifie le mot de passe d'un super-administrateur existant. Ne mettez pas `SUPERADMIN_MOT_DE_PASSE` dans les variables de Vercel. Le seed de démonstration (`npm run db:seed-demo`) refuse de s'exécuter sur une base distante.

Connexion : `/admin/connexion`, mot de passe puis code SMS. Il faut donc un fournisseur SMS configuré.

## 5. Tâche planifiée : vérification des paiements

`/api/cron/verifier-paiements` vérifie les paiements restés sans webhook (première vérification à 90 secondes, puis toutes les 2 minutes pendant 15 minutes) et libère les réservations expirées. Elle est idempotente et exige l'en-tête `Authorization: Bearer <CRON_SECRET>`.

**Vercel Cron** : `vercel.json` déclare un appel toutes les 2 minutes (`*/2 * * * *`). Vercel envoie tout seul l'en-tête `Authorization` quand la variable `CRON_SECRET` est définie. **Une fréquence de 2 minutes demande un plan payant de Vercel** : le plan gratuit limite les tâches planifiées à une exécution par jour (à vérifier sur la page des limites de Vercel au moment du choix). Avec une seule exécution par jour, la promesse « vos billets arrivent dans les 15 minutes » n'est pas tenue quand un webhook se perd.

**Alternative : planificateur externe**. N'importe quel service capable d'appeler une URL toutes les 1 ou 2 minutes convient (cron-job.org, Upstash QStash, un serveur à vous). Supprimez alors le bloc `crons` de `vercel.json` et programmez :

```bash
curl -fsS -X POST https://votre-domaine.cd/api/cron/verifier-paiements \
  -H "Authorization: Bearer $CRON_SECRET"
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
