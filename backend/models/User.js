const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            sparse: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
        },
        mobileNumber: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            match: [/^\d{10}$/, 'Mobile must be a 10-digit number']
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false
        },
        membershipPlan: {
            type: String,
            required: true,
            enum: ['Single Plan', 'Family Plan', 'Free Plan']
        },
        membershipActivatedAt: {
            type: Date
        },
        membershipExpiresAt: {
            type: Date
        },
        lastLoginAt: {
            type: Date
        }
    },
    {
        timestamps: true,
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    }
);

userSchema.virtual('mobile')
    .get(function getMobile() {
        return this.mobileNumber;
    })
    .set(function setMobile(value) {
        this.mobileNumber = value;
    });

userSchema.pre('save', async function hashPassword() {
    if (!this.isModified('password')) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = function matchPassword(password) {
    return bcrypt.compare(password, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
    const obj = this.toObject();
    if (!obj.mobile && obj.mobileNumber) {
        obj.mobile = obj.mobileNumber;
    }
    delete obj.password;
    delete obj.__v;
    delete obj.id;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
