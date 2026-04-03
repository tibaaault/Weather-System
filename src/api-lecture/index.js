const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration de la connexion DB grâce aux variables d'environnement (issues du ConfigMap)
const dbConfig = {
    host: process.env.DB_HOST || 'mariadb-svc', // Le nom du service Kubernetes de ta DB
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};

// Création d'un pool de connexions (plus performant que de créer une connexion à chaque requête)
const pool = mysql.createPool(dbConfig);

app.get('/api/history', async (req, res) => {
    try {
        // On interroge la table meteo_data (que ton pod processor créera)
        const [rows] = await pool.query('SELECT * FROM meteo_data ORDER BY id DESC LIMIT 50');
        res.status(200).json(rows);
    } catch (error) {
        // Si la table n'existe pas encore (code ER_NO_SUCH_TABLE), on ne panique pas
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log("⚠️ La table meteo_data n'existe pas encore, retour d'un tableau vide.");
            return res.status(200).json([]);
        }

        console.error("❌ Erreur lors de la lecture en DB :", error.message);
        res.status(500).json({ error: "Erreur serveur lors de la récupération des données" });
    }
});

app.listen(PORT, () => {
    console.log(`🟢 API Lecture démarrée sur le port ${PORT}`);
});