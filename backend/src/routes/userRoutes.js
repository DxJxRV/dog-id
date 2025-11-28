const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateUser } = require('../middlewares/auth');

// Rutas para usuarios (dueños)
router.get('/users/booking-home', authenticateUser, userController.getBookingHomeData);
router.post('/users/favorites', authenticateUser, userController.toggleFavorite);
router.get('/users/favorites/check', authenticateUser, userController.checkIsFavorite);

module.exports = router;
