const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const enforcedDbName = 'magicpoint';

const forceDbName = (uri, dbName) => {
    const safeUri = (uri || '').trim();

    if (!safeUri) {
        return `mongodb://127.0.0.1:27017/${dbName}`;
    }

    const hasProtocol = safeUri.startsWith('mongodb://') || safeUri.startsWith('mongodb+srv://');
    if (!hasProtocol) {
        return `mongodb://127.0.0.1:27017/${dbName}`;
    }

    const questionMarkIndex = safeUri.indexOf('?');
    const base = questionMarkIndex === -1 ? safeUri : safeUri.slice(0, questionMarkIndex);
    const query = questionMarkIndex === -1 ? '' : safeUri.slice(questionMarkIndex);

    const slashIndex = base.lastIndexOf('/');
    const rebuiltBase = slashIndex >= 0 ? `${base.slice(0, slashIndex + 1)}${dbName}` : `${base}/${dbName}`;

    return `${rebuiltBase}${query}`;
};

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const config = {
    nodeEnv,
    isProduction,
    port: Number(process.env.PORT) || 5000,
    mongoUri: forceDbName(process.env.MONGO_URI || `mongodb://127.0.0.1:27017/${enforcedDbName}`, enforcedDbName),
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    orsApiKey: process.env.ORS_API_KEY || '',
    corsOrigins,
    mongoMinPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 5,
    mongoMaxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20
};

if (isProduction) {
    const requiredVars = ['MONGO_URI', 'JWT_SECRET'];
    const missing = requiredVars.filter((name) => !process.env[name]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

module.exports = config;
