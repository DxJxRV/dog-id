const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateVet } = require('../middlewares/auth');

router.post('/appointments', authenticateVet, appointmentController.createAppointment);
router.get('/appointments', authenticateVet, appointmentController.getSchedule);
router.put('/appointments/:id/status', authenticateVet, appointmentController.updateStatus);
router.get('/appointments/:id', authenticateVet, appointmentController.getAppointmentDetail);

module.exports = router;
