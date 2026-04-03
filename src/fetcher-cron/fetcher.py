import os
import time
import requests
import json

CITIES = json.loads(os.getenv("CITIES_JSON", "[]"))
GATEWAY_URL = os.getenv("GATEWAY_URL")
INTERVAL = int(os.getenv("FETCH_INTERVAL", 300))

def fetch_all():
    while True:
        print(f"--- Début du scan de {len(CITIES)} villes ---")
        for city in CITIES:
            try:
                # URL dynamique
                url = f"https://api.open-meteo.com/v1/forecast?latitude={city['lat']}&longitude={city['lon']}&current_weather=true"
                
                response = requests.get(url)
                data = response.json()
                
                payload = {
                    "city": city['name'],
                    "temperature": data.get("current_weather", {}).get("temperature"),
                    "unit": "celsius",
                    "timestamp": time.time()
                }
                
                requests.post(GATEWAY_URL, json=payload)
                print(f"✅ {city['name']}: {payload['temperature']}°C envoyé.")
                
            except Exception as e:
                print(f"Erreur pour {city['name']}: {e}")
            
            time.sleep(1)

        print(f"--- Scan terminé. Repos de {INTERVAL}s ---")
        time.sleep(INTERVAL)

if __name__ == "__main__":
    fetch_all()