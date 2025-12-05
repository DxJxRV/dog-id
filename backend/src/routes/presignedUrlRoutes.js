const express = require('express');
const { generatePresignedUrlEndpoint } = require('../controllers/presignedUrlController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Generar presigned URL para un key de S3
router.post('/presigned-url', authenticateToken, generatePresignedUrlEndpoint);

module.exports = router;
