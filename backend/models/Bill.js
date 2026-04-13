const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    // १. पार्टनरचा आयडी (ज्या हॉटेलचे हे बिल आहे)
    partnerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Partner', 
        required: true 
    },
    
    // २. युजरचा आयडी (ज्याने बिल अपलोड केले आहे)
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },

    userName: { type: String }, // डॅशबोर्डवर नाव दाखवण्यासाठी
    billAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    
    status: { 
        type: String, 
        enum: ['Pending', 'Verified', 'Rejected'], 
        default: 'Pending' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
