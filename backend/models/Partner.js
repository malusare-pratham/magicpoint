const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
    restaurantName: { type: String, required: true },
    ownerName: { type: String, required: true },
    resMobile: { type: String, required: true },
    ownerMobile: { type: String, required: true },
    resImage: { type: String },
    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },
    businessStatus: { type: String, default: 'OPEN', enum: ['OPEN', 'CLOSED'] },
    businessCategory: {
        type: String,
        enum: ['Food & Dining', 'Activities & Adventure', 'Local Stores & Gift House', 'Stay & Hotels'],
        default: 'Food & Dining'
    },

    area: { type: String, required: true },
    totalDiscount: { type: Number, default: 0 },
    customerDiscount: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Active', 'Blocked'] },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number]
        }
    }
}, { timestamps: true });

partnerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Partner', partnerSchema);
