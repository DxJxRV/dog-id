const express = require('express');
const router = express.Router();
const { authenticateUserOrVet } = require('../middlewares/auth');
const {
  createProcedureConsent,
  createVaccineConsent,
  getConsent,
  getLegalTexts
} = require('../controllers/consentController');

// Crear consentimiento para procedimiento
router.post('/consents/procedure/:procedureId', authenticateUserOrVet, createProcedureConsent);

// Crear consentimiento para vacuna
router.post('/consents/vaccine/:vaccineId', authenticateUserOrVet, createVaccineConsent);

// Obtener un consentimiento
router.get('/consents/:id', authenticateUserOrVet, getConsent);

// Obtener textos legales disponibles
router.get('/legal-texts', getLegalTexts);

module.exports = router;
