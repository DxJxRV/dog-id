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
router.post('/clinics/:id/staff', authenticateVet, clinicController.addMember); // Legacy/Direct Add
router.post('/clinics/:id/invite', authenticateVet, clinicController.inviteMember); // New Invite Flow
router.post('/clinics/:id/availability', authenticateVet, clinicController.toggleAvailability);

// Invitaciones para Vets
router.get('/vets/invitations', authenticateVet, clinicController.getMyInvitations);
router.post('/clinics/invitations/:id/manage', authenticateVet, clinicController.manageInvitation);

module.exports = router;
