const express = require('express');
const router = express.Router();
const vaccineController = require('../controllers/vaccineController');
const { authenticateUserOrVet } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

// Configurar multer para subida de fotos de vacunas
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/vaccines/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'vaccine-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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

// Rutas de vacunas (accesibles por usuarios y veterinarios)
router.post('/:petId/vaccines', authenticateUserOrVet, upload.single('evidencia'), vaccineController.createVaccine);
router.get('/:petId/vaccines', authenticateUserOrVet, vaccineController.getPetVaccines);
router.put('/vaccines/:id', authenticateUserOrVet, vaccineController.updateVaccine);

module.exports = router;
