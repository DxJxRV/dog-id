const express = require('express');
const router = express.Router();
const medicationLogController = require('../controllers/medicationLogController');
const { authenticateUser, authenticateUserOrVet } = require('../middlewares/auth');
const { validateUUIDParam } = require('../utils/validators');

// Registrar/desmarcar medicamento tomado (Owner)
router.post(
  '/medication-logs',
  authenticateUser,
  medicationLogController.logMedication
);

// Obtener logs de hoy (Owner)
router.get(
  '/medication-logs/today',
  authenticateUser,
  medicationLogController.getTodayLogs
);

// Obtener adherencia de una mascota (Vet o Owner)
router.get(
  '/pets/:petId/adherence',
  authenticateUserOrVet,
  validateUUIDParam('petId'),
  medicationLogController.getPetAdherence
);

module.exports = router;
