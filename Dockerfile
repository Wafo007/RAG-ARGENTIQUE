# ============================================================
# STAGE 1 — Build du frontend React (Vite)
# ============================================================
# Image node légère (alpine) uniquement pour la compilation.
# Elle ne sera jamais présente dans l'image finale.
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# On copie d'abord uniquement les manifestes de dépendances.
# Cela permet à Docker de mettre en cache la couche "npm ci"
# tant que package.json / package-lock.json ne changent pas,
# même si le code source change ensuite.
COPY cervarent-rag-frontend/package.json cervarent-rag-frontend/package-lock.json ./
RUN npm ci

# Le code source est copié après : un changement de code ne casse
# pas le cache de la couche précédente (npm ci).
COPY cervarent-rag-frontend/ ./

# Build de production Vite -> génère /frontend/dist
RUN npm run build


# ============================================================
# STAGE 2 — Build du backend Spring Boot (Maven)
# ============================================================
# Image contenant un JDK 17, conforme à <java.version>17</java.version>
# du pom.xml. Utilisée uniquement pour compiler, jamais pour exécuter.
FROM eclipse-temurin:17-jdk-jammy AS backend-builder

WORKDIR /app

# Étape de cache Maven : on copie le wrapper et le pom.xml seuls,
# puis on télécharge les dépendances. Tant que le pom.xml ne change
# pas, Docker réutilisera cette couche (dépendances déjà en cache),
# même si le code Java change ensuite.
COPY mvnw ./
COPY .mvn/ .mvn/
COPY pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copie du code source backend
COPY src/ src/

# Copie du frontend compilé (stage 1) directement dans le dossier
# static de Spring Boot. Spring Boot sert automatiquement tout ce
# qui se trouve dans src/main/resources/static via son serveur
# embarqué (Tomcat), sans configuration supplémentaire.
COPY --from=frontend-builder /frontend/dist/ src/main/resources/static/

# Compilation du jar exécutable, tests désactivés (déjà validés en CI
# / en local — accélère le build de l'image et évite une dépendance
# à une base de données pendant le build Docker).
RUN ./mvnw clean package -DskipTests -B


# ============================================================
# STAGE 3 — Image finale d'exécution
# ============================================================
# JRE seule (pas de JDK) : image nettement plus légère, suffisante
# car on ne fait qu'exécuter un jar déjà compilé.
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

# Bonne pratique sécurité : ne pas exécuter l'application en root.
RUN addgroup --system spring && adduser --system --ingroup spring spring
USER spring:spring

# Seul le jar final est copié depuis le stage de build.
# Aucun code source, aucun outil de build ne se retrouve dans
# l'image finale -> image minimale et surface d'attaque réduite.
COPY --from=backend-builder /app/target/*.jar app.jar

# Render fournit dynamiquement le port via la variable d'environnement
# PORT. server.port doit être défini avec la valeur ${PORT:8087} dans
# application.properties (voir section "Vérifications" ci-dessous) pour
# que Spring Boot écoute sur le bon port en production.
ENV PORT=8087
EXPOSE 8087

# Le -Xmx est repris de la config existante du pom (jvmArguments -Xmx4g).
# On le garde raisonnable ici (512m) car les instances Render "Free"/
# "Starter" ont peu de RAM ; à ajuster selon le plan Render réellement utilisé.
ENTRYPOINT ["sh", "-c", "java -Xmx512m -jar app.jar --server.port=${PORT}"]