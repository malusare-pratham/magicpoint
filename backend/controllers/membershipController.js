const Membership = require('../models/Membership');
const asyncHandler = require('../middleware/asyncHandler');

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const toStringValue = (value) => String(value ?? '').trim();

const toFeaturesArray = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item ?? '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

const listMemberships = asyncHandler(async (_req, res) => {
    const plans = await Membership.find({ isActive: true })
        .sort({ sortOrder: 1, price: 1, createdAt: 1 })
        .lean();

    res.status(200).json({
        success: true,
        count: plans.length,
        data: plans
    });
});

const listAllMemberships = asyncHandler(async (_req, res) => {
    const plans = await Membership.find({})
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();

    res.status(200).json({
        success: true,
        count: plans.length,
        data: plans
    });
});

const createMembership = asyncHandler(async (req, res) => {
    const title = toStringValue(req.body?.title);
    if (!title) {
        return res.status(400).json({ message: 'title is required' });
    }
    const price = toNumber(req.body?.price, NaN);
    if (!Number.isFinite(price)) {
        return res.status(400).json({ message: 'price is required' });
    }

    const payload = {
        title,
        price,
        billingCycle: toStringValue(req.body?.billingCycle),
        durationHours: Math.max(1, toNumber(req.body?.durationHours, 48)),
        features: toFeaturesArray(req.body?.features),
        badge: toStringValue(req.body?.badge),
        ctaText: toStringValue(req.body?.ctaText),
        sortOrder: toNumber(req.body?.sortOrder, 0),
        isActive: req.body?.isActive === false ? false : true
    };

    const doc = await Membership.create(payload);
    res.status(201).json({ success: true, data: doc });
});

const updateMembership = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'membership id is required' });
    }

    const updates = {
        ...(req.body?.title !== undefined ? { title: toStringValue(req.body.title) } : {}),
        ...(req.body?.price !== undefined ? { price: toNumber(req.body.price, 0) } : {}),
        ...(req.body?.billingCycle !== undefined ? { billingCycle: toStringValue(req.body.billingCycle) } : {}),
        ...(req.body?.durationHours !== undefined ? { durationHours: Math.max(1, toNumber(req.body.durationHours, 48)) } : {}),
        ...(req.body?.features !== undefined ? { features: toFeaturesArray(req.body.features) } : {}),
        ...(req.body?.badge !== undefined ? { badge: toStringValue(req.body.badge) } : {}),
        ...(req.body?.ctaText !== undefined ? { ctaText: toStringValue(req.body.ctaText) } : {}),
        ...(req.body?.sortOrder !== undefined ? { sortOrder: toNumber(req.body.sortOrder, 0) } : {}),
        ...(req.body?.isActive !== undefined ? { isActive: Boolean(req.body.isActive) } : {})
    };

    const doc = await Membership.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    if (!doc) {
        return res.status(404).json({ message: 'Membership not found' });
    }

    res.status(200).json({ success: true, data: doc });
});

const deleteMembership = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await Membership.findByIdAndDelete(id);
    if (!deleted) {
        return res.status(404).json({ message: 'Membership not found' });
    }
    res.status(200).json({ success: true, data: deleted });
});

module.exports = {
    listMemberships,
    listAllMemberships,
    createMembership,
    updateMembership,
    deleteMembership
};
