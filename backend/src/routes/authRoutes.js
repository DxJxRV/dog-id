const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUserOrVet } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

// Configurar multer para mantener archivos en memoria (se subirán a S3)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 }, // 5MB default
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Login unificado - detecta automáticamente si es user o vet
router.post('/login', authController.login);

// Rutas de usuario (dueño)
router.post('/user/register', authController.registerUser);
router.post('/user/login', authController.loginUser);
router.post('/user/google', authController.googleLogin);
router.post('/user/apple', authController.appleLogin);

// Rutas de veterinario
router.post('/vet/register', authController.registerVet);
router.post('/vet/login', authController.loginVet);

// Rutas de perfil (usuarios y veterinarios)
router.put('/profile/photo', authenticateUserOrVet, upload.single('foto'), authController.updateProfilePhoto);
router.put('/profile/cover', authenticateUserOrVet, upload.single('coverPhoto'), authController.updateCoverPhoto);
router.put('/profile', authenticateUserOrVet, authController.updateProfile);
router.delete('/profile', authenticateUserOrVet, authController.deleteAccount);

module.exports = router;
