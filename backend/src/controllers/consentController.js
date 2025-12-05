const prisma = require('../utils/prisma');
const { generateConsentPdf, LEGAL_TEXTS } = require('../services/pdfService');
const { uploadPrivateImage } = require('../services/s3Service');
const fs = require('fs');

/**
 * Crear consentimiento para un procedimiento
 */
const createProcedureConsent = async (req, res) => {
  try {
    const { procedureId } = req.params;
    const {
      consentType,
      signerName,
      signerRelation,
      signatureBase64,
      emergencyContactName,
      emergencyContactPhone,
      legalTextVersion
    } = req.body;

    // Validar campos requeridos
    if (!consentType || !signerName || !signatureBase64) {
      return res.status(400).json({ error: 'consentType, signerName, and signature are required' });
    }

    // Verificar que el procedimiento existe
    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
      include: {
        pet: {
          include: {
            user: true
          }
        },
        vet: true,
        consentRecord: true
      }
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    // Verificar que no tenga consentimiento previo
    if (procedure.consentRecord) {
      return res.status(400).json({ error: 'This procedure already has a consent record' });
    }

    // Verificar permisos (dueño o veterinario)
    if (req.user.type === 'user') {
      if (procedure.pet.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Subir firma a S3
    const signatureBuffer = Buffer.from(signatureBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureUrl = await uploadPrivateImage(signatureBuffer, `signature-${Date.now()}.png`, 'legal/signatures');

    // Generar PDF
    const pdfResult = await generateConsentPdf({
      consentType,
      signerName,
      signerRelation,
      petName: procedure.pet.nombre,
      petSpecies: procedure.pet.especie,
      vetName: procedure.vet?.nombre || 'Veterinario No Asignado',
      clinicName: 'Mi Mascota Plus',
      signatureBase64,
      emergencyContactName,
      emergencyContactPhone,
      legalTextVersion: legalTextVersion || 'v1'
    });

    // Subir PDF a S3
    const pdfBuffer = fs.readFileSync(pdfResult.filepath);
    const pdfUrl = await uploadPrivateImage(pdfBuffer, `consent-${Date.now()}.pdf`, 'legal/consents');

    // Limpiar archivo local
    fs.unlinkSync(pdfResult.filepath);

    // Crear registro de consentimiento
    const consentRecord = await prisma.consentRecord.create({
      data: {
        procedureId,
        consentType,
        pdfUrl,
        signatureUrl,
        signerName,
        signerRelation,
        legalTextVersion: legalTextVersion || 'v1',
        emergencyContactName,
        emergencyContactPhone,
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    res.status(201).json({
      message: 'Consent record created successfully',
      consentRecord
    });
  } catch (error) {
    console.error('Create procedure consent error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

/**
 * Crear consentimiento para una vacuna
 */
const createVaccineConsent = async (req, res) => {
  try {
    const { vaccineId } = req.params;
    const {
      consentType,
      signerName,
      signerRelation,
      signatureBase64,
      emergencyContactName,
      emergencyContactPhone,
      legalTextVersion
    } = req.body;

    // Validar campos requeridos
    if (!consentType || !signerName || !signatureBase64) {
      return res.status(400).json({ error: 'consentType, signerName, and signature are required' });
    }

    // Verificar que la vacuna existe
    const vaccine = await prisma.vaccine.findUnique({
      where: { id: vaccineId },
      include: {
        pet: {
          include: {
            user: true
          }
        },
        vet: true,
        consentRecord: true
      }
    });

    if (!vaccine) {
      return res.status(404).json({ error: 'Vaccine not found' });
    }

    // Verificar que no tenga consentimiento previo
    if (vaccine.consentRecord) {
      return res.status(400).json({ error: 'This vaccine already has a consent record' });
    }

    // Verificar permisos
    if (req.user.type === 'user') {
      if (vaccine.pet.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Subir firma a S3
    const signatureBuffer = Buffer.from(signatureBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureUrl = await uploadPrivateImage(signatureBuffer, `signature-${Date.now()}.png`, 'legal/signatures');

    // Generar PDF
    const pdfResult = await generateConsentPdf({
      consentType,
      signerName,
      signerRelation,
      petName: vaccine.pet.nombre,
      petSpecies: vaccine.pet.especie,
      vetName: vaccine.vet?.nombre || 'Veterinario No Asignado',
      clinicName: 'Mi Mascota Plus',
      signatureBase64,
      emergencyContactName,
      emergencyContactPhone,
      legalTextVersion: legalTextVersion || 'v1'
    });

    // Subir PDF a S3
    const pdfBuffer = fs.readFileSync(pdfResult.filepath);
    const pdfUrl = await uploadPrivateImage(pdfBuffer, `consent-${Date.now()}.pdf`, 'legal/consents');

    // Limpiar archivo local
    fs.unlinkSync(pdfResult.filepath);

    // Crear registro de consentimiento
    const consentRecord = await prisma.consentRecord.create({
      data: {
        vaccineId,
        consentType,
        pdfUrl,
        signatureUrl,
        signerName,
        signerRelation,
        legalTextVersion: legalTextVersion || 'v1',
        emergencyContactName,
        emergencyContactPhone,
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    res.status(201).json({
      message: 'Consent record created successfully',
      consentRecord
    });
  } catch (error) {
    console.error('Create vaccine consent error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

/**
 * Obtener un consentimiento por ID
 */
const getConsent = async (req, res) => {
  try {
    const { id } = req.params;

    const consent = await prisma.consentRecord.findUnique({
      where: { id },
      include: {
        procedure: {
          include: {
            pet: true
          }
        },
        vaccine: {
          include: {
            pet: true
          }
        }
      }
    });

    if (!consent) {
      return res.status(404).json({ error: 'Consent record not found' });
    }

    // Verificar permisos
    const pet = consent.procedure?.pet || consent.vaccine?.pet;
    if (req.user.type === 'user') {
      if (pet.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ consent });
  } catch (error) {
    console.error('Get consent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Obtener textos legales disponibles
 */
const getLegalTexts = async (req, res) => {
  res.json({
    legalTexts: LEGAL_TEXTS
  });
};

module.exports = {
  createProcedureConsent,
  createVaccineConsent,
  getConsent,
  getLegalTexts
};
