const Partner = require('../models/Partner');
const PartnersInfo = require('../models/PartnersInfo');
const Admin = require('../models/Admin');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Bill = require('../models/Bill');
const BillApprovalRequest = require('../models/BillApprovalRequest');
const fs = require('fs/promises');
const path = require('path');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

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

const toAbsoluteUploadPath = (rawPath) => {
    const normalized = String(rawPath || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.?\//, '')
        .replace(/^backend\//i, '');
    const relative = normalized.startsWith('uploads/')
        ? normalized
        : `uploads/${normalized.split('/').pop()}`;
    return path.resolve(__dirname, '..', relative);
};

const migrateLocalImageToCloud = async (rawPath) => {
    if (!rawPath || /^https?:\/\//i.test(String(rawPath))) return rawPath;
    if (!isCloudinaryConfigured) return null;

    const absolutePath = toAbsoluteUploadPath(rawPath);
    try {
        await fs.access(absolutePath);
    } catch (_error) {
        return null;
    }

    const uploaded = await cloudinary.uploader.upload(absolutePath, {
        folder: 'magicpoint',
        resource_type: 'auto'
    });
    return uploaded?.secure_url || uploaded?.url || null;
};

exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: admin._id, role: 'admin' },
            process.env.JWT_SECRET || 'your_secret_key',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Admin Login Successful',
            token,
            admin: { id: admin._id, username: admin.username, email: admin.email }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.partnerLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const partner = await Partner.findOne({ email });

        if (!partner) {
            return res.status(401).json({ message: 'Partner not found' });
        }

        if (partner.status !== 'Active') {
            return res.status(403).json({ message: 'Your account is not active. Please contact admin.' });
        }

        const isMatch = await bcrypt.compare(password, partner.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: partner._id, role: 'partner' },
            process.env.JWT_SECRET || 'your_secret_key',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Partner Login Successful',
            token,
            partner: {
                id: partner._id,
                name: partner.restaurantName,
                email: partner.email,
                businessStatus: partner.businessStatus,
                businessCategory: partner.businessCategory,
                platformCommission: partner.platformCommission,
                totalDiscount: partner.totalDiscount,
                customerDiscount: partner.customerDiscount,
                area: partner.area,
                resImage: partner.resImage
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.addPartner = async (req, res) => {
    try {
        const partnerData = req.body || {};
        if (!partnerData.password) {
            return res.status(400).json({ message: 'Password is required for partner login' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(partnerData.password, salt);

        const latitude = toNumberOrUndefined(partnerData.latitude);
        const longitude = toNumberOrUndefined(partnerData.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        const allowedPayload = {
            restaurantName: partnerData.restaurantName,
            ownerName: partnerData.ownerName,
            resMobile: partnerData.resMobile,
            ownerMobile: partnerData.ownerMobile,
            email: partnerData.email,
            password: hashedPassword,
            businessCategory: partnerData.businessCategory,
            area: partnerData.area,
            totalDiscount: Number(partnerData.totalDiscount || 0),
            customerDiscount: Number(partnerData.customerDiscount || 0),
            platformCommission: Number(partnerData.platformCommission || 0),
            location: {
                type: 'Point',
                coordinates: [longitude, latitude]
            }
        };

        if (req.file) {
            allowedPayload.resImage = await toUploadedUrl(req, req.file);
        }

        const newPartner = new Partner(allowedPayload);
        await newPartner.save();
        res.status(201).json({ message: 'Partner added successfully', newPartner });
    } catch (error) {
        res.status(400).json({ message: 'Error adding partner', error: error.message });
    }
};

exports.getAllPartners = async (req, res) => {
    try {
        const partners = await Partner.find();
        const partnerIds = partners.map((partner) => partner._id);
        const revenueStats = await Bill.aggregate([
            { $match: { partnerId: { $in: partnerIds }, status: 'Verified' } },
            {
                $group: {
                    _id: '$partnerId',
                    transactions: { $sum: 1 },
                    revenue: { $sum: { $ifNull: ['$billAmount', 0] } }
                }
            }
        ]);
        const revenueMap = revenueStats.reduce((acc, row) => {
            acc[String(row._id)] = {
                transactions: Number(row.transactions || 0),
                revenue: Number(row.revenue || 0)
            };
            return acc;
        }, {});
        const shapedPartners = await Promise.all(partners.map(async (partner) => {
            const item = partner.toObject();
            const stats = revenueMap[String(partner._id)] || { transactions: 0, revenue: 0 };
            const migratedUrl = await migrateLocalImageToCloud(item.resImage);
            if (migratedUrl && migratedUrl !== item.resImage) {
                item.resImage = migratedUrl;
                await Partner.findByIdAndUpdate(partner._id, { $set: { resImage: migratedUrl } });
            }
            item.imageUrl = buildImageUrl(req, item.resImage);
            item.transactions = stats.transactions;
            item.revenue = stats.revenue;
            return item;
        }));
        res.status(200).json(shapedPartners);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching partners' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updatedPartner = await Partner.findByIdAndUpdate(id, { status }, { new: true });
        res.status(200).json({ message: `Partner is now ${status}`, updatedPartner });
    } catch (error) {
        res.status(400).json({ message: 'Error updating status' });
    }
};

exports.deletePartner = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPartner = await Partner.findByIdAndDelete(id);

        if (!deletedPartner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        res.status(200).json({ message: 'Partner deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting partner' });
    }
};

exports.getPartnerTransactions = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const transactions = await Bill.find({ partnerId, status: 'Verified' }).sort({ createdAt: -1 });

        let totalRevenue = 0;
        let totalDiscount = 0;

        transactions.forEach((bill) => {
            totalRevenue += Number(bill.billAmount) || 0;
            totalDiscount += Number(bill.discountAmount) || 0;
        });

        res.status(200).json({
            transactions,
            stats: {
                revenue: totalRevenue,
                discounts: totalDiscount,
                customers: transactions.length,
                avgBill: transactions.length > 0 ? Math.round(totalRevenue / transactions.length) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
};

exports.getPartnerDashboardStats = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const fromRaw = String(req.query?.from || '').trim();
        const toRaw = String(req.query?.to || '').trim();

        const parseYyyyMmDd = (value) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
            const [y, m, d] = value.split('-').map((x) => Number(x));
            if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
            const date = new Date(y, m - 1, d, 0, 0, 0, 0);
            if (Number.isNaN(date.getTime())) return null;
            return date;
        };

        const startDate = parseYyyyMmDd(fromRaw);
        const endDate = parseYyyyMmDd(toRaw);
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'from and to are required in YYYY-MM-DD format' });
        }

        const normalizedStart = startDate <= endDate ? startDate : endDate;
        const normalizedEnd = startDate <= endDate ? endDate : startDate;

        const endExclusive = new Date(normalizedEnd);
        endExclusive.setDate(endExclusive.getDate() + 1);

        const rangeMs = endExclusive.getTime() - normalizedStart.getTime();
        const previousEndExclusive = new Date(normalizedStart);
        const previousStart = new Date(normalizedStart.getTime() - rangeMs);

        const makeStats = async (rangeStart, rangeEndExclusive) => {
            const bills = await Bill.find({
                partnerId,
                status: 'Verified',
                createdAt: { $gte: rangeStart, $lt: rangeEndExclusive }
            }).select('billAmount discountAmount userId');

            let revenue = 0;
            let discounts = 0;
            const customerIds = new Set();

            bills.forEach((bill) => {
                revenue += Number(bill.billAmount) || 0;
                discounts += Number(bill.discountAmount) || 0;
                if (bill.userId) customerIds.add(String(bill.userId));
            });

            const totalTransactions = bills.length;
            const customers = customerIds.size;
            const avgBill = totalTransactions > 0 ? Math.round(revenue / totalTransactions) : 0;

            return {
                revenue,
                discounts,
                customers,
                totalTransactions,
                avgBill
            };
        };

        const [current, previous] = await Promise.all([
            makeStats(normalizedStart, endExclusive),
            makeStats(previousStart, previousEndExclusive)
        ]);

        const previousRevenue = Number(previous?.revenue) || 0;
        const currentRevenue = Number(current?.revenue) || 0;
        const revenueChangePercent = previousRevenue === 0
            ? (currentRevenue > 0 ? 100 : 0)
            : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

        const rangeFrom = fromRaw <= toRaw ? fromRaw : toRaw;
        const rangeTo = fromRaw <= toRaw ? toRaw : fromRaw;

        return res.status(200).json({
            range: { from: rangeFrom, to: rangeTo },
            current,
            previous,
            changes: {
                revenuePercent: revenueChangePercent
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching partner dashboard stats', error: error.message });
    }
};

exports.getPartnerPendingBills = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const pendingBills = await BillApprovalRequest.find({ partnerId, status: 'Pending' }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, pendingBills });
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching pending bills', error: error.message });
    }
};

exports.reviewPartnerPendingBill = async (req, res) => {
    try {
        const { partnerId, billId } = req.params;
        const decision = String(req.body?.decision || '').toLowerCase();
        if (!['approve', 'reject'].includes(decision)) {
            return res.status(400).json({ message: 'decision must be approve or reject' });
        }

        const requestDoc = await BillApprovalRequest.findOne(
            { _id: billId, partnerId, status: 'Pending' },
        );

        if (!requestDoc) {
            return res.status(404).json({ message: 'Pending bill not found' });
        }

        if (decision === 'reject') {
            requestDoc.status = 'Rejected';
            await requestDoc.save();
            return res.status(200).json({ success: true, request: requestDoc });
        }

        const bill = await Bill.create({
            partnerId: requestDoc.partnerId,
            userId: requestDoc.userId,
            userName: requestDoc.userName,
            billAmount: Number(requestDoc.billAmount) || 0,
            discountAmount: Number(requestDoc.discountAmount) || 0,
            status: 'Verified'
        });

        requestDoc.status = 'Verified';
        requestDoc.billId = bill._id;
        await requestDoc.save();

        return res.status(200).json({ success: true, bill, request: requestDoc });
    } catch (error) {
        return res.status(500).json({ message: 'Error reviewing pending bill', error: error.message });
    }
};

exports.updatePartnerBusinessStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { businessStatus } = req.body;

        if (!['OPEN', 'CLOSED'].includes(businessStatus)) {
            return res.status(400).json({ message: 'businessStatus must be OPEN or CLOSED' });
        }

        const updatedPartner = await Partner.findByIdAndUpdate(
            id,
            { businessStatus },
            { new: true }
        );

        if (!updatedPartner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        res.status(200).json({
            message: `Business status updated to ${businessStatus}`,
            partner: {
                id: updatedPartner._id,
                name: updatedPartner.restaurantName,
                email: updatedPartner.email,
                businessStatus: updatedPartner.businessStatus
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating business status', error: error.message });
    }
};

const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
            return [];
        }
    }
    return [];
};

const toObject = (value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        } catch (_error) {
            return null;
        }
    }
    return null;
};

const toStringOrUndefined = (value) => {
    if (value === undefined || value === null) return undefined;
    const str = String(value).trim();
    return str.length ? str : '';
};

const toNumberOrUndefined = (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
};

const resolveUploadedFiles = async (req) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const byField = {};
    for (const file of files) {
        const key = String(file.fieldname || '').trim();
        if (!key) continue;
        if (!byField[key]) byField[key] = [];
        const uploadedUrl = await toUploadedUrl(req, file);
        if (uploadedUrl) byField[key].push(uploadedUrl);
    }
    return byField;
};

const mapMenuItems = (items, uploadedByField) =>
    toArray(items).map((entry) => {
        const item = entry && typeof entry === 'object' ? { ...entry } : {};
        const imageValue = String(item.image || '').trim();
        if (imageValue.startsWith('upload:')) {
            const uploadKey = imageValue.slice('upload:'.length);
            const uploaded = uploadedByField[uploadKey];
            item.image = Array.isArray(uploaded) && uploaded.length ? uploaded[0] : '';
        }
        return item;
    });

const mapMenuSections = (sections, uploadedByField) =>
    toArray(sections).map((entry) => {
        const section = entry && typeof entry === 'object' ? { ...entry } : {};
        const name = String(section.name || '').trim();
        return {
            name,
            items: mapMenuItems(section.items || [], uploadedByField)
        };
    }).filter((section) => section.name.length);

const mapLegacyMenuToSections = (menu) => {
    const legacyMenu = toObject(menu);
    if (!legacyMenu) return [];

    const buckets = [
        { key: 'vegMenu', name: 'Veg Menu' },
        { key: 'nonVegMenu', name: 'Non-Veg Menu' },
        { key: 'cafeMenu', name: 'Cafe Menu' }
    ];

    const normalizeItem = (item) => {
        const entry = item && typeof item === 'object' ? item : {};
        const name = String(entry.name || entry.title || '').trim();
        const description = String(entry.description || entry.desc || '').trim();
        const priceRaw = entry.price ?? entry.amount ?? entry.rate;
        const price = Number(priceRaw);
        const image = String(entry.image || entry.img || entry.photo || '').trim();

        if (!name) return null;
        return {
            name,
            description,
            price: Number.isFinite(price) ? price : 0,
            image
        };
    };

    return buckets.map((bucket) => {
        const items = toArray(legacyMenu[bucket.key])
            .map(normalizeItem)
            .filter(Boolean);
        return {
            name: bucket.name,
            items
        };
    }).filter((section) => section.items.length);
};

exports.getPartnerInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const info = await PartnersInfo.findOne({ partnerId: id }).lean();

        if (!info) {
            return res.status(200).json({ success: true, data: null });
        }

        if ((!Array.isArray(info.menuSections) || info.menuSections.length === 0) && info.menu) {
            const legacySections = mapLegacyMenuToSections(info.menu);
            const updated = await PartnersInfo.findOneAndUpdate(
                { partnerId: id },
                { $set: { menuSections: legacySections }, $unset: { menu: 1 } },
                { new: true }
            ).lean();
            return res.status(200).json({ success: true, data: updated || info });
        }

        return res.status(200).json({ success: true, data: info });
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching partner info', error: error.message });
    }
};

exports.upsertPartnerInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const uploadedByField = await resolveUploadedFiles(req);
        const uploadedPhotos = uploadedByField.photoFiles || [];
        const uploadedVideos = uploadedByField.videoFiles || [];
        const uploadedInterior = uploadedByField.interiorFiles || [];
        const uploadedFood = uploadedByField.foodFiles || [];
        const uploadedMenuImages = uploadedByField.menuFiles || [];
        const uploadedOtherImages = uploadedByField.otherFiles || [];
        const hasPhotosPayload = Object.prototype.hasOwnProperty.call(req.body, 'photos');
        const hasVideosPayload = Object.prototype.hasOwnProperty.call(req.body, 'videos');
        const hasInteriorPayload = Object.prototype.hasOwnProperty.call(req.body, 'interiorImages');
        const hasFoodPayload = Object.prototype.hasOwnProperty.call(req.body, 'foodImages');
        const hasMenuImagesPayload = Object.prototype.hasOwnProperty.call(req.body, 'menuImages');
        const hasOtherImagesPayload = Object.prototype.hasOwnProperty.call(req.body, 'otherImages');
        const existingPhotos = hasPhotosPayload ? toArray(req.body.photos) : [];
        const existingVideos = hasVideosPayload ? toArray(req.body.videos) : [];
        const existingInterior = hasInteriorPayload ? toArray(req.body.interiorImages) : [];
        const existingFood = hasFoodPayload ? toArray(req.body.foodImages) : [];
        const existingMenuImages = hasMenuImagesPayload ? toArray(req.body.menuImages) : [];
        const existingOtherImages = hasOtherImagesPayload ? toArray(req.body.otherImages) : [];
        const hasMenuSectionsPayload = Object.prototype.hasOwnProperty.call(req.body, 'menuSections');
        const hasLegacyMenuPayload = Object.prototype.hasOwnProperty.call(req.body, 'menu');
        const legacyMenuSections = hasLegacyMenuPayload ? mapLegacyMenuToSections(req.body.menu) : [];

        const payload = {
            logo: (uploadedByField.logoFile && uploadedByField.logoFile[0]) || toStringOrUndefined(req.body.logo),
            email: toStringOrUndefined(req.body.email),
            memberSince: toStringOrUndefined(req.body.memberSince),
            restaurantName: toStringOrUndefined(req.body.restaurantName),
            subtitle: toStringOrUndefined(req.body.subtitle),
            foodType: toStringOrUndefined(req.body.foodType),
            description: toStringOrUndefined(req.body.description),
            rating: toNumberOrUndefined(req.body.rating),
            location: toStringOrUndefined(req.body.location),
            openTime: toStringOrUndefined(req.body.openTime),
            closeTime: toStringOrUndefined(req.body.closeTime),
            callNumber: toStringOrUndefined(req.body.callNumber),
            directionLink: toStringOrUndefined(req.body.directionLink),
            menuSections: hasMenuSectionsPayload
                ? mapMenuSections(req.body.menuSections, uploadedByField)
                : (legacyMenuSections.length ? legacyMenuSections : undefined),
            interiorImages: (hasInteriorPayload || uploadedInterior.length) ? [...existingInterior, ...uploadedInterior] : undefined,
            foodImages: (hasFoodPayload || uploadedFood.length) ? [...existingFood, ...uploadedFood] : undefined,
            menuImages: (hasMenuImagesPayload || uploadedMenuImages.length) ? [...existingMenuImages, ...uploadedMenuImages] : undefined,
            otherImages: (hasOtherImagesPayload || uploadedOtherImages.length) ? [...existingOtherImages, ...uploadedOtherImages] : undefined,
            photos: (hasPhotosPayload || uploadedPhotos.length) ? [...existingPhotos, ...uploadedPhotos] : undefined,
            videos: (hasVideosPayload || uploadedVideos.length) ? [...existingVideos, ...uploadedVideos] : undefined
        };

        const cleanedPayload = Object.fromEntries(
            Object.entries(payload).filter(([, value]) => value !== undefined)
        );

        const doc = await PartnersInfo.findOneAndUpdate(
            { partnerId: id },
            {
                $set: cleanedPayload,
                $setOnInsert: { partnerId: id },
                $unset: { menu: 1 }
            },
            { new: true, upsert: true, runValidators: true }
        );

        const partnerSyncPayload = {};
        if (Object.prototype.hasOwnProperty.call(cleanedPayload, 'restaurantName')) {
            partnerSyncPayload.restaurantName = cleanedPayload.restaurantName;
        }

        if (Object.keys(partnerSyncPayload).length > 0) {
            await Partner.findByIdAndUpdate(id, { $set: partnerSyncPayload });
        }

        return res.status(200).json({ success: true, data: doc });
    } catch (error) {
        return res.status(400).json({ message: 'Error saving partner info', error: error.message });
    }
};

exports.getAdminDashboardStats = async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ lastLoginAt: -1, lastSeen: -1, createdAt: -1 })
            .select('name email mobileNumber lastLoginAt lastSeen isOnline createdAt')
            .lean();

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const revenueAgg = await Bill.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $ifNull: ['$billAmount', 0] } },
                    totalDiscount: { $sum: { $ifNull: ['$discountAmount', 0] } },
                    totalTransactions: { $sum: 1 }
                }
            }
        ]);

        const totals = revenueAgg[0] || {
            totalRevenue: 0,
            totalDiscount: 0,
            totalTransactions: 0
        };

        const todayAgg = await Bill.aggregate([
            { $match: { createdAt: { $gte: todayStart } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $ifNull: ['$billAmount', 0] } },
                    totalDiscount: { $sum: { $ifNull: ['$discountAmount', 0] } },
                    totalTransactions: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$userId' },
                    uniquePartners: { $addToSet: '$partnerId' }
                }
            }
        ]);

        const todayTotals = todayAgg[0] || {
            totalRevenue: 0,
            totalDiscount: 0,
            totalTransactions: 0,
            uniqueUsers: [],
            uniquePartners: []
        };

        const userAgg = await Bill.aggregate([
            {
                $group: {
                    _id: '$userId',
                    totalTransactions: { $sum: 1 },
                    totalSavings: { $sum: { $ifNull: ['$discountAmount', 0] } },
                    totalSpent: { $sum: { $ifNull: ['$billAmount', 0] } }
                }
            }
        ]);

        const userStats = userAgg.reduce((acc, item) => {
            acc[String(item._id)] = {
                totalTransactions: item.totalTransactions || 0,
                totalSavings: item.totalSavings || 0,
                totalSpent: item.totalSpent || 0
            };
            return acc;
        }, {});

        res.status(200).json({
            stats: {
                loggedInUsers: users.length,
                totalRevenue: totals.totalRevenue,
                totalDiscount: totals.totalDiscount,
                netRevenue: totals.totalRevenue - totals.totalDiscount,
                totalTransactions: totals.totalTransactions,
                todayActiveUsers: todayTotals.uniqueUsers.length,
                todayActivePartners: todayTotals.uniquePartners.length,
                todayRevenue: todayTotals.totalRevenue,
                todayDiscount: todayTotals.totalDiscount,
                todayNetRevenue: todayTotals.totalRevenue - todayTotals.totalDiscount,
                todayTransactions: todayTotals.totalTransactions
            },
            userStats,
            users: users.map((user) => {
                const stat = userStats[String(user._id)] || {};
                return {
                    id: user._id,
                    name: user.name,
                    email: user.email || '-',
                    mobile: user.mobileNumber,
                    lastLoginAt: user.lastLoginAt || user.lastSeen || user.createdAt,
                    lastSeen: user.lastSeen || null,
                    isOnline: user.isOnline === true,
                    createdAt: user.createdAt,
                    transactions: stat.totalTransactions || 0,
                    totalSaved: stat.totalSavings || 0
                };
            })
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin dashboard stats', error: error.message });
    }
};

exports.deleteLoggedInUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        return res.status(400).json({ message: 'Error deleting user', error: error.message });
    }
};
