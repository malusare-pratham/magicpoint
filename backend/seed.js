const Membership = require('./models/Membership');
const Partner = require('./models/Partner');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('./config/db');

const plans = [
    {
        title: 'Family Plan',
        price: 99,
        billingCycle: '2 day',
        durationHours: 48,
        badge: 'Best Value',
        ctaText: 'Select Family Plan',
        sortOrder: 2,
        features: [
            '10% discount at 500+ partners',
            'Valid for 2 Days (48 Hours)',
            'Unlimited redemptions',
            'Secure OTP verification',
            'Up to 4 family members'
        ],
        isActive: true
    },
    {
        title: 'Basic Plan',
        price: 999,
        features: ['Local Trips', '24/7 Support'],
        isActive: true
    },
    {
        title: 'Premium Plan',
        price: 2999,
        features: ['International Trips', 'Luxury Hotels'],
        isActive: true
    },
    {
        title: 'Elite Plan',
        price: 4999,
        features: ['Private Jet', 'Personal Guide'],
        isActive: true
    }
];

const demoPartners = [
    {
        restaurantName: 'Maple Leaf Cafe',
        ownerName: 'Amit Patil',
        resMobile: '9999911111',
        ownerMobile: '9999911112',
        email: 'maple.cafe@tripspotgo.demo',
        password: 'demo1234',
        businessCategory: 'Food & Dining',
        area: 'Panchgani',
        totalDiscount: 0,
        customerDiscount: 10,
        platformCommission: 0,
        status: 'Active',
        businessStatus: 'OPEN',
        location: { type: 'Point', coordinates: [73.8007, 17.9237] }
    },
    {
        restaurantName: 'Sunrise Adventure',
        ownerName: 'Neha Kulkarni',
        resMobile: '9999922221',
        ownerMobile: '9999922222',
        email: 'sunrise.adventure@tripspotgo.demo',
        password: 'demo1234',
        businessCategory: 'Activities & Adventure',
        area: 'Panchgani',
        totalDiscount: 0,
        customerDiscount: 15,
        platformCommission: 0,
        status: 'Active',
        businessStatus: 'OPEN',
        location: { type: 'Point', coordinates: [73.8080, 17.9310] }
    },
    {
        restaurantName: 'Valley Gift House',
        ownerName: 'Rohit Deshmukh',
        resMobile: '9999933331',
        ownerMobile: '9999933332',
        email: 'valley.gift@tripspotgo.demo',
        password: 'demo1234',
        businessCategory: 'Local Stores & Gift House',
        area: 'Panchgani',
        totalDiscount: 0,
        customerDiscount: 12,
        platformCommission: 0,
        status: 'Active',
        businessStatus: 'OPEN',
        location: { type: 'Point', coordinates: [73.7905, 17.9150] }
    },
    {
        restaurantName: 'Mist View Stay',
        ownerName: 'Sneha Jadhav',
        resMobile: '9999944441',
        ownerMobile: '9999944442',
        email: 'mistview.stay@tripspotgo.demo',
        password: 'demo1234',
        businessCategory: 'Stay & Hotels',
        area: 'Panchgani',
        totalDiscount: 0,
        customerDiscount: 8,
        platformCommission: 0,
        status: 'Active',
        businessStatus: 'OPEN',
        location: { type: 'Point', coordinates: [73.8122, 17.9195] }
    }
];

const seedData = async () => {
    try {
        await connectDB();

        for (const plan of plans) {
            await Membership.updateOne({ title: plan.title }, { $set: plan }, { upsert: true });
        }

        for (const partner of demoPartners) {
            const hashedPassword = await bcrypt.hash(partner.password, 10);
            const payload = { ...partner, password: hashedPassword };
            await Partner.updateOne(
                { email: partner.email },
                { $set: payload },
                { upsert: true }
            );
        }

        console.log('Membership plans and demo partners seeded successfully');
    } catch (error) {
        console.error(`Seeding failed: ${error.message}`);
        process.exitCode = 1;
    } finally {
        await disconnectDB();
    }
};

seedData();
