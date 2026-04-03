cd src/fetcher-cron
docker build -t tibaaault/meteo-fetcher:latest .

cd ../dashboard-vue
docker build -t tibaaault/meteo-dashboard:latest .

kubectl apply -f k8s/config/
kubectl apply -f k8s/frontend-et-gateway/

# Dossier src/fetcher-cron
docker build -t tibaaault/meteo-fetcher:latest .   
cd ../dashboard-vue
docker build -t tibaaault/meteo-dashboard:latest .

# Racine 
kubectl apply -f k8s/config/
kubectl apply -f k8s/frontend-gateway/  