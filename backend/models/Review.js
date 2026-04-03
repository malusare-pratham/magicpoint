const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        partnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Partner',
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        userName: {
            type: String,
            trim: true,
            default: 'Customer'
        },
        userLocation: {
            type: String,
            trim: true,
            default: 'India'
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        visitMonth: {
            type: String,
            trim: true
        },
        visitWith: {
            type: String,
            trim: true
        },
        title: {
            type: String,
            trim: true,
            maxlength: 50
        },
        text: {
            type: String,
            trim: true,
            minlength: 125,
            maxlength: 1000
        },
        photos: {
            type: [String],
            default: []
        },
        likes: {
            type: Number,
            default: 0,
            min: 0
        },
        likedBy: {
            type: [String],
            default: []
        },
        agree: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
