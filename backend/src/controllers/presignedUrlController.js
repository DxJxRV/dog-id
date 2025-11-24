const { generatePresignedUrl } = require('../services/s3Service');

/**
 * Endpoint para generar una presigned URL bajo demanda
 */
const generatePresignedUrlEndpoint = async (req, res) => {
  try {
    const { key, expiresIn = 3600 } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'S3 key is required' });
    }

    const presignedUrl = await generatePresignedUrl(key, expiresIn);

    if (!presignedUrl) {
      return res.status(404).json({ error: 'Could not generate presigned URL' });
    }

    res.json({ url: presignedUrl });
  } catch (error) {
    console.error('Generate presigned URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  generatePresignedUrlEndpoint
};
