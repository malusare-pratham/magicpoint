const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { corsOrigins, isProduction } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const seoRoutes = require('./routes/seoRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');
const allowedOrigins = corsOrigins.map(normalizeOrigin);

app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            const normalizedOrigin = normalizeOrigin(origin);
            const isConfiguredOrigin = normalizedOrigin && allowedOrigins.includes(normalizedOrigin);
            const isVercelOrigin = normalizedOrigin && /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/i.test(normalizedOrigin);
            const isLocalDevOrigin = normalizedOrigin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin);

            if (!origin || isConfiguredOrigin || isVercelOrigin || isLocalDevOrigin) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(
    '/uploads',
    express.static(path.resolve(__dirname, 'uploads'), {
        setHeaders: (res) => {
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
    })
);

if (!isProduction) {
    app.use(morgan('dev'));
}

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' }
});

app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Service is healthy'
    });
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/seo-pages', seoRoutes);

app.get('/', (_req, res) => {
    res.status(200).json({ success: true, message: 'tripspotgo API is running' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
