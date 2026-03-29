const express = require('express');
const {
    listMemberships,
    listAllMemberships,
    createMembership,
    updateMembership,
    deleteMembership
} = require('../controllers/membershipController');

const router = express.Router();

router.get('/', listMemberships);
router.get('/all', listAllMemberships);
router.post('/', createMembership);
router.put('/:id', updateMembership);
router.delete('/:id', deleteMembership);

module.exports = router;
