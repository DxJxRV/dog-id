const express = require('express');
const router = express.Router();
const procedureController = require('../controllers/procedureController');
const { authenticateVet, authenticateUserOrVet } = require('../middlewares/auth');
const { validateUUIDParam } = require('../utils/validators');
const multer = require('multer');
const path = require('path');

// Configurar multer para mantener archivos en memoria (se subirán a S3 privado)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 }, // 5MB default
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image and PDF files are allowed'));
  }
});

// Rutas de procedimientos
router.post('/:petId/procedures', authenticateUserOrVet, validateUUIDParam('petId'), upload.single('evidencia'), procedureController.createProcedure);
router.get('/:petId/procedures', authenticateUserOrVet, validateUUIDParam('petId'), procedureController.getPetProcedures);
router.put('/procedures/:id', authenticateUserOrVet, validateUUIDParam('id'), procedureController.updateProcedure);
router.delete('/procedures/:id', authenticateUserOrVet, validateUUIDParam('id'), procedureController.deleteProcedure);

// Rutas de borradores (DRAFT)
router.put('/procedures/:id/complete', authenticateUserOrVet, validateUUIDParam('id'), upload.single('evidencia'), procedureController.completeDraftProcedure);
router.delete('/procedures/:id/draft', authenticateUserOrVet, validateUUIDParam('id'), procedureController.deleteDraftProcedure);

module.exports = router;
