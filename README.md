# CERVARENT RAG — Assistant IA de recherche documentaire

Assistant conversationnel basé sur une architecture **RAG (Retrieval-Augmented
Generation)** développé pour le centre de recherche CERVARENT. L'utilisateur
pose une question en langage naturel ; le système recherche les documents les
plus pertinents dans sa base documentaire, puis génère une réponse sourcée à
l'aide d'un LLM (Mistral AI).

---

## 1. Présentation du projet

| | |
|---|---|
| **Backend** | Java 17 · Spring Boot 3.3 · Spring AI · Spring Security (JWT) |
| **Frontend** | React 18 · TypeScript · Vite |
| **LLM & Embeddings** | Mistral AI (`mistral-medium`, `mistral-embed`) |
| **Base de données** | PostgreSQL + pgvector (hébergée sur Supabase) |
| **Authentification** | JWT (nom d'utilisateur + mot de passe, sans email) |

Le projet est organisé en deux dossiers indépendants :

```
RAG-ARGENTIQUE/
├── src/                        → Backend Spring Boot
├── cervarent-rag-frontend/     → Frontend React
├── schema.sql                  → Script de création des tables PostgreSQL
├── pom.xml                     → Dépendances backend (Maven)
└── README.md                   → Ce fichier
```

---

## 2. Fonctionnalités

### Cœur du RAG
- **Question/réponse sourcée** : chaque réponse de l'IA cite les documents
  utilisés, avec un score de pertinence (similarité cosinus).
- **Réponse en streaming** (Server-Sent Events) : le texte apparaît
  progressivement, comme dans les assistants IA modernes.
- **Filtre de pertinence documentaire** : les documents trop éloignés
  sémantiquement de la question ne sont pas injectés dans le contexte du
  LLM (réduit le bruit et les réponses hors-sujet).
- **Upload de documents** (PDF, TXT, DOCX), avec deux modes :
  - *thinking* : traitement synchrone, la réponse HTTP attend la fin.
  - *instant* : traitement asynchrone en arrière-plan, avec **suivi de
    progression en temps réel** (barre de progression page par page).
- **Indexation manuelle** de texte via un formulaire simple.

### Bibliothèque documentaire
- Liste de tous les documents indexés, regroupés par source, avec nombre de
  segments, taille et date d'ajout.
- **Suppression** d'un document (retire tous ses segments de l'index).
- **Mise à jour** d'un document existant (remplace son contenu et le
  réindexe).
- **Téléchargement du document complet** : cliquer sur "Télécharger" à côté
  d'une source citée par l'IA (dans une réponse, ou depuis la bibliothèque)
  reconstitue et télécharge **l'intégralité du document original**, et non
  plus seulement l'extrait (chunk) cité par l'IA.

### Conversation
- Historique de conversation avec mémoire courte (l'IA se souvient des
  échanges précédents dans la même conversation).
- Renommage, épinglage et suppression de conversations (persistées en
  local dans le navigateur).
- Régénération d'une réponse, arrêt de la génération en cours.
- **Avis utilisateur** (👍/👎) sur chaque réponse de l'IA, enregistré côté
  serveur pour analyse future de la qualité des réponses.

### Authentification
- Inscription / connexion par nom d'utilisateur + mot de passe (haché avec
  BCrypt, jamais stocké en clair).
- Session maintenue via un token JWT (24h), attaché automatiquement à
  chaque requête vers le backend.
- Toutes les routes du RAG sont protégées : un visiteur non connecté est
  redirigé vers la page de connexion.

> **Note :** la fonctionnalité de mot de passe oublié a été volontairement
> retirée pour simplifier le projet (pas de dépendance à un service d'envoi
> d'email). Elle peut être réintroduite ultérieurement si nécessaire (voir
> section "Fonctionnalités à venir").

---

## 3. Prérequis

- **Java 17** ou supérieur
- **Maven** (ou utiliser le wrapper `./mvnw` fourni, aucune installation requise)
- **Node.js 18+** et **npm**
- Un compte **Supabase** (ou toute base PostgreSQL avec l'extension `pgvector`)
- Une **clé API Mistral AI** (https://console.mistral.ai)

---

## 4. Installation et lancement

### 4.1. Base de données

1. Créer un projet PostgreSQL (par exemple sur [Supabase](https://supabase.com)).
2. Ouvrir l'éditeur SQL et exécuter le contenu du fichier **`schema.sql`**
   fourni à la racine du projet. Cela crée les 4 tables nécessaires
   (`document_chunks`, `uploaded_files`, `users`, `message_feedback`) ainsi
   que les index de recherche vectorielle.

### 4.2. Backend

1. Configurer `src/main/resources/application.properties` avec vos propres
   identifiants (ne jamais committer de vraies clés/mots de passe dans un
   dépôt public — voir section Sécurité) :

   ```properties
   spring.datasource.url=jdbc:postgresql://<votre-host-supabase>:5432/postgres?sslmode=require
   spring.datasource.username=<votre-utilisateur>
   spring.datasource.password=<votre-mot-de-passe>

   spring.ai.mistralai.api-key=<votre-clé-api-mistral>

   app.jwt.secret=<une-chaine-secrete-longue-et-aleatoire>
   ```

2. Lancer le backend :

   ```bash
   cd RAG-ARGENTIQUE
   ./mvnw spring-boot:run
   ```

   Le serveur démarre sur `http://localhost:8087`. Vérifier qu'il répond :

   ```bash
   curl http://localhost:8087/api/rag/health
   ```

### 4.3. Frontend

```bash
cd RAG-ARGENTIQUE/cervarent-rag-frontend
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173`. En développement,
Vite redirige automatiquement les appels `/api/*` vers le backend
(`http://localhost:8087`).

### 4.4. Premier lancement

1. Ouvrir `http://localhost:5173`.
2. Créer un compte via "Se connecter" → "Créer un compte".
3. Se rendre sur **Publications → Recherche RAG**.
4. Indexer un premier document via le panneau d'upload (PDF, TXT ou DOCX).
5. Poser une question dans le chat : la réponse doit citer le document
   indexé comme source.

---

## 5. Architecture technique

### Backend (`src/main/java/com/Cervarent/RAG`)

```
config/       → Configuration Spring (IA, sécurité)
controller/   → Points d'entrée REST (Auth, RAG, Feedback)
dto/          → Objets de transfert (requêtes/réponses API)
entity/       → Entités JPA (mappées sur les tables PostgreSQL)
repository/   → Accès aux données (Spring Data JPA + requêtes SQL natives pgvector)
security/     → Filtre et utilitaire JWT
service/      → Logique métier (RAG, documents, upload, authentification)
```

**Pipeline RAG** (`RagService`) : la question de l'utilisateur est
transformée en vecteur d'embedding (Mistral), comparé par distance cosinus
aux embeddings déjà indexés (pgvector), filtré par seuil de pertinence, puis
injecté dans un prompt système envoyé au LLM pour générer la réponse finale.

### Frontend (`cervarent-rag-frontend/src`)

```
components/   → Composants réutilisables (chat, upload, bibliothèque, auth)
context/      → État global (authentification, thème clair/sombre)
hooks/        → Logique réutilisable (gestion des conversations)
pages/        → Pages de l'application (accueil, publications, chat, auth)
services/     → Clients HTTP vers le backend (ragApi, authApi)
types/        → Types TypeScript synchronisés avec les DTOs backend
```

L'identité visuelle (couleurs, typographies, rayons) est centralisée dans
`src/styles/global.css` sous forme de variables CSS (`--color-primary`,
etc.), reprises par tous les composants — y compris les pages
d'authentification, pour une cohérence visuelle sur l'ensemble du site.

---

## 6. Sécurité — points d'attention avant une mise en production

- **Ne jamais committer** `application.properties` avec de vraies
  identifiants : utiliser des variables d'environnement ou un fichier
  ignoré par Git.
- Régénérer `app.jwt.secret` avec une valeur longue et aléatoire propre à
  chaque environnement.
- Restreindre la configuration CORS (`SecurityConfig`) au(x) domaine(s)
  réel(s) du frontend en production (actuellement `localhost:5173`).
- Mettre en place une limitation de débit (rate limiting) sur les endpoints
  publics pour éviter les abus de quota Mistral AI.

---

## 7. Fonctionnalités à venir (roadmap)

- **Reranking** des documents avant génération, pour affiner davantage la
  pertinence des sources citées.
- **Réécriture de requête** à partir de l'historique de conversation, pour
  mieux traiter les questions de suivi ("et pour les autres ?").
- **Rôles utilisateurs** (administrateur / utilisateur standard), avec une
  interface d'administration pour gérer les comptes et consulter les
  statistiques d'usage (feedback, questions fréquentes).
- **OCR** pour l'indexation de documents PDF scannés (actuellement non
  supportés).
- **Cache de réponses** pour les questions identiques ou très similaires,
  afin de réduire la latence et les coûts d'appel au LLM.
- **Export d'une conversation** (réponse + sources) en PDF ou Word, utile
  pour un usage académique.
- **Réintroduction du mot de passe oublié**, une fois un service d'envoi
  d'email choisi et configuré pour le projet.

---

## 8. Support

Pour toute question sur le fonctionnement du projet, se référer aux
commentaires présents directement dans le code (chaque service, contrôleur
et composant React est documenté sur son rôle et ses choix de conception).
