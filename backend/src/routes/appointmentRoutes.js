const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateVet, authenticateUser, authenticateUserOrVet } = require('../middlewares/auth');

// Vet Routes
router.post('/appointments', authenticateVet, appointmentController.createAppointment);
router.get('/appointments', authenticateVet, appointmentController.getSchedule);
router.get('/appointments/requests', authenticateVet, appointmentController.getPendingRequests); // Mover antes de :id
router.put('/appointments/:id/status', authenticateVet, appointmentController.updateStatus);
router.get('/appointments/:id', authenticateVet, appointmentController.getAppointmentDetail); 
router.get('/appointments/requests', authenticateVet, appointmentController.getPendingRequests);
router.post('/appointments/:id/manage', authenticateVet, appointmentController.manageRequest);
router.post('/appointments/:id/assign-confirm', authenticateVet, appointmentController.assignAndConfirm);

// User Routes
router.post('/appointments/request', authenticateUser, appointmentController.requestAppointment);

// Shared Routes
router.get('/vets/:id/slots', authenticateUserOrVet, appointmentController.getAvailableSlots);

module.exports = router;
