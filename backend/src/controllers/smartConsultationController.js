const prisma = require('../utils/prisma');
const { uploadPrivateFile } = require('../services/s3Service');
const { processVeterinaryAudio } = require('../services/openaiService');
const fs = require('fs');
const path = require('path');

/**
 * Crear una consulta inteligente con transcripción y análisis de IA
 * POST /pets/:petId/smart-consultations
 */
const createSmartConsultation = async (req, res) => {
  let tempFilePath = null;

  try {
    const { petId } = req.params;
    const vetId = req.user.id;

    // Validar que es un veterinario
    if (req.user.type !== 'vet') {
      return res.status(403).json({ error: 'Only veterinarians can create smart consultations' });
    }

    // Validar que se subió un archivo de audio
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    console.log('🎤 [SMART CONSULTATION] Starting creation process...');
    console.log('📋 [SMART CONSULTATION] Pet ID:', petId);
    console.log('👨‍⚕️ [SMART CONSULTATION] Vet ID:', vetId);
    console.log('🎵 [SMART CONSULTATION] Audio file:', req.file.filename);

    // Verificar que la mascota existe
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: {
        id: true,
        nombre: true,
        especie: true
      }
    });

    if (!pet) {
      // Eliminar archivo temporal
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Pet not found' });
    }

    tempFilePath = req.file.path;

    // Paso 1: Procesar el audio con OpenAI (Transcripción + Análisis)
    console.log('🤖 [SMART CONSULTATION] Processing audio with OpenAI...');
    const aiResult = await processVeterinaryAudio(
      tempFilePath,
      pet.nombre,
      pet.especie
    );

    // Paso 2: Subir audio a S3
    console.log('☁️ [SMART CONSULTATION] Uploading audio to S3...');
    const audioS3Key = await uploadPrivateFile(
      tempFilePath,
      `consultations/audio/${petId}/${Date.now()}-${req.file.originalname}`
    );

    // Paso 3: Guardar en base de datos
    console.log('💾 [SMART CONSULTATION] Saving to database...');
    const smartConsultation = await prisma.smartConsultation.create({
      data: {
        petId,
        vetId,
        audioUrl: audioS3Key,
        duration: Math.round(aiResult.duration || 0),
        rawText: aiResult.rawText,
        transcriptionJson: aiResult.transcriptionJson,
        summary: aiResult.summary,
        extractedVitals: aiResult.extractedVitals,
        tags: aiResult.tags
      },
      include: {
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true
          }
        }
      }
    });

    // Limpiar archivo temporal
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    console.log('✅ [SMART CONSULTATION] Created successfully:', smartConsultation.id);

    res.status(201).json({
      message: 'Smart consultation created successfully',
      consultation: smartConsultation
    });
  } catch (error) {
    console.error('❌ [SMART CONSULTATION] Creation error:', error);

    // Limpiar archivo temporal en caso de error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError);
      }
    }

    res.status(500).json({ error: 'Failed to create smart consultation', details: error.message });
  }
};

/**
 * Obtener todas las consultas inteligentes de una mascota
 * GET /pets/:petId/smart-consultations
 */
const getPetSmartConsultations = async (req, res) => {
  try {
    const { petId } = req.params;

    console.log('📋 [SMART CONSULTATION] Fetching consultations for pet:', petId);

    // Verificar acceso a la mascota
    const pet = await prisma.pet.findFirst({
      where: {
        id: petId,
        OR: [
          { userId: req.user.type === 'user' ? req.user.id : undefined },
          { coOwners: { some: { userId: req.user.type === 'user' ? req.user.id : undefined } } },
          { linkedVets: { some: { vetId: req.user.type === 'vet' ? req.user.id : undefined } } }
        ]
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found or access denied' });
    }

    // Obtener consultas
    const consultations = await prisma.smartConsultation.findMany({
      where: { petId },
      include: {
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ [SMART CONSULTATION] Found', consultations.length, 'consultations');

    res.json({ consultations });
  } catch (error) {
    console.error('❌ [SMART CONSULTATION] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch consultations' });
  }
};

/**
 * Obtener una consulta inteligente específica
 * GET /smart-consultations/:id
 */
const getSmartConsultationById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 [SMART CONSULTATION] Fetching consultation:', id);

    const consultation = await prisma.smartConsultation.findUnique({
      where: { id },
      include: {
        pet: {
          select: {
            id: true,
            nombre: true,
            especie: true,
            raza: true,
            fotoUrl: true
          }
        },
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true,
            telefono: true
          }
        }
      }
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Verificar acceso
    const hasAccess = req.user.type === 'vet'
      ? consultation.vetId === req.user.id
      : await prisma.pet.findFirst({
          where: {
            id: consultation.petId,
            OR: [
              { userId: req.user.id },
              { coOwners: { some: { userId: req.user.id } } }
            ]
          }
        });

    if (!hasAccess && req.user.type === 'user') {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('✅ [SMART CONSULTATION] Consultation found');

    res.json({ consultation });
  } catch (error) {
    console.error('❌ [SMART CONSULTATION] Fetch by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch consultation' });
  }
};

/**
 * Eliminar una consulta inteligente
 * DELETE /smart-consultations/:id
 */
const deleteSmartConsultation = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ [SMART CONSULTATION] Deleting consultation:', id);

    // Verificar que existe y que el vet es el dueño
    const consultation = await prisma.smartConsultation.findUnique({
      where: { id }
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    if (req.user.type !== 'vet' || consultation.vetId !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator vet can delete this consultation' });
    }

    await prisma.smartConsultation.delete({
      where: { id }
    });

    console.log('✅ [SMART CONSULTATION] Deleted successfully');

    res.json({ message: 'Consultation deleted successfully' });
  } catch (error) {
    console.error('❌ [SMART CONSULTATION] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete consultation' });
  }
};

module.exports = {
  createSmartConsultation,
  getPetSmartConsultations,
  getSmartConsultationById,
  deleteSmartConsultation
};
