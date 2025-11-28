const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateUser, authenticateUserOrVet } = require('../middlewares/auth');

// Rutas para usuarios (dueños)
router.get('/users/booking-home', authenticateUser, userController.getBookingHomeData);
router.post('/users/favorites', authenticateUser, userController.toggleFavorite);
router.get('/users/favorites/check', authenticateUser, userController.checkIsFavorite);

// Rutas para notificaciones (usuarios y vets)
router.get('/user/notifications', authenticateUserOrVet, userController.getUserNotifications);

module.exports = router;