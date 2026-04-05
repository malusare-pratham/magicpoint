const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        price: { type: Number, min: 0, default: 0 },
        image: { type: String, trim: true }
    },
    { _id: false }
);

const menuSectionSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        items: { type: [menuItemSchema], default: [] }
    },
    { _id: false }
);

const partnersInfoSchema = new mongoose.Schema(
    {
        partnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Partner',
            required: true,
            unique: true,
            index: true
        },
        logo: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        memberSince: { type: String, trim: true },
        restaurantName: { type: String, trim: true },
        subtitle: { type: String, trim: true },
        foodType: { type: String, enum: ['Veg', 'Non-Veg', 'Both'], default: 'Veg' },
        description: { type: String, trim: true },
        rating: { type: Number, min: 0, max: 5, default: 0 },
        location: { type: String, trim: true },
        openTime: { type: String, trim: true },
        closeTime: { type: String, trim: true },
        callNumber: { type: String, trim: true },
        directionLink: { type: String, trim: true },
        menuSections: { type: [menuSectionSchema], default: [] },
        interiorImages: { type: [String], default: [] },
        foodImages: { type: [String], default: [] },
        menuImages: { type: [String], default: [] },
        otherImages: { type: [String], default: [] },
        photos: { type: [mongoose.Schema.Types.Mixed], default: [] },
        videos: { type: [mongoose.Schema.Types.Mixed], default: [] }
    },
    { timestamps: true }
);

module.exports = mongoose.model('PartnersInfo', partnersInfoSchema);
