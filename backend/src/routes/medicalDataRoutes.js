const express = require('express');
const router = express.Router();
const { authenticateUserOrVet } = require('../middlewares/auth');
const {
  createMedicalData,
  getPetMedicalHistory,
  getPetWeightEvolution
} = require('../controllers/medicalDataController');

// Agregar datos médicos a un procedimiento (Solo vets)
router.post('/procedures/:procedureId/medical-data', authenticateUserOrVet, createMedicalData);

// Obtener historial médico completo de una mascota
router.get('/pets/:petId/medical-history', authenticateUserOrVet, getPetMedicalHistory);

// Obtener evolución de peso
router.get('/pets/:petId/evolution/weight', authenticateUserOrVet, getPetWeightEvolution);

module.exports = router;
