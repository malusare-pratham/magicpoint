const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            minlength: 2,
            maxlength: 120
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        billingCycle: {
            type: String,
            trim: true,
            default: ''
        },
        durationHours: {
            type: Number,
            min: 1,
            default: 48
        },
        features: {
            type: [String],
            default: []
        },
        badge: {
            type: String,
            trim: true,
            default: ''
        },
        ctaText: {
            type: String,
            trim: true,
            default: ''
        },
        sortOrder: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Membership', membershipSchema);
