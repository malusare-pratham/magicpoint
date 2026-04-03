const http = require('http');
const fs = require('fs'); // इमेजेस फोल्डर चेक करण्यासाठी जोडले
const path = require('path');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const Partner = require('./models/Partner');
const { port } = require('./config/env');

let server;

// इमेजेस स्टोअर करण्यासाठी 'uploads' फोल्डर आहे की नाही हे तपासणे (नसल्यास बनवणे)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const startServer = async () => {
    try {
        await connectDB();
        try {
            await Partner.syncIndexes();
            console.log('Partner indexes synced');
        } catch (error) {
            console.warn(`Partner index sync failed: ${error.message}`);
        }
        server = http.createServer(app);

        server.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error(`Startup failed: ${error.message}`);
        process.exit(1);
    }
};

const gracefulShutdown = async (signal) => {
    try {
        console.log(`${signal} received. Shutting down gracefully...`);

        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        }

        await disconnectDB();
        process.exit(0);
    } catch (error) {
        console.error(`Graceful shutdown failed: ${error.message}`);
        process.exit(1);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
    console.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
    console.error(`Uncaught Exception: ${error.message}`);
});

startServer();
