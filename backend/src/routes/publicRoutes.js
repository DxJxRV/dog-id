const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

/**
 * Rutas públicas (NO requieren autenticación)
 * Todas estas rutas están bajo el prefijo /public
 */

// Acceso a prescription por magic link (devuelve JSON)
router.get('/prescription/:token', publicController.getPrescriptionByToken);

// Acceso directo al PDF por magic link (redirige)
router.get('/prescription/:token/pdf', publicController.getPrescriptionPdfByToken);

// Acceso a documento compartido genérico (SharedDocument)
router.get('/doc/:token', publicController.getSharedDocument);

module.exports = router;
