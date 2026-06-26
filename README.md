<div align="center">NETPLUS

Premium Cinema Streaming • Free Forever

</div><p align="center">
  <strong>Une plateforme de streaming nouvelle génération conçue pour offrir une expérience immersive sur tous les écrans.</strong>
</p>Aperçu

NetPlus est une plateforme de streaming moderne dédiée aux films, séries TV et formats courts. Développée avec Next.js 16, elle privilégie la rapidité, la fluidité et une interface élégante pensée aussi bien pour mobile que pour ordinateur.

Le projet exploite l'API TMDB pour son catalogue multimédia, intègre un lecteur vidéo multi-serveurs capable de basculer automatiquement lorsqu'une source devient indisponible, ainsi qu'un assistant intelligent, Maître NetPlus, qui accompagne les utilisateurs dans leurs recherches et leurs découvertes.

Fonctionnalités

Catalogue & Lecture

- Catalogue de films et séries alimenté par TMDB
- Lecteur vidéo multi-serveurs avec bascule automatique
- Sous-titres multilingues
- Shorts au format vertical 9:16

Expérience utilisateur

- Profils personnalisés (Jeunesse, Frénésie, Nocturne)
- Assistant intelligent Maître NetPlus
- Recherche intelligente avec suggestions
- Thème clair et sombre dynamique
- Historique de visionnage personnalisé

Infrastructure

- Authentification sécurisée avec NextAuth.js
- Gestion des comptes Premium
- Prisma ORM + SQLite
- API Routes Next.js
- Interface responsive optimisée Mobile First

Stack technique

Catégorie| Technologie
Framework| Next.js 16 (App Router)
Langage| TypeScript 5
Interface| Tailwind CSS 4 + shadcn/ui
Base de données| Prisma ORM + SQLite
Authentification| NextAuth.js
Gestion d'état| Zustand + TanStack Query
Animations| Framer Motion
API| TMDB
Intelligence artificielle| z-ai-web-dev-sdk

Installation

git clone https://github.com/matserh/Netplus.git

cd Netplus

npm install

npx prisma generate

npx prisma db push

echo "DATABASE_URL=file:./db/custom.db" > .env

npm run dev

Application disponible sur :

http://localhost:3000

Scripts

Commande| Description
"npm run dev"| Lance le serveur de développement
"npm run build"| Compile le projet
"npm run start"| Lance la version de production
"npm run lint"| Analyse la qualité du code
"npx prisma generate"| Génère le client Prisma
"npx prisma db push"| Met à jour la base de données

Structure

Netplus/
├── prisma/
├── public/
├── src/
│   ├── app/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── package.json
└── README.md

Configuration

Variables d'environnement

DATABASE_URL=file:./db/custom.db

API TMDB

Remplacez simplement la clé présente dans :

src/types/media.ts

par votre propre clé API TMDB.

Licence

Projet open source distribué à des fins éducatives.

<p align="center">
  <sub>NETPLUS • Streaming moderne, rapide et pensé pour une expérience cinéma sans compromis.</sub>
</p>
