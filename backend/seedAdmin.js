const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const { mongoUri } = require('./config/env');

mongoose.connect(mongoUri)
.then(async () => {
    const existingAdmin = await Admin.findOne({
        $or: [{ email: 'admin@magicpoint.com' }, { username: 'SuperAdmin' }]
    });
    if (!existingAdmin) {
        await Admin.create({
            username: 'SuperAdmin',
            email: 'admin@magicpoint.com',
            password: 'admin123' // हे नंतर बदलून घे
        });
        console.log("Admin User Created!");
    } else {
        console.log(
            `Admin already exists (username: ${existingAdmin.username}, email: ${existingAdmin.email}).`
        );
    }
    await mongoose.connection.close();
    process.exit(0);
})
.catch(async (err) => {
    console.log(err);
    await mongoose.connection.close();
    process.exit(1);
});
