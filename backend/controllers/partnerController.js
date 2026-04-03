const Partner = require('../models/Partner');

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

        const shaped = results.map((partner) => {
            const distanceKm = Number(partner.distanceMeters || 0) / 1000;
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

