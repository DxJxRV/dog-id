const prisma = require('../utils/prisma');
// const { extractTextFromImage, parseVaccineInfo } = require('../services/ocrService'); // Deshabilitado - Tesseract no instalado en VPS
const { uploadPrivateImage, deletePrivateImage } = require('../services/s3Service');
// const path = require('path'); // No se usa mientras OCR esté deshabilitado

// Crear una nueva vacuna
const createVaccine = async (req, res) => {
  try {
    const petId = req.params.petId;
    const { nombreVacuna, lote, caducidad, fechaAplicacion } = req.body;

    // Obtener el ID del usuario o veterinario autenticado
    let vetId = null;
    if (req.user.type === 'vet') {
      vetId = req.user.id;
    }

    // Validar campos obligatorios
    if (!nombreVacuna) {
      return res.status(400).json({ error: 'Vaccine name is required' });
    }

    if (!lote) {
      return res.status(400).json({ error: 'Lote is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Evidence photo is required' });
    }

    if (!caducidad) {
      return res.status(400).json({ error: 'Expiration date is required' });
    }

    if (!fechaAplicacion) {
      return res.status(400).json({ error: 'Application date is required' });
    }

    // Verificar que la mascota existe
    let pet;
    if (req.user.type === 'user') {
      // Si es usuario, verificar que la mascota le pertenece
      pet = await prisma.pet.findFirst({
        where: {
          id: petId,
          userId: req.user.id
        }
      });
    } else if (req.user.type === 'vet') {
      // Si es veterinario, solo verificar que existe
      pet = await prisma.pet.findUnique({
        where: { id: petId }
      });
    }

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    let ocrRawText = null;
    let ocrStatus = 'manual';
    let evidenciaUrl = null;

    // Subir imagen a S3 privado (obligatorio)
    evidenciaUrl = await uploadPrivateImage(req.file.buffer, req.file.originalname, 'medical/vaccines');

    // ===== OCR DESHABILITADO - Tesseract no instalado en VPS =====
    // Usando texto estático por ahora
    ocrRawText = 'OCR processing disabled - static placeholder text';
    ocrStatus = 'manual';

    // ===== CÓDIGO ORIGINAL COMENTADO =====
    // // Ejecutar OCR en la imagen para registro
    // // Nota: Tesseract necesita un archivo físico, así que guardamos temporalmente
    // try {
    //   const fs = require('fs');
    //   const os = require('os');
    //   const tempPath = path.join(os.tmpdir(), `vaccine-${Date.now()}-${req.file.originalname}`);
    //
    //   // Guardar temporalmente
    //   fs.writeFileSync(tempPath, req.file.buffer);
    //
    //   // Ejecutar OCR
    //   const ocrResult = await extractTextFromImage(tempPath);
    //
    //   // Eliminar archivo temporal
    //   fs.unlinkSync(tempPath);
    //
    //   if (ocrResult.success && ocrResult.text) {
    //     ocrRawText = ocrResult.text;
    //     ocrStatus = 'success';
    //   } else {
    //     ocrStatus = 'fail';
    //   }
    // } catch (ocrError) {
    //   console.error('OCR error:', ocrError);
    //   ocrStatus = 'fail';
    // }
    // ===== FIN CÓDIGO COMENTADO =====

    // Crear registro de vacuna
    const vaccine = await prisma.vaccine.create({
      data: {
        petId,
        vetId,
        nombreVacuna,
        lote: lote.trim(),
        caducidad: new Date(caducidad),
        fechaAplicacion: new Date(fechaAplicacion),
        evidenciaUrl,
        ocrRawText,
        ocrStatus
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

    res.status(201).json({
      message: 'Vaccine created successfully',
      vaccine
    });
  } catch (error) {
    console.error('Create vaccine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Obtener todas las vacunas de una mascota
const getPetVaccines = async (req, res) => {
  try {
    const petId = req.params.petId;

    // Verificar que la mascota existe y pertenece al usuario
    let pet;
    if (req.user.type === 'user') {
      pet = await prisma.pet.findFirst({
        where: {
          id: petId,
          userId: req.user.id
        }
      });
    } else if (req.user.type === 'vet') {
      pet = await prisma.pet.findUnique({
        where: { id: petId }
      });
    }

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    const vaccines = await prisma.vaccine.findMany({
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

    // No se presignan URLs aquí porque no se muestran las evidencias en este endpoint
    res.json({
      vaccines
    });
  } catch (error) {
    console.error('Get pet vaccines error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Actualizar información de una vacuna (manual override)
const updateVaccine = async (req, res) => {
  try {
    const vaccineId = req.params.id;
    const { nombreVacuna, lote, caducidad } = req.body;

    // Buscar la vacuna
    const vaccine = await prisma.vaccine.findUnique({
      where: { id: vaccineId },
      include: { pet: true }
    });

    if (!vaccine) {
      return res.status(404).json({ error: 'Vaccine not found' });
    }

    // Verificar permisos
    if (req.user.type === 'user' && vaccine.pet.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Actualizar vacuna
    const updatedVaccine = await prisma.vaccine.update({
      where: { id: vaccineId },
      data: {
        nombreVacuna: nombreVacuna || vaccine.nombreVacuna,
        lote: lote !== undefined ? lote : vaccine.lote,
        caducidad: caducidad ? new Date(caducidad) : vaccine.caducidad,
        ocrStatus: 'manual' // Marcar como editado manualmente
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

    res.json({
      message: 'Vaccine updated successfully',
      vaccine: updatedVaccine
    });
  } catch (error) {
    console.error('Update vaccine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Obtener registros borrador (DRAFT) de una mascota
const getDraftRecords = async (req, res) => {
  try {
    const { petId } = req.params;

    console.log('📋 [DRAFT] Fetching draft records for pet:', petId);

    // Verificar acceso a la mascota
    let petQuery = {
      id: petId,
    };

    if (req.user.type === 'user') {
      petQuery.OR = [
        { userId: req.user.id },
        { coOwners: { some: { userId: req.user.id } } }
      ];
    } else if (req.user.type === 'vet') {
      petQuery.OR = [
        { linkedVets: { some: { vetId: req.user.id } } },
        { createdByVetId: req.user.id }
      ];
    }

    const pet = await prisma.pet.findFirst({
      where: petQuery
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found or access denied' });
    }

    // Obtener vacunas borrador
    const draftVaccines = await prisma.vaccine.findMany({
      where: {
        petId,
        status: 'DRAFT'
      },
      include: {
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true
          }
        },
        smartConsultation: {
          select: {
            id: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener procedimientos borrador
    const draftProcedures = await prisma.procedure.findMany({
      where: {
        petId,
        status: 'DRAFT'
      },
      include: {
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true
          }
        },
        smartConsultation: {
          select: {
            id: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ [DRAFT] Found', draftVaccines.length, 'draft vaccines and', draftProcedures.length, 'draft procedures');

    res.json({
      draftVaccines,
      draftProcedures
    });
  } catch (error) {
    console.error('❌ [DRAFT] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch draft records' });
  }
};

// Completar un borrador de vacuna (convertir de DRAFT a COMPLETED)
const completeDraftVaccine = async (req, res) => {
  try {
    const { id } = req.params;
    const { lote, caducidad, fechaAplicacion } = req.body;

    console.log('✅ [DRAFT] Completing draft vaccine:', id);

    // Verificar que la vacuna existe y es borrador
    const vaccine = await prisma.vaccine.findUnique({
      where: { id },
      include: { pet: true }
    });

    if (!vaccine) {
      return res.status(404).json({ error: 'Vaccine not found' });
    }

    if (vaccine.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Vaccine is not a draft' });
    }

    // Verificar permisos
    if (req.user.type === 'vet' && vaccine.vetId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validar campos obligatorios
    if (!lote || !caducidad || !fechaAplicacion) {
      return res.status(400).json({ error: 'Lote, caducidad, and fechaAplicacion are required' });
    }

    let evidenciaUrl = vaccine.evidenciaUrl;

    // Si se subió nueva evidencia, actualizarla
    if (req.file) {
      // Eliminar evidencia anterior si existía
      if (vaccine.evidenciaUrl) {
        try {
          await deletePrivateImage(vaccine.evidenciaUrl);
        } catch (deleteError) {
          console.error('⚠️ Failed to delete old evidence:', deleteError);
        }
      }

      // Subir nueva evidencia
      evidenciaUrl = await uploadPrivateImage(req.file.buffer, req.file.originalname, 'medical/vaccines');
    }

    // Actualizar a COMPLETED
    const updatedVaccine = await prisma.vaccine.update({
      where: { id },
      data: {
        lote: lote.trim(),
        caducidad: new Date(caducidad),
        fechaAplicacion: new Date(fechaAplicacion),
        evidenciaUrl,
        status: 'COMPLETED',
        ocrStatus: 'manual'
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

    console.log('✅ [DRAFT] Vaccine completed successfully');

    res.json({
      message: 'Draft vaccine completed successfully',
      vaccine: updatedVaccine
    });
  } catch (error) {
    console.error('❌ [DRAFT] Complete error:', error);
    res.status(500).json({ error: 'Failed to complete draft vaccine' });
  }
};

// Eliminar un borrador de vacuna (descartar sugerencia de IA)
const deleteDraftVaccine = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ [DRAFT] Deleting draft vaccine:', id);

    // Verificar que la vacuna existe y es borrador
    const vaccine = await prisma.vaccine.findUnique({
      where: { id }
    });

    if (!vaccine) {
      return res.status(404).json({ error: 'Vaccine not found' });
    }

    if (vaccine.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Can only delete draft vaccines' });
    }

    // Verificar permisos
    if (req.user.type === 'vet' && vaccine.vetId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Eliminar
    await prisma.vaccine.delete({
      where: { id }
    });

    console.log('✅ [DRAFT] Draft vaccine deleted successfully');

    res.json({ message: 'Draft vaccine deleted successfully' });
  } catch (error) {
    console.error('❌ [DRAFT] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete draft vaccine' });
  }
};

module.exports = {
  createVaccine,
  getPetVaccines,
  updateVaccine,
  getDraftRecords,
  completeDraftVaccine,
  deleteDraftVaccine
};
