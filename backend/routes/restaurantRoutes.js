const express = require('express');
const upload = require('../middleware/upload');
const { getRestaurant, getPartnerReviews, likePartnerReview, createPartnerReview, deletePartnerReview } = require('../controllers/restaurantController');

const router = express.Router();

router.get('/', getRestaurant);
router.get('/:partnerId/reviews', getPartnerReviews);
router.post('/:partnerId/reviews/:reviewId/like', likePartnerReview);
router.post('/:partnerId/reviews', upload.array('reviewPhotos', 6), createPartnerReview);
router.delete('/:partnerId/reviews/:reviewId', deletePartnerReview);

module.exports = router;
