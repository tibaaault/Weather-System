# Étape 1 : Build de l'application Vue.js
FROM node:22-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Étape 2 : Serveur NGINX pour héberger les fichiers statiques
FROM nginx:alpine
# On copie le résultat du build de l'étape 1 vers le dossier public de NGINX
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]