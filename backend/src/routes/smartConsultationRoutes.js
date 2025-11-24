const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateUserOrVet, authenticateVet } = require('../middlewares/auth');
const {
  createSmartConsultation,
  getPetSmartConsultations,
  getSmartConsultationById,
  deleteSmartConsultation
} = require('../controllers/smartConsultationController');

// Configurar Multer para subir archivos de audio
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp/'); // Carpeta temporal
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Aceptar formatos de audio comunes
  const allowedMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mp4',
    'audio/aac',
    'audio/webm',
    'audio/ogg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid audio format. Supported: MP3, WAV, M4A, AAC, WebM, OGG'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max (Whisper limit)
  },
  fileFilter: fileFilter
});

// Rutas
router.post(
  '/pets/:petId/smart-consultations',
  authenticateVet,
  upload.single('audio'),
  createSmartConsultation
);

router.get(
  '/pets/:petId/smart-consultations',
  authenticateUserOrVet,
  getPetSmartConsultations
);

router.get(
  '/smart-consultations/:id',
  authenticateUserOrVet,
  getSmartConsultationById
);

router.delete(
  '/smart-consultations/:id',
  authenticateVet,
  deleteSmartConsultation
);

module.exports = router;
