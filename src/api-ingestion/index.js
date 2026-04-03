const express = require('express');
const amqp = require('amqplib');

const app = express();
app.use(express.json()); // Pour parser le JSON entrant

const PORT = process.env.PORT || 3000;
// L'URL utilisera le service Kubernetes "rabbitmq-svc"
const AMQP_URL = process.env.AMQP_URL || 'amqp://admin:adminpassword@rabbitmq-svc:5672';
const QUEUE_NAME = 'meteo_queue';

let channel = null;

// Fonction de connexion à RabbitMQ (avec retry automatique)
async function connectQueue() {
    try {
        const connection = await amqp.connect(AMQP_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log("✅ Connecté à RabbitMQ !");
    } catch (error) {
        console.error("❌ Erreur de connexion à RabbitMQ, tentative dans 5s...", error.message);
        setTimeout(connectQueue, 5000);
    }
}

connectQueue();

// Route principale qui recevra les données POST
app.post('/api/data', async (req, res) => {
    try {
        const data = req.body;

        if (!channel) {
            return res.status(500).json({ error: "Service RabbitMQ non disponible" });
        }

        // On convertit le JSON en Buffer et on l'envoie dans la file d'attente
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(data)), { persistent: true });

        console.log("📥 Donnée envoyée dans la file :", data);
        res.status(200).json({ message: "Donnée ingérée avec succès" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de l'ingestion" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Ingestion démarrée sur le port ${PORT}`);
});