const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { deletePartnerReview } = require('../controllers/restaurantController');
const upload = require('../middleware/upload');

router.post('/login', adminController.adminLogin);
router.post('/partner-login', adminController.partnerLogin);
router.get('/dashboard-stats', adminController.getAdminDashboardStats);

router.get('/partner-transactions/:partnerId', adminController.getPartnerTransactions);
router.get('/partner-dashboard-stats/:partnerId', adminController.getPartnerDashboardStats);
router.get('/partner-pending-bills/:partnerId', adminController.getPartnerPendingBills);
router.put('/partner-pending-bills/:partnerId/:billId', adminController.reviewPartnerPendingBill);
router.put('/partner-business-status/:id', adminController.updatePartnerBusinessStatus);
router.get('/partner-info/:id', adminController.getPartnerInfo);
router.put('/partner-info/:id', upload.any(), adminController.upsertPartnerInfo);

router.post('/add-partner', upload.single('resImage'), adminController.addPartner);
router.delete('/partner-reviews/:partnerId/:reviewId', deletePartnerReview);
router.get('/partners', adminController.getAllPartners);
router.put('/update-status/:id', adminController.updateStatus);
router.delete('/delete-partner/:id', adminController.deletePartner);
router.delete('/delete-user/:id', adminController.deleteLoggedInUser);

module.exports = router;
