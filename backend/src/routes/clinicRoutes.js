const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');
const { authenticateVet } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

// Configurar multer para imágenes del logo
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

// Rutas base de clínica
router.post('/clinics', authenticateVet, clinicController.createClinic);
router.get('/clinics/my', authenticateVet, clinicController.getMyClinics);

// Gestión de clínica específica
router.put('/clinics/:id', authenticateVet, clinicController.updateClinic);
router.put('/clinics/:id/logo', authenticateVet, upload.single('logo'), clinicController.uploadLogo);
router.get('/clinics/:id/staff', authenticateVet, clinicController.getClinicStaff);
router.post('/clinics/:id/staff', authenticateVet, clinicController.addMember); // Legacy/Direct Add
router.post('/clinics/:id/invite', authenticateVet, clinicController.inviteMember); // New Invite Flow
router.post('/clinics/:id/availability', authenticateVet, clinicController.toggleAvailability);

// Invitaciones para Vets
router.get('/vets/invitations', authenticateVet, clinicController.getMyInvitations);
router.post('/clinics/invitations/:id/manage', authenticateVet, clinicController.manageInvitation);

module.exports = router;
