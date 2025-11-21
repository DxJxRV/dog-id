const express = require('express');
const router = express.Router();
const vaccineController = require('../controllers/vaccineController');
const { authenticateUserOrVet } = require('../middlewares/auth');
const { validateUUIDParam } = require('../utils/validators');
const multer = require('multer');
const path = require('path');

// Configurar multer para mantener archivos en memoria (se subirán a S3 privado)
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

// Rutas de vacunas (accesibles por usuarios y veterinarios)
router.post('/:petId/vaccines', authenticateUserOrVet, validateUUIDParam('petId'), upload.single('evidencia'), vaccineController.createVaccine);
router.get('/:petId/vaccines', authenticateUserOrVet, validateUUIDParam('petId'), vaccineController.getPetVaccines);
router.put('/vaccines/:id', authenticateUserOrVet, validateUUIDParam('id'), vaccineController.updateVaccine);

module.exports = router;
