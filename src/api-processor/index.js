const amqp = require('amqplib');
const mysql = require('mysql2/promise');

const AMQP_URL = process.env.AMQP_URL || 'amqp://admin:adminpassword@rabbitmq-svc:5672';
const QUEUE_NAME = 'meteo_queue';

// Paramètres MariaDB récupérés depuis les ConfigMaps
const dbConfig = {
    host: process.env.DB_HOST || 'mariadb-svc',
    user: process.env.MYSQL_USER || 'user_meteo',
    password: process.env.MYSQL_PASSWORD || 'userpassword',
    database: process.env.MYSQL_DATABASE || 'meteo_db'
};

async function initDB() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("✅ Connecté à MariaDB !");

        // Création de la table si elle n'existe pas
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS releves (
                id INT AUTO_INCREMENT PRIMARY KEY,
                temperature FLOAT NOT NULL,
                humidite FLOAT NOT NULL,
                date_releve TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table 'releves' vérifiée/créée.");
        return connection;
    } catch (err) {
        console.error("❌ Erreur de connexion à MariaDB, nouvelle tentative...", err.message);
        await new Promise(res => setTimeout(res, 5000));
        return initDB();
    }
}

async function startProcessor() {
    const db = await initDB();

    async function connectMQ() {
        try {
            const mqConn = await amqp.connect(AMQP_URL);
            const channel = await mqConn.createChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });

            console.log("✅ Connecté à RabbitMQ. En attente de messages...");

            // On écoute les messages arrivant dans la file
            channel.consume(QUEUE_NAME, async (msg) => {
                if (msg !== null) {
                    const data = JSON.parse(msg.content.toString());
                    console.log("📥 Message reçu :", data);

                    try {
                        // Sauvegarde en base de données
                        await db.execute(
                            'INSERT INTO releves (temperature, humidite) VALUES (?, ?)',
                            [data.temperature, data.humidite] // Assure-toi que ton simulateur envoie ces champs
                        );
                        console.log("💾 Donnée sauvegardée dans MariaDB.");

                        // On confirme à RabbitMQ que le message est traité, il peut le supprimer
                        channel.ack(msg);
                    } catch (dbErr) {
                        console.error("❌ Erreur lors de l'insertion en DB :", dbErr);
                        // En cas d'erreur DB, on remet le message dans la file (nack)
                        channel.nack(msg);
                    }
                }
            });
        } catch (err) {
            console.error("❌ Erreur RabbitMQ, nouvelle tentative...", err.message);
            setTimeout(connectMQ, 5000);
        }
    }

    connectMQ();
}

startProcessor();