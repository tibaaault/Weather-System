# Makefile pour automatiser les déploiements Kubernetes

.PHONY: help build-images apply-config apply-stockage apply-microservices apply-all delete-all status logs-ingestion logs-lecture

# Commande par défaut
help:
	@echo "Commandes disponibles :"
	@echo "  make build-images        - Construit les images Docker (Ingestion, Lecture, Processor) dans Minikube"
	@echo "  make apply-config        - Déploie uniquement les ConfigMaps"
	@echo "  make apply-stockage      - Déploie MariaDB et RabbitMQ"
	@echo "  make apply-microservices - Déploie les Pods et Services Node.js"
	@echo "  make apply-all           - Déploie l'ensemble de l'infrastructure"
	@echo "  make delete-all          - Supprime toutes les ressources"
	@echo "  make status              - Affiche l'état des ressources"
	@echo "  make logs-ingestion      - Affiche les logs du pod d'ingestion"
	@echo "  make logs-lecture        - Affiche les logs du pod de lecture"

build-images:
	@echo "🐳 Pointage de Docker vers Minikube et construction des images..."
	@eval $$(minikube docker-env) && \
    	docker build -t meteo/api-ingestion:v1 src/api-ingestion/ && \
    	docker build -t meteo/api-processor:v1 src/api-processor/ && \
    	docker build -t meteo/api-lecture:v1 src/api-lecture/ && \
    	docker build -t meteo/meteo-dashboard:v1 src/dashboard-vue/&& \
    	docker build -t meteo/meteo-fetcher:v1 src/fetcher-cron/
	@echo "✅ Les 5 images Docker ont été construites avec succès !"

apply-config:
	@echo "🚀 Déploiement des configurations..."
	kubectl apply -f k8s/config/

apply-stockage:
	@echo "💾 Déploiement du stockage (MariaDB & RabbitMQ)..."
	kubectl apply -f k8s/stockage/

apply-microservices:
	@echo "⚙️ Déploiement des microservices..."
	kubectl apply -f k8s/microservices/

apply-frontend-gateway:
	@echo "⚙️ Déploiement des microservices..."
	kubectl apply -f k8s/frontend-gateway/

apply-all: apply-config apply-stockage apply-microservices apply-frontend-gateway
	@echo "✅ Déploiement complet terminé !"

delete-all:
	@echo "🧹 Nettoyage du cluster..."
	kubectl delete -f k8s/microservices/ --ignore-not-found=true
	kubectl delete -f k8s/stockage/ --ignore-not-found=true
	kubectl delete -f k8s/config/ --ignore-not-found=true
	kubectl delete -f k8s/frontend-gateway/ --ignore-not-found=true

status:
	@echo "📊 Statut des ressources :"
	kubectl get pods,svc,pvc

logs-ingestion:
	kubectl logs ingestion-pod --previous || kubectl logs ingestion-pod

logs-processor:
	kubectl logs processor-pod --previous || kubectl logs processor-pod

logs-lecture:
	kubectl logs lecture-pod --previous || kubectl logs lecture-pod

logs-fetcher:
	kubectl logs data-fetcher-pod --previous || kubectl logs data-fetcher-pod

logs-gateway:
	kubectl logs api-gateway-pod --previous || kubectl logs api-gateway-pod

reset: delete-all build-images apply-all