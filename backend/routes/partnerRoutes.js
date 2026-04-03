const express = require('express');
const { getNearbyPartners } = require('../controllers/partnerController');

const router = express.Router();

router.get('/nearby', getNearbyPartners);

module.exports = router;
