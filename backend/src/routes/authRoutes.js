const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas de usuario (dueño)
router.post('/user/register', authController.registerUser);
router.post('/user/login', authController.loginUser);

// Rutas de veterinario
router.post('/vet/register', authController.registerVet);
router.post('/vet/login', authController.loginVet);

module.exports = router;
