const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');
const { authenticateVet } = require('../middlewares/auth');

// Rutas base de clínica
router.post('/clinics', authenticateVet, clinicController.createClinic);
router.get('/clinics/my', authenticateVet, clinicController.getMyClinics);

// Gestión de clínica específica
router.put('/clinics/:id', authenticateVet, clinicController.updateClinic);
router.get('/clinics/:id/staff', authenticateVet, clinicController.getClinicStaff);
router.post('/clinics/:id/staff', authenticateVet, clinicController.addMember);
// Backward compatibility for the previous route
router.post('/clinics/members', authenticateVet, clinicController.addMember);

module.exports = router;