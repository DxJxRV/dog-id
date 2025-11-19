const express = require('express');
const router = express.Router();
const petLinkController = require('../controllers/petLinkController');
const { authenticateUser, authenticateVet, authenticateAny } = require('../middlewares/auth');
const { validateUUIDParam } = require('../utils/validators');

// Obtener código de linkeo de mascota (solo dueño)
router.get('/:id/link-code', authenticateUser, validateUUIDParam('id'), petLinkController.getPetLinkCode);

// Linkear mascota usando código (tanto usuarios como veterinarios)
router.post('/link', authenticateAny, petLinkController.linkPet);

// Deslikenar mascota (solo veterinarios)
router.delete('/:id/unlink-vet', authenticateVet, validateUUIDParam('id'), petLinkController.unlinkPetFromVet);

// Deslikenar mascota como co-dueño (solo usuarios)
router.delete('/:id/unlink-coowner', authenticateUser, validateUUIDParam('id'), petLinkController.unlinkPetAsCoOwner);

module.exports = router;
