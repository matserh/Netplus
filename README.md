<div align="center">

# NETPLUS

### Premium Cinema Streaming — Free Forever

</div>

<p align="center">
  <strong>Une expérience cinématographique complète, propulsée par Next.js 16 et l'intelligence artificiale.</strong>
</p>

---

## Aperçu

NetPlus est une plateforme de streaming moderne qui réunit films, séries TV et contenu court dans une interface élégante inspirée des meilleurs services du marché. Construite autour de Next.js 16, elle offre une expérience fluide, réactive et accessible sur tous les appareils.

Le projet s'appuie sur l'API TMDB pour son catalogue, intègre un lecteur vidéo intelligent avec fallback automatique sur six serveurs, et propose un assistant IA conversationnel — le Maître Netplus — pour guider les utilisateurs dans leurs découvertes.

## Fonctionnalités principales

**Catalogue & Lecture**
- Catalogue complet de films et séries alimenté par TMDB
- Lecteur vidéo intelligent avec fallback automatique sur 6 serveurs
- Sous-titres multilingues avec traduction
- Shorts au format vertical 9:16

**Expérience utilisateur**
- Système de profils multiples (Jeunesse, Frénésie, Nocturne)
- Assistant IA « Maître Netplus » propulsé par z-ai-web-dev-sdk
- Recherche intelligente avec suggestions contextuelles
- Mode sombre et clair avec thème dynamique
- Historique de visionnage personnalisé

**Architecture**
- Authentification sécurisée via NextAuth.js
- Système premium avec gestion des limitations
- Base de données Prisma + SQLite
- API routes Next.js pour la logique serveur
- Design responsive mobile-first

## Stack technique

| Catégorie | Technologie |
|-----------|-------------|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript 5 |
| Style | Tailwind CSS 4 + shadcn/ui |
| Base de données | Prisma ORM + SQLite |
| Authentification | NextAuth.js v4 |
| État client | Zustand + TanStack Query |
| Animations | Framer Motion |
| API externe | TMDB (The Movie Database) |
| Intelligence artificielle | z-ai-web-dev-sdk |

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

# Configurer les variables d'environnement
echo "DATABASE_URL=file:./db/custom.db" > .env

# Démarrer le serveur de développement
npm run dev
```

Le site est ensuite accessible sur `http://localhost:3000`.

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Compile le projet pour la production |
| `npm run start` | Démarre le serveur de production |
| `npm run lint` | Vérifie la qualité du code |
| `npx prisma generate` | Génère le client Prisma |
| `npx prisma db push` | Synchronise le schéma avec la base de données |

## Structure du projet

```
Netplus/
├── prisma/                  Schéma de base de données
├── public/                  Assets statiques (logo, images)
├── src/
│   ├── app/                 Pages Next.js (App Router)
│   │   ├── api/             Routes API
│   │   ├── watch/           Page de lecture vidéo
│   │   ├── download/        Téléchargement du code source
│   │   ├── shorts/          Contenu court vertical
│   │   ├── profiles/        Gestion des profils
│   │   ├── search/          Recherche
│   │   ├── login/           Authentification
│   │   ├── page.tsx         Page d'accueil
│   │   └── layout.tsx       Layout racine
│   ├── components/
│   │   ├── ui/              Composants shadcn/ui
│   │   ├── layout/          Navigation, footer, sidebar
│   │   ├── media/           Cards, modales, bannières
│   │   └── ai/              Chat IA
│   ├── contexts/            Contextes React
│   ├── hooks/               Hooks personnalisés
│   ├── lib/                 Utilitaires (db, tmdb, auth)
│   └── types/               Types TypeScript
├── package.json
└── README.md
```

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
DATABASE_URL=file:./db/custom.db
```

### API TMDB

La clé API TMDB est configurée dans `src/types/media.ts`. Pour utiliser votre propre clé :

1. Créez un compte sur [themoviedb.org](https://www.themoviedb.org/)
2. Générez une clé API dans les paramètres de votre compte
3. Remplacez la valeur de `API_CONFIG.tmdb.apiKey` dans `src/types/media.ts`

## Licence

Projet open source distribué à but éducatif.

---

<p align="center">
  <sub>Propulsé par NetPlus — Conçu avec soin pour les passionnés de cinéma.</sub>
</p>
