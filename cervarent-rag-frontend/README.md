# CERVARENT — Frontend (React + TypeScript + Vite)

Frontend de la plateforme **CERVARENT**, centre de recherche scientifique.
Cette application présente la bibliothèque de publications du centre et
intègre un module de **recherche augmentée par IA (RAG)** branché sur le
backend Spring Boot fourni (`RAG-ARGENTIQUE`).

## ✨ Fonctionnalités

- Page d'accueil présentant le centre de recherche
- **Recherche augmentée par IA** : posez une question en langage naturel,
  le backend interroge la base vectorielle (PostgreSQL + pgvector) et
  Mistral AI génère une réponse sourcée
- Bibliothèque des publications indexées (regroupées par document)
- Upload de documents (PDF, TXT, DOCX) avec choix du mode de traitement
  (synchrone "réfléchi" ou asynchrone "instantané")
- Page de contact
- Design responsive, accessible (focus visible, `prefers-reduced-motion`)

## 🎨 Identité visuelle

La palette et la typographie reprennent la maquette fournie :

| Usage                          | Couleur                    |
|---------------------------------|---------------------------|
| Accent principal (boutons, liens actifs) | `#16A34A` / `#22C55E` |
| Fond du panneau "Recherche IA"  | dégradé `#0E1F22 → #15323A` |
| Fond général                     | `#F6F8F7`                |
| Texte principal                  | `#0F1B1E`                |
| Texte secondaire                 | `#6B7B7A`                |

- Police des titres : **Sora**
- Police du corps de texte : **Inter**

Toutes les valeurs sont centralisées dans `src/styles/global.css`
(variables CSS `:root`), pour faciliter une éventuelle charte graphique
personnalisée du client.

## 🔌 Connexion au backend

Le backend Spring Boot (`RAG-ARGENTIQUE`) doit tourner sur le port **8087**.

Endpoints utilisés (voir `src/services/ragApi.ts`) :

| Méthode | Endpoint                          | Usage                                  |
|---------|-----------------------------------|-----------------------------------------|
| POST    | `/api/rag/ask`                    | Poser une question au moteur RAG        |
| POST    | `/api/rag/index`                  | Indexer un document texte               |
| GET     | `/api/rag/documents`              | Lister les chunks indexés (bibliothèque) |
| POST    | `/api/rag/upload`                 | Uploader un fichier (PDF/TXT/DOCX)       |
| GET     | `/api/rag/files/{fileId}/status`  | Statut d'un upload asynchrone           |
| GET     | `/api/rag/health`                 | Vérifier que le service est en ligne    |

En développement, **Vite redirige automatiquement** toutes les requêtes
`/api/*` vers `http://localhost:8087` (voir `vite.config.ts`), donc aucune
configuration CORS supplémentaire n'est nécessaire.

Pour pointer vers un backend déployé en production, copier `.env.example`
vers `.env` et renseigner `VITE_API_BASE_URL` :

```bash
cp .env.example .env
# puis éditer .env : VITE_API_BASE_URL=https://api.cervarent.org/api
```

## 🚀 Démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer le serveur de développement (http://localhost:5173)
npm run dev

# 3. Build de production
npm run build

# 4. Prévisualiser le build de production
npm run preview
```

> ⚠️ Pensez à démarrer le backend Spring Boot (`mvn spring-boot:run` dans le
> dossier `RAG-ARGENTIQUE`) avant de tester la recherche RAG et l'upload —
> sinon le frontend affichera un message d'erreur de connexion.

## 📁 Structure du projet

```
src/
├── components/        # Composants réutilisables (Navbar, Sidebar, Layout,
│                       # RagSearchPanel, UploadPanel, PublicationCard, StatsRow)
├── pages/              # Pages de l'application (Home, Publications, Contact...)
├── services/           # Client API (ragApi.ts) — appels HTTP vers le backend
├── types/              # Types TypeScript correspondant aux DTOs Java
├── styles/             # Styles globaux et variables de design (tokens)
├── App.tsx             # Définition des routes
└── main.tsx            # Point d'entrée de l'application
```

## ⚠️ Sécurité — important avant la mise en production

Le fichier `application.properties` du backend contient actuellement un
**mot de passe de base de données et une clé API Mistral en clair**.
Avant toute présentation publique ou mise en ligne :

1. Régénérer ces identifiants (mot de passe Supabase, clé API Mistral)
2. Les déplacer dans des **variables d'environnement** (ou un fichier
   `.env` non versionné) côté backend
3. Ne jamais committer ces secrets dans Git

Ceci ne concerne pas le code frontend (qui ne contient aucun secret), mais
est essentiel pour la sécurité globale de l'application.

## 🛣️ Pistes d'évolution

- Brancher les pages "Axes & Unités", "Membres" et "Actualités" sur de
  futurs endpoints backend (actuellement en "contenu à venir")
- Authentification réelle pour le bouton "Se connecter"
- Suivi en temps réel du statut d'upload en mode "instantané" via
  `/api/rag/files/{fileId}/status` (polling)
- Pagination de la bibliothèque de publications
