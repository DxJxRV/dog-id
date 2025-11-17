const express = require('express');
const router = express.Router();
const petLinkController = require('../controllers/petLinkController');
const { authenticateUser, authenticateVet } = require('../middlewares/auth');
const { validateUUIDParam } = require('../utils/validators');

// Obtener código de linkeo de mascota (solo dueño)
router.get('/:id/link-code', authenticateUser, validateUUIDParam('id'), petLinkController.getPetLinkCode);

// Linkear mascota usando código (solo veterinarios)
router.post('/link', authenticateVet, petLinkController.linkPetToVet);

// Deslikenar mascota (solo veterinarios)
router.delete('/:id/unlink', authenticateVet, validateUUIDParam('id'), petLinkController.unlinkPetFromVet);

module.exports = router;
