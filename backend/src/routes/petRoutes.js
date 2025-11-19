const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const { authenticateUser, authenticateUserOrVet } = require('../middlewares/auth');
const { validateUUIDParam } = require('../utils/validators');
const multer = require('multer');
const path = require('path');

// Configurar multer para subida de fotos de mascotas
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/pets/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pet-' + uniqueSuffix + path.extname(file.originalname));
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

// Rutas de mascotas
// Solo usuarios pueden crear, editar y eliminar sus mascotas
router.post('/', authenticateUser, upload.single('foto'), petController.createPet);
router.put('/:id', authenticateUser, validateUUIDParam('id'), upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 }
]), petController.updatePet);
router.delete('/:id', authenticateUser, validateUUIDParam('id'), petController.deletePet);

// Usuarios y veterinarios pueden ver mascotas
router.get('/', authenticateUserOrVet, petController.getUserPets);
router.get('/archived/list', authenticateUserOrVet, petController.getArchivedPets);
router.get('/:id', authenticateUserOrVet, validateUUIDParam('id'), petController.getPetById);

// Archivar/desarchivar mascota (ambos usuarios y vets)
router.patch('/:id/archive', authenticateUserOrVet, validateUUIDParam('id'), petController.toggleArchivePet);

module.exports = router;
