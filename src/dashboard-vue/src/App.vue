<template>
  <div class="dashboard">
    <div v-if="loading">Chargement...</div>
    <div v-else-if="meteoData.length === 0">Aucune donnée disponible.</div>
    <div v-for="data in meteoData" :key="data.id" class="card">
      <h3>{{ data.city }}</h3>
      <p class="temp">{{ data.temperature }}°C</p>
      <small>Mis à jour à : {{ formatTime(data.date_releve) }}</small>
    </div>
  </div>
</template>

<script>
export default {
  name: "App",
  data() {
    return {
      meteoData: [],
      loading: true,
    };
  },
  mounted() {
    this.fetchHistorique();
  },
  methods: {
    formatTime(dateStr) {
      if (!dateStr) return "N/A";
      const date = new Date(dateStr);
      return date.toLocaleTimeString();
    },
    async fetchHistorique() {
      try {
        const response = await fetch("/api/history");

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        this.meteoData = data;
        this.loading = false;
      } catch (error) {
        console.error("Détail de l'erreur :", error);
        this.loading = false;
      }
    },
  },
};
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  text-align: center;
  padding: 20px;
}
</style>
