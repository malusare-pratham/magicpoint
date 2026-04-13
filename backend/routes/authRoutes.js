const express = require('express');
const {
    registerUser,
    createSignupOrder,
    verifySignupPaymentAndRegister,
    loginUser,
    getProfile,
    heartbeatUser,
    logoutUser
} = require('../controllers/authController');
const { createBill, createBillApprovalRequest, getBillStatus, getMyTransactions } = require('../controllers/billController');
const protect = require('../middleware/auth');

const router = express.Router();

router.post('/signup', registerUser);
router.post('/signup/create-order', createSignupOrder);
router.post('/signup/verify-payment', verifySignupPaymentAndRegister);
router.post('/create-order', createSignupOrder);
router.post('/verify-payment', verifySignupPaymentAndRegister);
router.post('/login', loginUser);
router.get('/me', protect, getProfile);
router.post('/heartbeat', protect, heartbeatUser);
router.post('/logout', protect, logoutUser);
router.post('/bills', protect, createBill);
router.post('/bills/request', protect, createBillApprovalRequest);
router.get('/bills/:billId/status', protect, getBillStatus);
router.get('/transactions', protect, getMyTransactions);

module.exports = router;
