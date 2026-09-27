# Sécurité

## En place

| Sujet | Mesure | Où |
|---|---|---|
| En-têtes | CSP stricte avec nonce par requête (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`), X-Frame-Options DENY, nosniff, Referrer-Policy, COOP, Permissions-Policy (caméra pour notre origine seulement), HSTS en production | `proxy.ts` |
| Styles | `style-src 'self' 'unsafe-inline'` : React écrit des attributs `style` (motif, jauges, couleurs d'opérateurs). Aucun script inline n'est autorisé sans nonce | `proxy.ts` |
| Contrôle d'accès | Jeton de rôles signé (HMAC) vérifié dans `proxy.ts`, puis vérification en base dans chaque page et action serveur (`exigerRole`). Rôles d'administration : mot de passe argon2id + code SMS | `lib/auth/` |
| Sessions | Jeton aléatoire de 256 bits en cookie httpOnly, `secure` en production, `sameSite=lax`, empreinte SHA-256 en base, 12 h pour l'administration, 30 jours pour les acheteurs, nouveau jeton à chaque connexion | `lib/auth/session.ts` |
| OTP | 6 chiffres, HMAC-SHA256 en base, 5 minutes, 5 essais (incrément atomique), renvoi après 45 s, 5 codes par heure et par numéro, 20 par heure et par IP ; masqués dans le journal des SMS hors simulation | `lib/auth/otp.ts` |
| CSRF | Actions serveur : Next.js compare `Origin` et hôte. Routes API internes en POST : `memeOrigine()`. Webhooks : signature | `lib/requete.ts` |
| Limites de débit | OTP, connexion d'administration, commande, paiement, paiement chez un agent, alertes, liste d'attente (table PostgreSQL, incrément atomique) | `lib/limites.ts` |
| Robots | Champ piège invisible sur les formulaires publics | `components/ui/ChampPiege.tsx` |
| Entrées | Zod sur les actions et routes ; téléphones normalisés `+243XXXXXXXXX` | partout |
| SQL | Prisma uniquement ; les quelques requêtes brutes sont des gabarits paramétrés (verrous, compteur de débit) | `lib/` |
| Données sensibles | Numéros de reversement chiffrés AES-256-GCM, affichage complet audité ; téléphones masqués dans l'administration et l'export organisateur | `lib/chiffrement.ts` |
| Paiement | Webhook : corps brut enregistré, signature en temps constant, montant vérifié, traitement idempotent ; billets jamais générés sur un retour navigateur | `lib/paiement/` |
| Billets | Code de 128 bits (`crypto.randomBytes`), le scanner ne reçoit que les empreintes SHA-256 | `lib/billets/`, `lib/scan.ts` |
| Fichiers | Images réencodées par sharp (métadonnées supprimées), 8 Mo maximum, types contrôlés ; chemins de stockage vérifiés contre la traversée | `lib/stockage/` |
| Audit | Toute action d'administration et toute transaction sont journalisées ; la base refuse UPDATE, DELETE et TRUNCATE sur le journal | `lib/audit.ts`, migration |
| Secrets | Variables d'environnement uniquement, validées au démarrage ; simulation de paiement et de SMS interdite en production | `lib/env.ts` |

## Choix assumés

- La désinscription des alertes SMS n'exige pas de code : quiconque connaît un numéro peut le désinscrire. Le risque est faible (perte d'alertes) et la désinscription doit rester simple ; elle est limitée en débit.
- Le sel d'affichage du signe du moment est public par conception (voir `docs/billet.md`).
- L'administration n'a pas de délai d'inactivité plus court que 12 heures. À réduire si les postes sont partagés.

## À faire avant l'ouverture

- Test d'intrusion externe sur l'environnement de préproduction.
- Rotation documentée des secrets (`SESSION_SECRET` invalide toutes les sessions ; `ENCRYPTION_KEY` demande de rechiffrer les numéros de reversement).
- Politique de sauvegarde et de restauration de la base Neon, testée.
