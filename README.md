<div align="center">

<br>

<h1>NETPLUS</h1>

<p><strong>Premium Cinema Streaming  Free Forever</strong></p>

<p>
Une expérience cinématographique complète<br>
propulsée par Next.js 16 et l'intelligence artificielle.
</p>

<br>

</div>

## ▸ Le Projet

NetPlus est une plateforme de streaming moderne qui réunit films, séries TV et contenu court dans une interface élégante. Construite autour de Next.js 16, elle offre une expérience fluide, réactive et accessible sur tous les appareils.

Le projet s'appuie sur l'API TMDB pour son catalogue, intègre un lecteur vidéo intelligent avec fallback automatique sur six serveurs, et propose un assistant IA conversationnel  le **Maître Netplus**  pour guider les utilisateurs dans leurs découvertes.

L'architecture est pensée pour être modulaire et extensible : chaque couche (authentification, catalogue, lecture, IA) est isolée et peut évoluer indépendamment. Le design responsive s'adapte du mobile au desktop avec une attention particulière portée aux performances et à l'accessibilité.

## ▸ Fonctionnalités

### Catalogue & Lecture

- Catalogue complet de films et séries alimenté par TMDB  
- Lecteur vidéo intelligent avec fallback automatique sur 6 serveurs  
- Sous-titres multilingues avec traduction intégrée  
- Shorts au format vertical 9:16 avec scroll infini  

### Expérience Utilisateur

- Système de profils multiples : Jeunesse, Frénésie, Nocturne  
- Assistant IA « Maître Netplus » propulsé par z-ai-web-dev-sdk  
- Recherche intelligente avec suggestions contextuelles  
- Mode sombre et clair avec thème dynamique  
- Historique de visionnage personnalisé  

### Architecture Technique

- Authentification sécurisée via NextAuth.js  
- Système premium avec gestion fine des limitations  
- Base de données Prisma + SQLite légère et performante  
- API routes Next.js pour toute la logique serveur  
- Design responsive mobile-first avec shadcn/ui  

## ▸ Stack Technique

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

## ▸ Installation

```bash
git clone https://github.com/matserh/Netplus.git
cd Netplus
npm install
npx prisma generate
npx prisma db push
echo "DATABASE_URL=file:./db/custom.db" > .env
npm run dev
