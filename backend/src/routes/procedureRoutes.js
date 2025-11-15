const express = require('express');
const router = express.Router();
const procedureController = require('../controllers/procedureController');
const { authenticateVet, authenticateUserOrVet } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

// Configurar multer para subida de evidencia de procedimientos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/procedures/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'procedure-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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
router.post('/:petId/procedures', authenticateUserOrVet, upload.single('evidencia'), procedureController.createProcedure);
router.get('/:petId/procedures', authenticateUserOrVet, procedureController.getPetProcedures);
router.put('/procedures/:id', authenticateUserOrVet, procedureController.updateProcedure);
router.delete('/procedures/:id', authenticateUserOrVet, procedureController.deleteProcedure);

module.exports = router;
