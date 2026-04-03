const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const Review = require('../models/Review');

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

const removeLocalFile = async (filePath) => {
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
    } catch (_error) {
        // Best effort cleanup only.
    }
};

const toUploadedUrl = async (req, file) => {
    if (!file) return null;
    const filePath = file.path;

    if (isCloudinaryConfigured && filePath) {
        const resolvedPath = path.resolve(filePath);
        try {
            const uploaded = await cloudinary.uploader.upload(resolvedPath, {
                folder: 'magicpoint',
                resource_type: 'auto'
            });
            return uploaded?.secure_url || uploaded?.url || null;
        } finally {
            await removeLocalFile(resolvedPath);
        }
    }

    return buildImageUrl(req, filePath);
};

const getRestaurant = asyncHandler(async (_req, res) => {
    const restaurant = {
        name: 'Pizza Hut',
        cuisine: 'Quick Bites',
        costForTwo: 350,
        address: 'Janpath, Connaught Place (CP), New Delhi',
        rating: 4.2,
        visits: 2319,
        contact: '+91 9643967088',
        vouchers: [
            { title: 'Gift Voucher worth Rs. 2000', price: 1840, save: '8%', soldOut: false },
            { title: 'Gift Voucher worth Rs. 1000', price: 920, save: '8%', soldOut: false },
            { title: 'Gift Voucher worth Rs. 500', price: 0, save: '0%', soldOut: true }
        ],
        popularItem: {
            name: 'Classic Onion Capsicum',
            description: 'Pizza topped with our classic pan sauce, crunchy onion...',
            price: 109
        }
    };

    res.status(200).json({
        success: true,
        data: restaurant
    });
});

const getPartnerReviews = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    if (!partnerId) {
        return res.status(400).json({ success: false, message: 'Partner id is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
        return res.status(400).json({ success: false, message: 'Invalid partner id' });
    }

    const reviews = await Review.find({ partnerId })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

    res.status(200).json({ success: true, data: reviews });
});

const likePartnerReview = asyncHandler(async (req, res) => {
    const { partnerId, reviewId } = req.params;
    const likerId = String(req.body?.userId || req.body?.likerId || '').trim();

    if (!partnerId || !reviewId) {
        return res.status(400).json({ success: false, message: 'Partner id and review id are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(partnerId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({ success: false, message: 'Invalid partner or review id' });
    }
    if (!likerId) {
        return res.status(400).json({ success: false, message: 'User id is required to like a review' });
    }

    const updated = await Review.findOneAndUpdate(
        { _id: reviewId, partnerId, likedBy: { $ne: likerId } },
        { $addToSet: { likedBy: likerId }, $inc: { likes: 1 } },
        { new: true }
    );

    if (updated) {
        return res.status(200).json({ success: true, data: updated });
    }

    const existing = await Review.findOne({ _id: reviewId, partnerId }).lean();
    if (!existing) {
        return res.status(404).json({ success: false, message: 'Review not found' });
    }

    return res.status(200).json({ success: true, data: existing, message: 'Review already liked' });
});

const createPartnerReview = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    const {
        rating,
        visitMonth,
        visitWith,
        text,
        title,
        agree,
        userId,
        userName,
        userLocation,
        photos
    } = req.body || {};

    if (!partnerId) {
        return res.status(400).json({ success: false, message: 'Partner id is required' });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const trimmedText = String(text || '').trim();
    if (!trimmedText) {
        return res.status(400).json({ success: false, message: 'Review text is required' });
    }
    if (trimmedText.length < 125) {
        return res.status(400).json({ success: false, message: 'Review text must be at least 125 characters' });
    }

    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) {
        return res.status(400).json({ success: false, message: 'Review title is required' });
    }
    if (trimmedTitle.length > 50) {
        return res.status(400).json({ success: false, message: 'Review title must be 50 characters or fewer' });
    }

    if (!agree) {
        return res.status(400).json({ success: false, message: 'Review consent is required' });
    }

    const uploadedPhotos = await Promise.all(
        (Array.isArray(req.files) ? req.files : []).map((file) => toUploadedUrl(req, file))
    );

    const review = await Review.create({
        partnerId,
        userId: userId || undefined,
        userName: String(userName || 'Customer').trim(),
        userLocation: String(userLocation || 'India').trim(),
        rating: numericRating,
        visitMonth: String(visitMonth || '').trim(),
        visitWith: String(visitWith || '').trim(),
        text: String(text || '').trim(),
        title: String(title || '').trim(),
        agree: Boolean(agree),
        photos: [
            ...(Array.isArray(photos) ? photos.filter(Boolean) : []),
            ...uploadedPhotos.filter(Boolean)
        ]
    });

    res.status(201).json({ success: true, data: review });
});

const deletePartnerReview = asyncHandler(async (req, res) => {
    const { partnerId, reviewId } = req.params;
    if (!partnerId || !reviewId) {
        return res.status(400).json({ success: false, message: 'Partner id and review id are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(partnerId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({ success: false, message: 'Invalid partner or review id' });
    }

    const review = await Review.findOneAndDelete({ _id: reviewId, partnerId });
    if (!review) {
        return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.status(200).json({ success: true, message: 'Review deleted', data: review });
});

module.exports = { getRestaurant, getPartnerReviews, likePartnerReview, createPartnerReview, deletePartnerReview };
