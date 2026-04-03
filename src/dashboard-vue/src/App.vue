<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <h1>🌤️ Météo Dashboard (Live)</h1>
      <p>Mise à jour automatique toutes les 30 secondes</p>
    </header>

    <div v-if="loading && Object.keys(cityData).length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement des données météo...</p>
    </div>

    <div v-else class="dashboard-grid">
      <div v-for="(history, city) in cityData" :key="city" class="weather-card">
        <div class="card-header">
          <h3>{{ city }}</h3>
          <span v-if="history.length" class="temp-badge" :class="getTempClass(history[history.length - 1].temperature)">
            {{ history[history.length - 1].temperature }}°C
          </span>
        </div>
        
        <div class="card-body">
          <canvas :id="'chart-' + city"></canvas>
        </div>
        
        <div class="card-footer">
          <small v-if="history.length">Dernier relevé : {{ history[history.length - 1].timeLabel }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Chart from 'chart.js/auto';

export default {
  name: 'App',
  data() {
    return {
      cityData: {}, 
      loading: true,
      polling: null
    }
  },
  created() {
    this.charts = {};
  },
  mounted() {
    this.fetchHistorique();
    
    // Polling toutes les 30s
    this.polling = setInterval(() => {
      this.fetchHistorique();
    }, 30000);
  },
  beforeUnmount() {
    clearInterval(this.polling);
    Object.values(this.charts).forEach(chart => chart.destroy());
  },
  methods: {
async fetchHistorique() {
      try {
        const response = await fetch('/api/history'); 
        const data = await response.json();
        
        if (!response.ok || data.error) {
           throw new Error(data.error || `Erreur HTTP ${response.status}`);
        }
        if (!Array.isArray(data)) {
           throw new Error("Les données reçues ne sont pas un tableau");
        }

        console.log("📡 Nouvelles données reçues :", data);

        let newCityData = { ...this.cityData };
        let hasNewData = false;

        // 1. On INVERSE le tableau pour traiter du plus ANCIEN au plus RÉCENT
        const chronologicData = data.reverse();

        chronologicData.forEach(item => {
          const city = item.city;
          if (!newCityData[city]) {
            newCityData[city] = [];
          }
          
          // 2. On utilise 'date_releve' au lieu de 'timestamp' !
          const timeLabel = this.formatTime(item.date_releve);
          
          // On compare avec la date reçue
          const isDuplicate = newCityData[city].some(entry => entry.timestamp === item.date_releve);
          
          if (!isDuplicate) {
            hasNewData = true;
            newCityData[city] = [
              ...newCityData[city], 
              {
                temperature: item.temperature,
                timestamp: item.date_releve, // On sauvegarde la vraie date
                timeLabel: timeLabel
              }
            ];

            // On garde seulement les 15 derniers points
            if (newCityData[city].length > 15) {
              newCityData[city].shift(); 
            }
          }
        });

        if (hasNewData || Object.keys(this.cityData).length === 0) {
          this.cityData = newCityData;
          this.$nextTick(() => {
            this.updateCharts();
          });
        } else {
          console.log("ℹ️ Les données reçues sont identiques aux précédentes.");
        }

      } catch (error) {
        console.error("❌ Erreur lors de la récupération :", error.message);
      } finally {
        this.loading = false;
      }
    },
    
    updateCharts() {
      Object.keys(this.cityData).forEach(city => {
        const history = this.cityData[city];
        const canvasElement = document.getElementById('chart-' + city);
        
        if (!canvasElement) return;

        const labels = history.map(h => h.timeLabel);
        const dataPoints = history.map(h => h.temperature);

        if (this.charts[city]) {
          this.charts[city].data.labels = labels;
          this.charts[city].data.datasets[0].data = dataPoints;
          this.charts[city].update('none'); // L'argument 'none' permet une transition fluide
        } else {
          this.charts[city] = new Chart(canvasElement, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Température (°C)',
                data: dataPoints,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 3, // Trait plus épais
                pointRadius: 4, // Points bien visibles
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                tension: 0.3, 
                fill: true    
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false, // Permet au graphe de bien remplir la carte
              plugins: { legend: { display: false } },
              scales: {
                y: { suggestedMin: 0, suggestedMax: 35 }
              }
            }
          });
        }
      });
    },

    formatTime(timestamp) {
      if (!timestamp) return '--:--';
      const date = new Date(timestamp);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },

    getTempClass(temp) {
      if (temp < 10) return 'temp-cold';
      if (temp > 25) return 'temp-hot';
      return 'temp-mild';
    }
  }
}
</script>

<style>
/* --- Layout principal --- */
:root {
  --bg-color: #f8fafc;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --card-bg: #ffffff;
}

body {
  margin: 0;
  background-color: var(--bg-color);
}

.dashboard-container {
  max-width: 1400px; /* Plus grand pour accueillir le grid */
  margin: 0 auto;
  padding: 30px;
  font-family: 'Segoe UI', Roboto, sans-serif;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 50px;
}

/* --- LE STYLE GRID --- */
.dashboard-grid {
  display: grid;
  /* Crée des colonnes d'au moins 400px qui s'adaptent à l'écran */
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px; /* Bel espace entre les cartes */
  align-items: stretch;
}

/* --- Cartes --- */
.weather-card {
  background-color: var(--card-bg);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-main);
}

.temp-badge {
  font-size: 1.2rem;
  font-weight: bold;
  padding: 6px 16px;
  border-radius: 30px;
}

.temp-cold { color: #2563eb; background-color: #dbeafe; }
.temp-mild { color: #059669; background-color: #d1fae5; }
.temp-hot { color: #dc2626; background-color: #fee2e2; }

/* Conteneur du canvas Chart.js */
.card-body {
  flex-grow: 1;
  min-height: 250px; /* Hauteur généreuse pour le graphe */
  position: relative;
  margin-bottom: 20px;
}

.card-footer {
  text-align: right;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding-top: 15px;
  border-top: 1px solid #f1f5f9;
}

/* --- Spinner --- */
.loading-state {
  text-align: center;
  padding: 50px;
}
.spinner {
  border: 4px solid #f3f3f3;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border-left-color: #3b82f6;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>