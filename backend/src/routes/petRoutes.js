const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const { authenticateUser, authenticateUserOrVet } = require('../middlewares/auth');
const { validateUUIDParam } = require('../utils/validators');
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

// Crear mascota rápida (solo veterinarios)
router.post('/quick-create', authenticateUserOrVet, upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 }
]), petController.createQuickPet);

// Obtener código de transferencia de una mascota
router.get('/:id/transfer-code', authenticateUserOrVet, validateUUIDParam('id'), petController.getTransferCode);

// Reclamar mascota con código de transferencia (solo usuarios)
router.post('/claim', authenticateUser, petController.claimPet);

module.exports = router;
