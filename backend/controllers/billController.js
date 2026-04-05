const fs = require('fs/promises');
const Bill = require('../models/Bill');
const BillApprovalRequest = require('../models/BillApprovalRequest');
const Partner = require('../models/Partner');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const removeLocalFile = async (filePath) => {
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
    } catch (_error) {
        // Best effort cleanup.
    }
};

const toUploadedUrl = async (req, file) => {
    if (!file) return null;
    const filePath = file.path;

    if (isCloudinaryConfigured && filePath) {
        try {
            const uploaded = await cloudinary.uploader.upload(filePath, {
                folder: 'magicpoint',
                resource_type: 'auto'
            });
            return uploaded?.secure_url || uploaded?.url || null;
        } finally {
            await removeLocalFile(filePath);
        }
    }

    return `${req.protocol}://${req.get('host')}/${String(filePath || '').replace(/\\/g, '/')}`;
};

const toTransactionId = (billId) => `TXN${String(billId || '').slice(-8).toUpperCase()}`;
const toTransactionPayload = (bill, partner) => ({
    id: bill._id,
    transactionId: toTransactionId(bill._id),
    partner: partner?.restaurantName || 'Partner Restaurant',
    partnerId: partner?._id || bill.partnerId,
    category: partner?.businessCategory || 'Food & Dining',
    originalAmount: Number(bill.billAmount) || 0,
    discount: Number(bill.discountAmount) || 0,
    discountPercent: Number(bill.billAmount) > 0
        ? Math.round((Number(bill.discountAmount) / Number(bill.billAmount)) * 10000) / 100
        : 0,
    finalAmount: (Number(bill.billAmount) || 0) - (Number(bill.discountAmount) || 0),
    billImage: bill.billImage || '',
    status: bill.status || 'Pending',
    dateTime: bill.createdAt
});

exports.createBill = async (req, res) => {
    try {
        const { partnerId, billAmount, discountAmount, approvalMode } = req.body;

        if (!partnerId) {
            return res.status(400).json({ message: 'partnerId is required' });
        }
        const numericBillAmount = Number(billAmount);
        if (!Number.isFinite(numericBillAmount) || numericBillAmount <= 0) {
            return res.status(400).json({ message: 'billAmount must be greater than 0' });
        }
        const partner = await Partner.findById(partnerId).lean();
        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        const uploadedImage = req.file ? await toUploadedUrl(req, req.file) : '';
        const numericDiscount = Number(discountAmount);
        const safeDiscount = Number.isFinite(numericDiscount) && numericDiscount >= 0
            ? numericDiscount
            : Math.round(numericBillAmount * 0.1 * 100) / 100;

        // Backward compatibility: when frontend falls back to /bills from verify-otp,
        // still create a pending partner-approval request instead of auto-verifying.
        if (String(approvalMode || '').toLowerCase() === 'partnerapproval') {
            const approvalRequest = await BillApprovalRequest.create({
                partnerId,
                userId: req.user._id,
                userName: req.user.name,
                billAmount: numericBillAmount,
                discountAmount: safeDiscount,
                billImage: uploadedImage,
                status: 'Pending'
            });

            return res.status(201).json({
                success: true,
                message: 'Approval request sent to partner',
                transaction: {
                    id: approvalRequest._id,
                    partner: partner.restaurantName || 'Partner Restaurant',
                    partnerId: partner._id,
                    category: partner.businessCategory || 'Food & Dining',
                    originalAmount: approvalRequest.billAmount,
                    discount: approvalRequest.discountAmount,
                    discountPercent: approvalRequest.billAmount > 0
                        ? Math.round((approvalRequest.discountAmount / approvalRequest.billAmount) * 10000) / 100
                        : 0,
                    finalAmount: approvalRequest.billAmount - approvalRequest.discountAmount,
                    billImage: approvalRequest.billImage,
                    status: approvalRequest.status,
                    dateTime: approvalRequest.createdAt
                }
            });
        }

        const bill = await Bill.create({
            partnerId,
            userId: req.user._id,
            userName: req.user.name,
            billAmount: numericBillAmount,
            discountAmount: safeDiscount,
            billImage: uploadedImage,
            status: 'Verified'
        });

        return res.status(201).json({
            success: true,
            transaction: toTransactionPayload(bill, partner)
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error saving bill', error: error.message });
    }
};

exports.createBillApprovalRequest = async (req, res) => {
    try {
        const { partnerId, billAmount, discountAmount } = req.body;

        if (!partnerId) {
            return res.status(400).json({ message: 'partnerId is required' });
        }
        const numericBillAmount = Number(billAmount);
        if (!Number.isFinite(numericBillAmount) || numericBillAmount <= 0) {
            return res.status(400).json({ message: 'billAmount must be greater than 0' });
        }
        const partner = await Partner.findById(partnerId).lean();
        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        const uploadedImage = req.file ? await toUploadedUrl(req, req.file) : '';
        const numericDiscount = Number(discountAmount);
        const safeDiscount = Number.isFinite(numericDiscount) && numericDiscount >= 0
            ? numericDiscount
            : Math.round(numericBillAmount * 0.1 * 100) / 100;

        const approvalRequest = await BillApprovalRequest.create({
            partnerId,
            userId: req.user._id,
            userName: req.user.name,
            billAmount: numericBillAmount,
            discountAmount: safeDiscount,
            billImage: uploadedImage,
            status: 'Pending'
        });

        return res.status(201).json({
            success: true,
            message: 'Approval request sent to partner',
            transaction: {
                id: approvalRequest._id,
                partner: partner.restaurantName || 'Partner Restaurant',
                partnerId: partner._id,
                category: partner.businessCategory || 'Food & Dining',
                originalAmount: approvalRequest.billAmount,
                discount: approvalRequest.discountAmount,
                discountPercent: approvalRequest.billAmount > 0
                    ? Math.round((approvalRequest.discountAmount / approvalRequest.billAmount) * 10000) / 100
                    : 0,
                finalAmount: approvalRequest.billAmount - approvalRequest.discountAmount,
                billImage: approvalRequest.billImage,
                status: approvalRequest.status,
                dateTime: approvalRequest.createdAt
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error creating approval request', error: error.message });
    }
};

exports.getBillStatus = async (req, res) => {
    try {
        const { billId } = req.params;
        const approvalRequest = await BillApprovalRequest.findOne({ _id: billId, userId: req.user._id })
            .populate('partnerId', 'restaurantName businessCategory')
            .populate('billId')
            .lean();

        if (!approvalRequest) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        const partner = approvalRequest.partnerId;
        const approvedBill = approvalRequest.billId;

        const transaction = approvedBill
            ? toTransactionPayload(approvedBill, partner)
            : {
                id: approvalRequest._id,
                transactionId: `REQ${String(approvalRequest._id || '').slice(-8).toUpperCase()}`,
                partner: partner?.restaurantName || 'Partner Restaurant',
                partnerId: partner?._id || approvalRequest.partnerId,
                category: partner?.businessCategory || 'Food & Dining',
                originalAmount: Number(approvalRequest.billAmount) || 0,
                discount: Number(approvalRequest.discountAmount) || 0,
                discountPercent: Number(approvalRequest.billAmount) > 0
                    ? Math.round((Number(approvalRequest.discountAmount) / Number(approvalRequest.billAmount)) * 10000) / 100
                    : 0,
                finalAmount: (Number(approvalRequest.billAmount) || 0) - (Number(approvalRequest.discountAmount) || 0),
                billImage: approvalRequest.billImage || '',
                status: approvalRequest.status || 'Pending',
                dateTime: approvalRequest.createdAt
            };

        return res.status(200).json({
            success: true,
            transaction
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching bill status', error: error.message });
    }
};

exports.getMyTransactions = async (req, res) => {
    try {
        const bills = await Bill.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('partnerId', 'restaurantName businessCategory')
            .lean();

        const transactions = bills.map((bill) => ({
            id: bill._id,
            transactionId: toTransactionId(bill._id),
            partner: bill?.partnerId?.restaurantName || 'Partner Restaurant',
            category: bill?.partnerId?.businessCategory || 'Food & Dining',
            originalAmount: Number(bill.billAmount) || 0,
            discount: Number(bill.discountAmount) || 0,
            finalAmount: (Number(bill.billAmount) || 0) - (Number(bill.discountAmount) || 0),
            billImage: bill.billImage || '',
            status: bill.status || 'Pending',
            dateTime: bill.createdAt
        }));

        const stats = transactions.reduce(
            (acc, item) => {
                acc.totalSavings += item.discount;
                acc.totalTransactions += 1;
                return acc;
            },
            { totalSavings: 0, totalTransactions: 0 }
        );

        const avgSavings = stats.totalTransactions > 0
            ? Math.round((stats.totalSavings / stats.totalTransactions) * 100) / 100
            : 0;

        return res.status(200).json({
            success: true,
            stats: {
                totalSavings: stats.totalSavings,
                totalTransactions: stats.totalTransactions,
                avgSavings
            },
            transactions
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
};
