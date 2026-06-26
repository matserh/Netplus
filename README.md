# NetPlus

Plateforme de streaming cinéma premium gratuite, alternative à Netflix, construite avec Next.js 16, TypeScript et Tailwind CSS 4.

## Aperçu

NetPlus est une application web complète de streaming qui permet aux utilisateurs de découvrir et de regarder des films et séries TV. L'interface est inspirée des meilleures plateformes de streaming modernes, avec une expérience utilisateur fluide et élégante.

## Fonctionnalités

- **Catalogue de films et séries** alimenté par l'API TMDB
- **Lecteur vidéo intelligent** avec fallback automatique sur 6 serveurs différents
- **Système de profils** (Jeunesse, Frénésie, Nocturne) pour une expérience personnalisée
- **Assistant IA "Maître Netplus"** propulsé par z-ai-web-dev-sdk
- **Système de sous-titres** multilingues
- **Recherche intelligente** avec suggestions
- **Shorts** et contenu court format vertical
- **Mode sombre/clair** avec thème dynamique
- **Système premium** avec gestion des limitations
- **Authentification** via NextAuth.js

## Stack Technique

- **Framework** : Next.js 16 (App Router)
- **Langage** : TypeScript 5
- **Style** : Tailwind CSS 4 + shadcn/ui
- **Base de données** : Prisma ORM avec SQLite
- **Authentification** : NextAuth.js v4
- **État** : Zustand + TanStack Query
- **Animations** : Framer Motion
- **API externe** : TMDB (The Movie Database)
- **IA** : z-ai-web-dev-sdk

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/matserh/Netplus.git
cd Netplus

# Installer les dépendances
npm install

# Générer le client Prisma
npx prisma generate

# Initialiser la base de données
npx prisma db push

# Créer un fichier .env
echo "DATABASE_URL=file:./db/custom.db" > .env

# Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Scripts disponibles

- `npm run dev` — Démarre le serveur de développement
- `npm run build` — Compile le projet pour la production
- `npm run start` — Démarre le serveur de production
- `npm run lint` — Vérifie la qualité du code
- `npx prisma generate` — Génère le client Prisma
- `npx prisma db push` — Synchronise le schéma avec la base de données

## Structure du Projet

```
Netplus/
├── prisma/              # Schéma de base de données
├── public/              # Assets statiques (logo, zip)
├── src/
│   ├── app/             # Pages Next.js (App Router)
│   │   ├── api/         # Routes API
│   │   ├── watch/       # Page de lecture
│   │   ├── download/    # Page de téléchargement
│   │   ├── page.tsx     # Page d'accueil
│   │   └── layout.tsx   # Layout racine
│   ├── components/      # Composants React
│   │   ├── ui/          # Composants shadcn/ui
│   │   ├── layout/      # Navbar, Footer, Sidebar
│   │   ├── media/       # Cards, Modal, Banner
│   │   └── ai/          # Chat IA
│   ├── contexts/        # Contextes React
│   ├── hooks/           # Hooks personnalisés
│   ├── lib/             # Utilitaires (db, tmdb, utils)
│   └── types/           # Types TypeScript
└── package.json
```

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
DATABASE_URL=file:./db/custom.db
```

### API TMDB

La clé API TMDB est configurée dans `src/types/media.ts`. Pour utiliser votre propre clé, créez un compte sur [TMDB](https://www.themoviedb.org/) et remplacez la valeur de `API_CONFIG.tmdb.apiKey`.

## Licence

Projet open source à but éducatif.

---

Propulsé par NetPlus
