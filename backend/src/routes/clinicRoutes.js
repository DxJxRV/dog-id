const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');
const { authenticateVet } = require('../middlewares/auth');

// Todas las rutas requieren autenticación y ser veterinario
// (Se asume que el middleware auth verifica el token y auth.isVet verifica el tipo)
// Si no tienes un middleware isVet separado, valida en el controlador

router.post('/clinics', authenticateVet, clinicController.createClinic);
router.get('/clinics/my', authenticateVet, clinicController.getMyClinics);
router.post('/clinics/members', authenticateVet, clinicController.addMember);

module.exports = router;
