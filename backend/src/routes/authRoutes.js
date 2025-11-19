const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Login unificado - detecta automáticamente si es user o vet
router.post('/login', authController.login);

// Rutas de usuario (dueño)
router.post('/user/register', authController.registerUser);
router.post('/user/login', authController.loginUser);
router.post('/user/google', authController.googleLogin);

// Rutas de veterinario
router.post('/vet/register', authController.registerVet);
router.post('/vet/login', authController.loginVet);

module.exports = router;
