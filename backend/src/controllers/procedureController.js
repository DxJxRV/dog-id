const prisma = require('../utils/prisma');
const { uploadPrivateImage, deletePrivateImage } = require('../services/s3Service');

// Tipos de procedimientos permitidos
const ALLOWED_PROCEDURES = [
  'desparasitacion',
  'limpieza_dental',
  'cirugia',
  'chequeo_general',
  'radiografia',
  'otro'
];

// Crear un nuevo procedimiento
const createProcedure = async (req, res) => {
  try {
    const petId = req.params.petId;
    const { tipo, descripcion, fecha } = req.body;

    // Obtener el ID del veterinario si es un vet quien lo crea
    let vetId = null;
    if (req.user.type === 'vet') {
      vetId = req.user.id;
    }

    // Validar campos requeridos
    if (!tipo || !descripcion) {
      return res.status(400).json({ error: 'Tipo and descripcion are required' });
    }

    // Validar tipo de procedimiento
    if (!ALLOWED_PROCEDURES.includes(tipo)) {
      return res.status(400).json({
        error: 'Invalid procedure type',
        allowedTypes: ALLOWED_PROCEDURES
      });
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

    // Procesar evidencia si existe y subirla a S3 privado
    let evidenciaUrl = null;
    if (req.file) {
      evidenciaUrl = await uploadPrivateImage(req.file.buffer, req.file.originalname, 'medical/procedures');
    }

    // Crear procedimiento
    const procedure = await prisma.procedure.create({
      data: {
        petId,
        vetId,
        tipo,
        descripcion,
        fecha: fecha ? new Date(fecha) : new Date(),
        evidenciaUrl
      },
      include: {
        vet: vetId ? {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true,
            telefono: true
          }
        } : false
      }
    });

    res.status(201).json({
      message: 'Procedure created successfully',
      procedure
    });
  } catch (error) {
    console.error('Create procedure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Obtener todos los procedimientos de una mascota
const getPetProcedures = async (req, res) => {
  try {
    const petId = req.params.petId;

    // Verificar que la mascota existe
    let pet;
    if (req.user.type === 'user') {
      // Si es usuario, verificar que le pertenece
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

    const procedures = await prisma.procedure.findMany({
      where: { petId },
      include: {
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true,
            telefono: true
          }
        }
      },
      orderBy: { fecha: 'desc' }
    });

    // No se presignan URLs aquí porque no se muestran las evidencias en este endpoint
    res.json({
      procedures
    });
  } catch (error) {
    console.error('Get pet procedures error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Actualizar un procedimiento (solo quien lo creó)
const updateProcedure = async (req, res) => {
  try {
    const procedureId = req.params.id;
    const { tipo, descripcion, fecha } = req.body;

    // Buscar el procedimiento con información de la mascota
    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
      include: { pet: true }
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    // Verificar permisos
    if (req.user.type === 'vet') {
      // Si es vet, solo puede editar si él lo creó
      if (procedure.vetId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. You can only edit your own procedures.' });
      }
    } else if (req.user.type === 'user') {
      // Si es usuario, solo puede editar si le pertenece la mascota y no tiene vetId
      if (procedure.pet.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      if (procedure.vetId !== null) {
        return res.status(403).json({ error: 'Cannot edit procedures created by veterinarians.' });
      }
    }

    // Validar tipo si se proporciona
    if (tipo && !ALLOWED_PROCEDURES.includes(tipo)) {
      return res.status(400).json({
        error: 'Invalid procedure type',
        allowedTypes: ALLOWED_PROCEDURES
      });
    }

    // Actualizar procedimiento
    const updatedProcedure = await prisma.procedure.update({
      where: { id: procedureId },
      data: {
        tipo: tipo || procedure.tipo,
        descripcion: descripcion || procedure.descripcion,
        fecha: fecha ? new Date(fecha) : procedure.fecha
      },
      include: {
        vet: procedure.vetId ? {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true,
            telefono: true
          }
        } : false
      }
    });

    res.json({
      message: 'Procedure updated successfully',
      procedure: updatedProcedure
    });
  } catch (error) {
    console.error('Update procedure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Eliminar un procedimiento (solo quien lo creó)
const deleteProcedure = async (req, res) => {
  try {
    const procedureId = req.params.id;

    // Buscar el procedimiento con información de la mascota
    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
      include: { pet: true }
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    // Verificar permisos
    if (req.user.type === 'vet') {
      // Si es vet, solo puede eliminar si él lo creó
      if (procedure.vetId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. You can only delete your own procedures.' });
      }
    } else if (req.user.type === 'user') {
      // Si es usuario, solo puede eliminar si le pertenece la mascota y no tiene vetId
      if (procedure.pet.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      if (procedure.vetId !== null) {
        return res.status(403).json({ error: 'Cannot delete procedures created by veterinarians.' });
      }
    }

    // Eliminar procedimiento
    await prisma.procedure.delete({
      where: { id: procedureId }
    });

    res.json({
      message: 'Procedure deleted successfully'
    });
  } catch (error) {
    console.error('Delete procedure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Completar un borrador de procedimiento (convertir de DRAFT a COMPLETED)
const completeDraftProcedure = async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, fecha } = req.body;

    console.log('✅ [DRAFT] Completing draft procedure:', id);

    // Verificar que el procedimiento existe y es borrador
    const procedure = await prisma.procedure.findUnique({
      where: { id },
      include: { pet: true }
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    if (procedure.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Procedure is not a draft' });
    }

    // Verificar permisos
    if (req.user.type === 'vet' && procedure.vetId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validar campo obligatorio
    if (!descripcion) {
      return res.status(400).json({ error: 'Descripcion is required' });
    }

    let evidenciaUrl = procedure.evidenciaUrl;

    // Si se subió nueva evidencia, actualizarla
    if (req.file) {
      // Eliminar evidencia anterior si existía
      if (procedure.evidenciaUrl) {
        try {
          await deletePrivateImage(procedure.evidenciaUrl);
        } catch (deleteError) {
          console.error('⚠️ Failed to delete old evidence:', deleteError);
        }
      }

      // Subir nueva evidencia
      evidenciaUrl = await uploadPrivateImage(req.file.buffer, req.file.originalname, 'medical/procedures');
    }

    // Actualizar a COMPLETED
    const updatedProcedure = await prisma.procedure.update({
      where: { id },
      data: {
        descripcion,
        fecha: fecha ? new Date(fecha) : procedure.fecha,
        evidenciaUrl,
        status: 'COMPLETED'
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

    console.log('✅ [DRAFT] Procedure completed successfully');

    res.json({
      message: 'Draft procedure completed successfully',
      procedure: updatedProcedure
    });
  } catch (error) {
    console.error('❌ [DRAFT] Complete error:', error);
    res.status(500).json({ error: 'Failed to complete draft procedure' });
  }
};

// Eliminar un borrador de procedimiento (descartar sugerencia de IA)
const deleteDraftProcedure = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ [DRAFT] Deleting draft procedure:', id);

    // Verificar que el procedimiento existe y es borrador
    const procedure = await prisma.procedure.findUnique({
      where: { id }
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    if (procedure.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Can only delete draft procedures' });
    }

    // Verificar permisos
    if (req.user.type === 'vet' && procedure.vetId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Eliminar
    await prisma.procedure.delete({
      where: { id }
    });

    console.log('✅ [DRAFT] Draft procedure deleted successfully');

    res.json({ message: 'Draft procedure deleted successfully' });
  } catch (error) {
    console.error('❌ [DRAFT] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete draft procedure' });
  }
};

module.exports = {
  createProcedure,
  getPetProcedures,
  updateProcedure,
  deleteProcedure,
  completeDraftProcedure,
  deleteDraftProcedure
};
