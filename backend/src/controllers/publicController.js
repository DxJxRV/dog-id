const prisma = require('../utils/prisma');
const { generatePresignedUrl } = require('../services/s3Service');

/**
 * Acceso público a prescription por magic link
 * GET /public/prescription/:token
 * REDIRIGE DIRECTAMENTE AL PDF (comportamiento esperado del magic link)
 * No requiere autenticación
 */
const getPrescriptionByToken = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('🔗 [PUBLIC] Accessing prescription via magic link...');
    console.log('   🎫 Token:', token);

    // Buscar prescription por public token (solo campos necesarios)
    const prescription = await prisma.prescription.findUnique({
      where: { publicToken: token },
      select: {
        id: true,
        status: true,
        pdfUrl: true,
        tokenExpiresAt: true
      }
    });

    if (!prescription) {
      console.log('   ❌ Prescription not found');
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Verificar que esté finalizada
    if (prescription.status !== 'FINALIZED') {
      console.log('   ❌ Prescription is not finalized');
      return res.status(403).json({ error: 'Prescription is not available' });
    }

    // Verificar expiración del token si está configurada
    if (prescription.tokenExpiresAt && new Date() > prescription.tokenExpiresAt) {
      console.log('   ❌ Token expired');
      return res.status(403).json({ error: 'Link has expired' });
    }

    // Verificar que existe el PDF
    if (!prescription.pdfUrl) {
      console.log('   ❌ PDF not found');
      return res.status(404).json({ error: 'PDF not available' });
    }

    // Generar presigned URL y redirigir directamente al PDF
    const pdfUrl = await generatePresignedUrl(prescription.pdfUrl, 3600); // 1 hora

    console.log('   ✅ Redirecting to PDF...');
    console.log('   📄 PDF URL generated');

    // REDIRECCIÓN DIRECTA AL PDF
    res.redirect(pdfUrl);
  } catch (error) {
    console.error('❌ [PUBLIC] Get prescription by token error:', error);
    res.status(500).json({ error: 'Failed to access prescription', details: error.message });
  }
};

/**
 * Acceso público directo al PDF por magic link
 * GET /public/prescription/:token/pdf
 * Redirige al presigned URL del PDF
 */
const getPrescriptionPdfByToken = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('📄 [PUBLIC] Accessing PDF via magic link...');
    console.log('   🎫 Token:', token);

    // Buscar prescription por public token
    const prescription = await prisma.prescription.findUnique({
      where: { publicToken: token },
      select: {
        id: true,
        status: true,
        pdfUrl: true,
        tokenExpiresAt: true
      }
    });

    if (!prescription) {
      console.log('   ❌ Prescription not found');
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Verificar que esté finalizada
    if (prescription.status !== 'FINALIZED') {
      console.log('   ❌ Prescription is not finalized');
      return res.status(403).json({ error: 'PDF is not available' });
    }

    // Verificar expiración del token
    if (prescription.tokenExpiresAt && new Date() > prescription.tokenExpiresAt) {
      console.log('   ❌ Token expired');
      return res.status(403).json({ error: 'Link has expired' });
    }

    // Verificar que existe el PDF
    if (!prescription.pdfUrl) {
      console.log('   ❌ PDF not found');
      return res.status(404).json({ error: 'PDF not available' });
    }

    // Generar presigned URL y redirigir
    const pdfUrl = await generatePresignedUrl(prescription.pdfUrl, 3600); // 1 hora
    console.log('   ✅ Redirecting to PDF');

    res.redirect(pdfUrl);
  } catch (error) {
    console.error('❌ [PUBLIC] Get PDF by token error:', error);
    res.status(500).json({ error: 'Failed to access PDF', details: error.message });
  }
};

/**
 * Acceso público a documento compartido (SharedDocument)
 * GET /public/doc/:token
 * Sistema genérico para compartir cualquier tipo de documento
 */
const getSharedDocument = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('📄 [PUBLIC] Accessing shared document...');
    console.log('   🎫 Token:', token);

    // Buscar documento compartido
    const sharedDoc = await prisma.sharedDocument.findUnique({
      where: { publicToken: token },
      include: {
        prescription: {
          include: {
            pet: {
              select: {
                nombre: true,
                especie: true
              }
            },
            vet: {
              select: {
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!sharedDoc) {
      console.log('   ❌ Document not found');
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verificar expiración
    if (sharedDoc.expiresAt && new Date() > sharedDoc.expiresAt) {
      console.log('   ❌ Link expired');
      return res.status(403).json({ error: 'Link has expired' });
    }

    // Incrementar view count y actualizar last viewed
    await prisma.sharedDocument.update({
      where: { id: sharedDoc.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date()
      }
    });

    // Generar presigned URL
    const documentUrl = await generatePresignedUrl(sharedDoc.documentUrl, 3600); // 1 hora

    console.log('   ✅ Document accessed successfully');
    console.log('   👁️  View count:', sharedDoc.viewCount + 1);

    res.json({
      document: {
        type: sharedDoc.documentType,
        url: documentUrl,
        viewCount: sharedDoc.viewCount + 1,
        lastViewedAt: new Date()
      },
      metadata: sharedDoc.prescription ? {
        petName: sharedDoc.prescription.pet?.nombre,
        petSpecies: sharedDoc.prescription.pet?.especie,
        vetName: sharedDoc.prescription.vet?.nombre
      } : null
    });
  } catch (error) {
    console.error('❌ [PUBLIC] Get shared document error:', error);
    res.status(500).json({ error: 'Failed to access document', details: error.message });
  }
};

module.exports = {
  getPrescriptionByToken,
  getPrescriptionPdfByToken,
  getSharedDocument
};
