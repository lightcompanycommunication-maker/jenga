# Jenga — Dossier développeur

Bienvenue. Ce dossier contient tout ce qu'il faut pour comprendre et finaliser **Jenga**, la plateforme africaine d'IA éditée par **Light Company LLC** (Cotonou, Bénin).

Ce document explique ce qui est fait, ce qu'il reste à faire, et dans quel ordre.

---

## Contenu du dossier

```
frontend/
  jenga-app.jsx       → L'application cliente complète (React). ~3900 lignes.
  jenga-admin.jsx     → Le tableau de bord administrateur (React).
docs/
  Jenga-Spec-Backend.md → La spécification backend détaillée. À LIRE EN PREMIER.
  Jenga-Guide-Photos.md → Guide pour les visuels marketing.
assets/
  Jenga-Logo-Or.png    → Logo officiel (or)
  Jenga-Logo-Noir.png  → Logo officiel (noir)
```

---

## Comment lire ce projet

`jenga-app.jsx` est un **fichier React autonome** (un seul fichier). Pour le faire tourner en local :

1. Crée un projet React (Vite recommandé) : `npm create vite@latest jenga -- --template react`
2. Remplace `src/App.jsx` par `jenga-app.jsx` (renomme l'export si besoin).
3. Installe les polices (Inter, Sora, JetBrains Mono) via Google Fonts.
4. `npm run dev`

Le fichier est écrit **sans dépendances externes** (pas de librairie UI) : tout le design est en styles inline avec un système de tokens (constante `T` en haut du fichier). Les icônes sont des SVG internes.

---

## Ce qui est DÉJÀ fait (frontend)

- **Build Studio** : génération d'apps/sites par IA, avec mode Rapide/Expert (analyse de projet : scores, risques, opportunités, version améliorée), streaming en temps réel, vitrine de modèles.
- **Executive Studio** : création de documents, visuels, tableaux Excel et courriers. Grande zone de saisie + mode Réfléchi (conseil avant création) + ateliers spécialisés (Design, Documents, Excel, Assistante).
- **6 Directeurs IA** (comité de direction) + Aaron (copilote quotidien).
- **Mémoire business** (activité, objectifs, projets) — stockée en local, à migrer en base.
- **Jobs persistants** (génération qui continue, reprise) — local, à migrer côté serveur.
- **Système de crédits**, plans, paiements (UI Mobile Money + carte).
- **Rôles & permissions** (UI), **2FA** (UI), service client, voix 10 langues.
- **Routage multi-IA** : le code envoie un champ `model` (préfixe `claude-` ou `gpt-`) ; pour les images, `provider:"openai"`.

## Ce qu'il RESTE à faire (backend) — l'essentiel

Le frontend est prêt, mais il a besoin d'un **backend réel** pour devenir une vraie plateforme. Tout est détaillé dans `docs/Jenga-Spec-Backend.md`. Résumé de l'ordre de priorité :

1. **Auth + JWT + permissions vérifiées côté serveur** (la fondation).
2. **Routage IA + clés API sécurisées** (Claude + OpenAI côté serveur, jamais dans le frontend).
3. **Mémoire business en base de données** (persistance réelle, multi-appareils).
4. **Export de fichiers réels** : Word (`docx`), Excel (`exceljs`), PowerPoint (`pptxgenjs`), PDF (`puppeteer`). Le frontend génère le contenu ; le serveur le transforme en fichier téléchargeable.
5. **Centre documentaire (RAG)** : importer PDF/Word/Excel et poser des questions dessus.
6. **Tâches asynchrones + notifications** (file Redis/BullMQ + worker).
7. **2FA réel (TOTP), journalisation, sauvegardes, audit** avant tout déploiement public.

---

## Le point de connexion frontend ↔ backend

Cherche dans `jenga-app.jsx` l'objet **`backend`** (fonction `backend.enabled()` et `backend.post()`). C'est là que le frontend appelle le serveur. Aujourd'hui, si aucun backend n'est branché, l'app retombe en mode démo (appel direct à l'API). En production, tous les appels passent par `/api/...` (voir la spec).

Routes principales attendues côté serveur :
- `POST /api/generate` — génération de texte/code (route vers Claude ou GPT selon `model`)
- `POST /api/studio/generate` — génération d'images (route vers OpenAI quand `provider:"openai"`)
- `GET/PUT /api/memory` — mémoire business
- `POST /api/jobs`, `GET /api/jobs/:id` — tâches asynchrones
- `POST /api/export/{docx,xlsx,pptx,pdf}` — export de fichiers
- routes auth, 2FA, documents (RAG) — voir la spec

---

## Règle d'or de sécurité

**Tout contrôle sensible (argent, permissions, données) doit être revérifié côté serveur.** Le frontend peut cacher un bouton ; seul le backend peut réellement refuser une action. Ne jamais faire confiance au `role` ou aux crédits envoyés par le client : toujours les relire en base.

---

## Identité de marque (à respecter)

- Logo officiel : hexagone formant « J » + mot « ENGA ». **Ne jamais le redessiner.**
- Couleurs officielles : Bleu `#1C3293`, Or `#CAA546`, Noir `#18191A`.
- L'utilisateur ne doit **jamais** voir quel modèle d'IA est utilisé (Claude, GPT…). Partout : « Jenga Intelligence ».

---

## Éditeur

**Light Company LLC** — Cotonou, Bénin
IFU 3202599115010 · RCCM RB/COT/25 B 40761
contact@lightco.group · WhatsApp +229 61 31 28 45 · lightco.group
