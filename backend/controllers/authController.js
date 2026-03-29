const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const Membership = require('../models/Membership');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../middleware/asyncHandler');

const normalizeIdentifier = (email, mobile) => {
    if (email) {
        return { email: String(email).trim().toLowerCase() };
    }
    if (mobile) {
        const normalizedMobile = String(mobile).trim();
        return { mobileNumber: normalizedMobile };
    }
    return null;
};

const validateAndBuildUserPayload = async (rawData = {}) => {
    const { name, email, mobile, password, membershipPlan } = rawData;

    if (!name || !mobile || !password || !membershipPlan) {
        const activePlanCount = await Membership.countDocuments({ isActive: true });
        if (activePlanCount === 0) {
            const fallbackPlan = String(membershipPlan || 'Free Plan').trim() || 'Free Plan';
            const userPayload = {
                name: String(name || '').trim(),
                password: String(password || ''),
                mobileNumber: String(mobile || '').trim(),
                membershipPlan: fallbackPlan,
                ...(email ? { email: String(email).trim().toLowerCase() } : {})
            };

            if (!userPayload.name || !userPayload.mobileNumber || !userPayload.password) {
                const error = new Error('name, mobile and password are required');
                error.statusCode = 400;
                throw error;
            }

            return { userPayload, planDoc: null, hasActivePlans: false };
        }

        const error = new Error('name, mobile, password and membershipPlan are required');
        error.statusCode = 400;
        throw error;
    }

    const normalizedPlan = String(membershipPlan).trim();
    const activePlanCount = await Membership.countDocuments({ isActive: true });
    if (activePlanCount === 0) {
        const userPayload = {
            name: String(name).trim(),
            password: String(password),
            mobileNumber: String(mobile).trim(),
            membershipPlan: normalizedPlan || 'Free Plan',
            ...(email ? { email: String(email).trim().toLowerCase() } : {})
        };
        return { userPayload, planDoc: null, hasActivePlans: false };
    }

    const planDoc = await Membership.findOne({ title: normalizedPlan, isActive: true }).lean();
    if (!planDoc) {
        const error = new Error('membershipPlan is invalid or inactive');
        error.statusCode = 400;
        throw error;
    }

    const userPayload = {
        name: String(name).trim(),
        password: String(password),
        mobileNumber: String(mobile).trim(),
        membershipPlan: normalizedPlan,
        ...(email ? { email: String(email).trim().toLowerCase() } : {})
    };

    if (!/^\d{10}$/.test(userPayload.mobileNumber)) {
        const error = new Error('mobile must be a 10-digit number');
        error.statusCode = 400;
        throw error;
    }

    if (userPayload.password.length < 8) {
        const error = new Error('password must be at least 8 characters long');
        error.statusCode = 400;
        throw error;
    }

    return { userPayload, planDoc, hasActivePlans: true };
};

const findExistingUser = async (userPayload) => {
    const query = [
        { mobileNumber: userPayload.mobileNumber },
        { mobile: userPayload.mobileNumber }
    ];
    if (userPayload.email) {
        query.push({ email: userPayload.email });
    }

    return User.findOne({ $or: query });
};

const registerUser = asyncHandler(async (req, res) => {
    const { userPayload } = await validateAndBuildUserPayload(req.body || {});

    const existingUser = await findExistingUser(userPayload);
    if (existingUser) {
        const error = new Error('User already exists with the given email/mobile');
        error.statusCode = 409;
        throw error;
    }

    const user = await User.create(userPayload);
    const token = generateToken(user._id.toString());

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: user.toSafeObject()
    });
});

const createSignupOrder = asyncHandler(async (req, res) => {
    const { userPayload, planDoc } = await validateAndBuildUserPayload(req.body || {});

    const existingUser = await findExistingUser(userPayload);
    if (existingUser) {
        const error = new Error('User already exists with the given email/mobile');
        error.statusCode = 409;
        throw error;
    }

    const razorpayKeyId = String(process.env.RAZORPAY_KEY_ID || '').trim();
    const razorpayKeySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (!razorpayKeyId || !razorpayKeySecret) {
        const error = new Error('Razorpay is not configured on server');
        error.statusCode = 500;
        throw error;
    }

    if (!planDoc) {
        const error = new Error('No active membership plans available.');
        error.statusCode = 400;
        throw error;
    }

    const amountInPaise = Math.round(Number(planDoc.price) * 100);
    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
        const error = new Error('Invalid membership price');
        error.statusCode = 400;
        throw error;
    }
    const orderPayload = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `signup_${Date.now()}_${userPayload.mobileNumber}`,
        payment_capture: 1,
        notes: {
            mobile: userPayload.mobileNumber,
            membershipPlan: userPayload.membershipPlan
        }
    };

    let data;
    try {
        const orderResponse = await axios.post('https://api.razorpay.com/v1/orders', orderPayload, {
            auth: { username: razorpayKeyId, password: razorpayKeySecret },
            timeout: 15000
        });
        data = orderResponse.data;
    } catch (error) {
        if (error?.response?.status === 401) {
            const authError = new Error('Invalid Razorpay credentials on server. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render env.');
            authError.statusCode = 500;
            throw authError;
        }

        const gatewayError = new Error('Unable to create Razorpay order right now. Please try again.');
        gatewayError.statusCode = 502;
        throw gatewayError;
    }

    res.status(200).json({
        success: true,
        keyId: razorpayKeyId,
        order: data,
        amount: amountInPaise,
        currency: 'INR'
    });
});

const verifySignupPaymentAndRegister = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationData } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        const error = new Error('Missing payment verification fields');
        error.statusCode = 400;
        throw error;
    }

    const razorpayKeySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!razorpayKeySecret) {
        const error = new Error('Razorpay is not configured on server');
        error.statusCode = 500;
        throw error;
    }

    const expectedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${String(razorpay_order_id)}|${String(razorpay_payment_id)}`)
        .digest('hex');

    const signatureText = String(razorpay_signature);
    const isValidSignature =
        expectedSignature.length === signatureText.length &&
        crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signatureText));

    if (!isValidSignature) {
        const error = new Error('Payment signature verification failed');
        error.statusCode = 400;
        throw error;
    }

    const { userPayload, planDoc } = await validateAndBuildUserPayload(registrationData || {});
    if (!planDoc) {
        const error = new Error('No active membership plans available.');
        error.statusCode = 400;
        throw error;
    }
    const existingUser = await findExistingUser(userPayload);
    if (existingUser) {
        const error = new Error('User already exists with the given email/mobile');
        error.statusCode = 409;
        throw error;
    }

    const now = new Date();
    const durationHours = Number(planDoc?.durationHours) || 48;
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    const user = await User.create({
        ...userPayload,
        membershipActivatedAt: now,
        membershipExpiresAt: expiresAt
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
        success: true,
        message: 'Payment verified and user registered successfully',
        token,
        user: user.toSafeObject()
    });
});

const loginUser = asyncHandler(async (req, res) => {
    const { mobile, password } = req.body;

    if (!password || !mobile) {
        const error = new Error('mobile and password are required');
        error.statusCode = 400;
        throw error;
    }

    const normalizedMobile = String(mobile).trim();
    const identifierQuery = normalizeIdentifier(null, normalizedMobile);
    let user = await User.findOne(identifierQuery).select('+password');

    // Backward compatibility: legacy records might have `mobile` only.
    if (!user) {
        user = await User.findOne({ mobile: normalizedMobile }).select('+password');
    }

    if (!user) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }

    const isValidPassword = await user.matchPassword(String(password));
    if (!isValidPassword) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }

    const now = new Date();
    const toValidDate = (value) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const toObjectIdDate = (value) => {
        const raw = String(value || '');
        if (raw.length < 8) return null;
        const ts = Number.parseInt(raw.slice(0, 8), 16);
        if (!Number.isFinite(ts)) return null;
        const parsed = new Date(ts * 1000);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const activatedAt = toValidDate(user.membershipActivatedAt);
    const createdAt = toValidDate(user.createdAt);
    const expiresAtStored = toValidDate(user.membershipExpiresAt);
    const baseTime = activatedAt || createdAt || toObjectIdDate(user._id) || null;
    const expiryCandidate = expiresAtStored
        || (baseTime ? new Date(baseTime.getTime() + 48 * 60 * 60 * 1000) : null);

    if (!expiryCandidate || Number.isNaN(expiryCandidate.getTime())) {
        const error = new Error('Membership status not found. Please contact support.');
        error.statusCode = 403;
        throw error;
    }

    if (expiryCandidate.getTime() <= now.getTime()) {
        const error = new Error('Membership expired. Please renew to login.');
        error.statusCode = 403;
        throw error;
    }

    // Start 48hr timer only once; re-login must not reset it.
    let shouldSave = false;
    if (!user.membershipExpiresAt) {
        const startTime = activatedAt || baseTime || now;
        const expiresAt = new Date(startTime.getTime() + 48 * 60 * 60 * 1000);

        user.membershipActivatedAt = startTime;
        user.membershipExpiresAt = expiresAt;
        shouldSave = true;
    }

    user.lastLoginAt = now;
    shouldSave = true;

    if (shouldSave) {
        await user.save();
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: user.toSafeObject()
    });
});

const getProfile = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user.toSafeObject()
    });
});

module.exports = {
    registerUser,
    createSignupOrder,
    verifySignupPaymentAndRegister,
    loginUser,
    getProfile
};
