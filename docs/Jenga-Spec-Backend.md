# Jenga — Spécification Backend pour le Développeur

Ce document décrit comment implémenter, **côté serveur**, les fonctionnalités qui ne peuvent pas (ou ne doivent pas) vivre uniquement dans le frontend. Le frontend Jenga est déjà préparé pour s'y connecter.

Stack recommandée : **Node.js + Express** (ou NestJS), **PostgreSQL** (via Supabase ou Railway), **Redis** (pour les files de tâches). Hébergement : Railway, Render ou Fly.io.

---

## Règle d'or de sécurité

Tout ce qui touche à l'argent, aux permissions et aux données sensibles doit être **vérifié côté serveur**, jamais seulement dans le frontend. Le frontend peut cacher un bouton ; seul le backend peut réellement refuser une action. Un utilisateur malveillant peut contourner n'importe quel contrôle frontend.

---

## 1. Routage intelligent des IA (multi-fournisseurs)

Le frontend envoie déjà un champ `model` (préfixe `claude-` ou `gpt-`) et, pour les images, `provider:"openai"`. Le backend route vers le bon fournisseur.

```
POST /api/generate
  body: { prompt, systemPrompt, maxTokens, model }
  → si model commence par "claude-" → API Anthropic
  → si model commence par "gpt-"    → API OpenAI
  → réponse normalisée : { content: [...] }  (même format que l'app attend)

POST /api/studio/generate   (images)
  body: { type, brief, quality, plan, provider }
  → provider "openai" → DALL·E 3 / GPT Image
  → retourne { url } ou { base64, qualityLabel }
```

Logique de routage conseillée (transparente pour l'utilisateur — il ne voit que « Jenga Intelligence ») :
- **Documents, conseil, rédaction** → Claude (Sonnet ou Opus selon le plan)
- **Images** → OpenAI (DALL·E)
- **Tâches simples / rapides** → Claude Haiku (moins cher)

Les clés API (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) restent **uniquement sur le serveur**, jamais exposées au frontend.

---

## 2. Mémoire business permanente

Le frontend stocke aujourd'hui la mémoire en local (navigateur). Pour qu'elle persiste entre appareils et dans le temps, la stocker en base.

```
Table business_memory
  user_id (FK)
  activite, ville, cible, objectif, budget   (texte)
  faits        (JSON : liste de faits appris)
  projets      (JSON : liste {title, prompt, date})
  updated_at

GET  /api/memory          → renvoie la mémoire de l'utilisateur
PUT  /api/memory          → met à jour
POST /api/memory/fact     → ajoute un fait
```

Bonus « intelligent » : après chaque conversation importante, faire analyser par Claude ce qu'il faut retenir (nom d'entreprise, employés, fournisseurs) et l'enregistrer automatiquement dans `faits`.

---

## 3. Tâches asynchrones (continuer app fermée)

Le frontend a déjà un système de jobs local. Pour de vraies tâches longues (rapport nocturne, business plan) qui tournent même téléphone éteint, il faut une **file de tâches serveur**.

```
Table jobs
  id, user_id, type, status (queued/running/done/failed)
  input (JSON), result (JSON), progress, created_at, finished_at

POST /api/jobs            → crée une tâche, la met en file (Redis/BullMQ)
GET  /api/jobs            → liste les tâches de l'utilisateur
GET  /api/jobs/:id        → statut + résultat
```

Un **worker** séparé (process Node distinct) consomme la file, appelle l'IA, écrit le résultat, et déclenche une **notification** (voir push ci-dessous). Outils : BullMQ + Redis. Pour les notifications hors-app : OneSignal ou Firebase Cloud Messaging (web push).

---

## 4. Centre documentaire (PDF, Word, Excel, PPT)

Permettre d'importer des documents et de poser des questions dessus (RAG — Retrieval Augmented Generation).

```
1. Upload : POST /api/docs  (fichier) → stocker dans S3/Supabase Storage
2. Extraction du texte :
   - PDF  → pdf-parse
   - Word → mammoth
   - Excel→ xlsx (SheetJS)
   - PPT  → officeparser
3. Découper le texte en morceaux (chunks ~500 mots)
4. Créer des embeddings (OpenAI text-embedding-3 ou Voyage)
   et les stocker dans pgvector (extension PostgreSQL)
5. Question : POST /api/docs/ask
   → embedding de la question → recherche des chunks proches
   → envoyer chunks + question à Claude → réponse sourcée
```

Table `documents` (id, user_id, nom, type, storage_url) + table `doc_chunks` (doc_id, contenu, embedding vector). C'est ce qui transforme Jenga en « cerveau documentaire » de l'entreprise.

---

## 5. Sécurité entreprise

### Authentification & 2FA
- Auth par JWT (jsonwebtoken). Le token expire, est renouvelé via refresh token.
- **2FA** : à l'activation, générer un secret TOTP (lib `otplib`), afficher un QR code (Google Authenticator). À la connexion, exiger le code à 6 chiffres. Stocker le secret chiffré.
- Le frontend a déjà le toggle 2FA ; il appellera `POST /api/2fa/enable` et `POST /api/2fa/verify`.

### Rôles & permissions
Le frontend filtre déjà la navigation selon `user.role` (owner, director, accountant, hr, sales). **Mais le serveur doit revérifier chaque requête** :

```
Middleware requireAccess(section):
  vérifie que le rôle de l'utilisateur (depuis le JWT, pas depuis le frontend)
  a le droit d'accéder à cette section / action.
  Sinon → 403 Forbidden.
```

Ne jamais faire confiance au `role` envoyé par le frontend : toujours le lire depuis la base via le user_id du token.

### Protection des données
- **Chiffrement en transit** : HTTPS obligatoire (TLS).
- **Chiffrement au repos** : activer le chiffrement de la base (Supabase/Railway le proposent).
- **Séparation des données** : chaque requête filtre par `user_id` (ou `org_id` pour les équipes). Un utilisateur ne doit JAMAIS pouvoir lire les données d'un autre. Vérifier systématiquement la propriété de chaque ressource.
- **Journalisation** : table `audit_log` (user_id, action, ressource, date, ip) pour tracer les actions sensibles.
- **Sauvegardes automatiques** : activer les backups quotidiens de la base.
- **Limites de débit** (rate limiting) : protéger les routes contre les abus (express-rate-limit).
- **Validation des entrées** : valider/assainir tout ce qui arrive du frontend (zod, joi).

### « Pour que personne ne la pirate »
Les bases concrètes : HTTPS partout, secrets dans des variables d'environnement (jamais dans le code), dépendances tenues à jour, mots de passe hachés (bcrypt/argon2), protection CSRF/CORS configurée, et **revérification serveur de chaque permission**. Avant un déploiement sérieux (surtout pour PME/ONG/administrations), faire faire un audit de sécurité par un professionnel.

---

## Export de fichiers réels (Word, Excel, PowerPoint)

L'Executive Studio génère le contenu ; pour le sortir en fichiers natifs :

```
POST /api/export/docx   → lib "docx"        → renvoie un .docx
POST /api/export/xlsx   → lib "exceljs"     → renvoie un .xlsx
POST /api/export/pptx   → lib "pptxgenjs"   → renvoie un .pptx
POST /api/export/pdf    → lib "puppeteer"   → renvoie un .pdf
```

Le frontend enverra le contenu généré ; le serveur le met en forme et renvoie le fichier à télécharger.

---

## Ordre de priorité conseillé

1. **Auth + JWT + permissions serveur** (la fondation de tout).
2. **Routage IA + clés API sécurisées** (fait marcher Claude + GPT pour de vrai).
3. **Mémoire business en base** (persistance réelle).
4. **Export de fichiers** (Word/Excel/PPT — forte valeur immédiate).
5. **Centre documentaire** (RAG — gros morceau, à faire quand le reste est solide).
6. **Tâches asynchrones + notifications** (confort, une fois le cœur stable).
7. **2FA + journalisation + audit** (avant tout déploiement grand public).

---

## Variables d'environnement à prévoir

```
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
DATABASE_URL=...
REDIS_URL=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
STORAGE_BUCKET=...        (Supabase / S3)
ONESIGNAL_APP_ID=...      (notifications, optionnel)
```

Toutes ces clés restent sur le serveur. Aucune ne doit jamais apparaître dans le code frontend ni dans le dépôt Git (utiliser un fichier `.env` ignoré par Git).
