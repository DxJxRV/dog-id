const express = require('express');
const router = express.Router();
const { authenticateUserOrVet } = require('../middlewares/auth');
const {
  createDeathCertificate,
  getPetDeathCertificate
} = require('../controllers/deathCertificateController');

// Crear certificado de defunción (Solo veterinarios)
router.post('/death-certificates', authenticateUserOrVet, createDeathCertificate);

// Obtener certificado de defunción de una mascota
router.get('/pets/:petId/death-certificate', authenticateUserOrVet, getPetDeathCertificate);

module.exports = router;
