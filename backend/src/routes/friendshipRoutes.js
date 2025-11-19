const express = require('express');
const router = express.Router();
const friendshipController = require('../controllers/friendshipController');
const { authenticateUser } = require('../middlewares/auth');
const { validateUUIDParam } = require('../utils/validators');

// Obtener código de amistad del usuario
router.get('/friend-code', authenticateUser, friendshipController.getFriendCode);

// Enviar solicitud de amistad usando código
router.post('/send-request', authenticateUser, friendshipController.sendFriendRequest);

// Obtener solicitudes de amistad pendientes
router.get('/pending', authenticateUser, friendshipController.getPendingRequests);

// Aceptar solicitud de amistad
router.post('/accept/:requestId', authenticateUser, validateUUIDParam('requestId'), friendshipController.acceptFriendRequest);

// Rechazar solicitud de amistad
router.post('/reject/:requestId', authenticateUser, validateUUIDParam('requestId'), friendshipController.rejectFriendRequest);

// Obtener lista de amigos
router.get('/friends', authenticateUser, friendshipController.getFriends);

// Eliminar amistad
router.delete('/friends/:friendshipId', authenticateUser, validateUUIDParam('friendshipId'), friendshipController.removeFriend);

// Obtener mascotas de amigos
router.get('/friends/pets', authenticateUser, friendshipController.getFriendsPets);

// Obtener contador de mascotas nuevas
router.get('/friends/new-pets-count', authenticateUser, friendshipController.getNewPetsCount);

// Marcar mascotas de amigos como vistas
router.post('/friends/mark-viewed', authenticateUser, friendshipController.markFriendshipPetsViewed);

module.exports = router;
