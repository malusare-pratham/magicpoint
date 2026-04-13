const mongoose = require('mongoose');

const billApprovalRequestSchema = new mongoose.Schema({
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Partner',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: { type: String, default: '' },
    billAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['Pending', 'Verified', 'Rejected'],
        default: 'Pending'
    },
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('BillApprovalRequest', billApprovalRequestSchema);

