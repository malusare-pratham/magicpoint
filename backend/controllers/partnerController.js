const Partner = require('../models/Partner');
const axios = require('axios');
const { orsApiKey } = require('../config/env');

const buildImageUrl = (req, rawPath) => {
    if (!rawPath) return null;
    const stringPath = String(rawPath).trim();
    if (/^https?:\/\//i.test(stringPath)) return stringPath;

    const normalized = stringPath
        .replace(/\\/g, '/')
        .replace(/^\.?\//, '')
        .replace(/^backend\//i, '');

    const publicPath = normalized.startsWith('uploads/')
        ? normalized
        : `uploads/${normalized.split('/').pop()}`;

    return `${req.protocol}://${req.get('host')}/${publicPath}`;
};

const toNumber = (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
};

exports.getNearbyPartners = async (req, res) => {
    try {
        const lat = toNumber(req.query.lat);
        const lng = toNumber(req.query.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return res.status(400).json({ message: 'lat and lng are required' });
        }

        const radiusMeters = Math.max(toNumber(req.query.radius) || 5000, 500);
        const category = String(req.query.category || '').trim();

        const matchQuery = {
            status: 'Active',
            businessStatus: 'OPEN'
        };
        if (category) matchQuery.businessCategory = category;

        const results = await Partner.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [lng, lat] },
                    distanceField: 'distanceMeters',
                    maxDistance: radiusMeters,
                    spherical: true,
                    query: matchQuery
                }
            }
        ]);

        let roadDistances = null;
        if (orsApiKey && results.length > 0) {
            try {
                const origin = [Number(lng), Number(lat)];
                const destinations = results.map((partner) => {
                    const coords = partner?.location?.coordinates || [];
                    return [Number(coords[0]), Number(coords[1])];
                });

                const isValidCoord = (coord) =>
                    Array.isArray(coord) &&
                    coord.length >= 2 &&
                    Number.isFinite(coord[0]) &&
                    Number.isFinite(coord[1]) &&
                    Math.abs(coord[1]) <= 90 &&
                    Math.abs(coord[0]) <= 180;

                if (isValidCoord(origin) && destinations.every(isValidCoord)) {
                    const batchSize = 40;
                    const collected = [];

                    for (let i = 0; i < destinations.length; i += batchSize) {
                        const batch = destinations.slice(i, i + batchSize);
                        const locations = [origin, ...batch];
                        const response = await axios.post(
                            'https://api.openrouteservice.org/v2/matrix/driving-car',
                            {
                                locations,
                                sources: [0],
                                destinations: batch.map((_, idx) => idx + 1),
                                metrics: ['distance']
                            },
                            {
                                headers: {
                                    Authorization: orsApiKey,
                                    'Content-Type': 'application/json'
                                },
                                timeout: 8000
                            }
                        );
                        const distances = response?.data?.distances?.[0] || [];
                        const normalized = distances.map((meters) =>
                            Number.isFinite(meters) ? meters : null
                        );
                        collected.push(...normalized);
                    }

                    if (collected.length === destinations.length) {
                        roadDistances = collected;
                    }
                }
            } catch (_error) {
                roadDistances = null;
            }
        }

        const shaped = results.map((partner, index) => {
            const straightMeters = Number(partner.distanceMeters || 0);
            const roadMeters = roadDistances?.[index];
            const distanceMeters = roadMeters ?? straightMeters;
            const distanceKm = Number(distanceMeters || 0) / 1000;
            return {
                ...partner,
                imageUrl: buildImageUrl(req, partner.resImage),
                distance: `${distanceKm.toFixed(1)} km`
            };
        });

        return res.status(200).json(shaped);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching nearby partners', error: error.message });
    }
};
