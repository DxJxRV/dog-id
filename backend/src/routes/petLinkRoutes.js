const express = require('express');
const router = express.Router();
const petLinkController = require('../controllers/petLinkController');
const { authenticateUser, authenticateVet } = require('../middlewares/auth');

// Obtener código de linkeo de mascota (solo dueño)
router.get('/:id/link-code', authenticateUser, petLinkController.getPetLinkCode);

// Linkear mascota usando código (solo veterinarios)
router.post('/link', authenticateVet, petLinkController.linkPetToVet);

// Deslikenar mascota (solo veterinarios)
router.delete('/:id/unlink', authenticateVet, petLinkController.unlinkPetFromVet);

module.exports = router;
