<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <div class="header-titles">
        <h1>Météo Dashboard</h1>
        <div class="live-badge">
          <span class="live-indicator"></span>
          Live
        </div>
      </div>
      <p class="subtitle">Mise à jour automatique toutes les 30 secondes</p>
    </header>

    <div v-if="loading && Object.keys(cityData).length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Synchronisation des capteurs...</p>
    </div>

    <div v-else class="dashboard-grid">
      <div v-for="(history, city) in cityData" :key="city" class="weather-card fade-in">
        <div class="card-header">
          <div class="city-info">
            <h3>{{ city }}</h3>
            <small v-if="history.length" class="last-update">
              Màj : {{ history[history.length - 1].timeLabel }}
            </small>
          </div>
          <span v-if="history.length" class="temp-badge" :class="getTempClass(history[history.length - 1].temperature)">
            {{ history[history.length - 1].temperature }}°C
          </span>
        </div>
        
        <div class="card-body">
          <canvas :id="'chart-' + city"></canvas>
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
        console.log("🔄 Tentative de mise à jour...");
        const response = await fetch('/api/history'); 
        const data = await response.json();
        
        if (!response.ok || data.error) throw new Error(data.error || `Erreur HTTP ${response.status}`);
        if (!Array.isArray(data)) throw new Error("Les données reçues ne sont pas un tableau");

        console.log("📡 Données reçues du serveur :", data);

        let newCityData = { ...this.cityData };
        let hasNewData = false;

        // On traite les données de la plus ancienne à la plus récente
        const chronologicData = [...data].reverse();

        chronologicData.forEach(item => {
          const city = item.city;
          if (!newCityData[city]) newCityData[city] = [];
          
          const timeLabel = this.formatTime(item.date_releve);
          const isDuplicate = newCityData[city].some(entry => entry.timestamp === item.date_releve);
          
          if (!isDuplicate) {
            hasNewData = true;
            newCityData[city].push({
              temperature: item.temperature,
              timestamp: item.date_releve,
              timeLabel: timeLabel
            });

            if (newCityData[city].length > 15) newCityData[city].shift(); 
          }
        });

        if (hasNewData || Object.keys(this.cityData).length === 0) {
          console.log("✅ Nouvelles données intégrées, mise à jour des graphiques.");
          this.cityData = newCityData;
          this.$nextTick(() => this.updateCharts());
        } else {
          console.log("ℹ️ Aucune nouvelle donnée (timestamps identiques).");
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
          this.charts[city].update('none'); 
        } else {
          const ctx = canvasElement.getContext('2d');
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

          this.charts[city] = new Chart(canvasElement, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Température (°C)',
                data: dataPoints,
                borderColor: '#6366f1',
                backgroundColor: gradient,
                borderWidth: 3,
                pointRadius: 2,
                tension: 0.4,
                fill: true    
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
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
      // Ajout des secondes pour vérifier la mise à jour réelle
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    },

    getTempClass(temp) {
      if (temp < 10) return 'temp-cold';
      if (temp > 25) return 'temp-hot';
      return 'temp-mild';
    }
  }
}
</script>

<style scoped>
/* --- Layout principal --- */
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 50px;
}

.header-titles {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 8px;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--text-muted);
  font-size: 1.1rem;
  font-weight: 400;
  margin: 0;
}

/* --- Badge Live --- */
.live-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #fee2e2;
  color: #ef4444;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.live-indicator {
  width: 8px;
  height: 8px;
  background-color: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

/* --- LE STYLE GRID --- */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 32px;
}

/* --- Cartes --- */
.weather-card {
  background-color: var(--card-bg);
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
  border: 1px solid rgba(255,255,255, 0.5);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.weather-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.city-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.last-update {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 500;
}

/* --- Badges Température --- */
.temp-badge {
  font-size: 1.4rem;
  font-weight: 700;
  padding: 8px 18px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.4);
}

.temp-cold { color: #0369a1; background-color: #e0f2fe; border: 1px solid #bae6fd; }
.temp-mild { color: #047857; background-color: #d1fae5; border: 1px solid #a7f3d0; }
.temp-hot { color: #be123c; background-color: #ffe4e6; border: 1px solid #fecdd3; }

/* Conteneur du canvas Chart.js */
.card-body {
  flex-grow: 1;
  min-height: 220px;
  position: relative;
  width: 100%;
}

/* --- Spinner --- */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 40vh;
  color: var(--text-muted);
  font-weight: 500;
  font-size: 1.1rem;
}

.spinner {
  border: 3px solid rgba(99, 102, 241, 0.1);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border-left-color: var(--primary);
  animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  margin-bottom: 20px;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Animations d'entrée */
.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .dashboard-header h1 { font-size: 2rem; }
}
</style>