const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticateUserOrVet } = require('../middlewares/auth');
const { validateUUIDParam } = require('../utils/validators');

// Crear o obtener prescription para una cita
router.post(
  '/appointments/:appointmentId/prescription',
  authenticateUserOrVet,
  validateUUIDParam('appointmentId'),
  prescriptionController.createOrGetPrescription
);

// Agregar medicamento individual
router.post(
  '/prescriptions/:id/items',
  authenticateUserOrVet,
  validateUUIDParam('id'),
  prescriptionController.addMedication
);

// Agregar medicamentos en batch (desde AI)
router.post(
  '/prescriptions/:id/items/batch',
  authenticateUserOrVet,
  validateUUIDParam('id'),
  prescriptionController.addMedicationsBatch
);

// Actualizar medicamento
router.put(
  '/prescriptions/items/:itemId',
  authenticateUserOrVet,
  validateUUIDParam('itemId'),
  prescriptionController.updateMedication
);

// Eliminar medicamento
router.delete(
  '/prescriptions/items/:itemId',
  authenticateUserOrVet,
  validateUUIDParam('itemId'),
  prescriptionController.removeMedication
);

// Actualizar diagnosis y notes
router.put(
  '/prescriptions/:id',
  authenticateUserOrVet,
  validateUUIDParam('id'),
  prescriptionController.updatePrescriptionDetails
);

// Obtener prescription con items
router.get(
  '/prescriptions/:id',
  authenticateUserOrVet,
  validateUUIDParam('id'),
  prescriptionController.getPrescription
);

// Finalizar prescription y generar PDF
router.post(
  '/prescriptions/:id/finalize',
  authenticateUserOrVet,
  validateUUIDParam('id'),
  prescriptionController.finalizePrescription
);

// Actualizar prescription finalizada y regenerar PDF (mantiene publicToken)
router.put(
  '/prescriptions/:id/regenerate',
  authenticateUserOrVet,
  validateUUIDParam('id'),
  prescriptionController.updatePrescription
);

module.exports = router;
