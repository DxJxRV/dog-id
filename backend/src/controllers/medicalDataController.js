const prisma = require('../utils/prisma');

/**
 * Agregar datos médicos a un procedimiento
 * Solo veterinarios
 */
const createMedicalData = async (req, res) => {
  try {
    const { procedureId } = req.params;
    const {
      peso,
      temperatura,
      frecuenciaCardiaca,
      frecuenciaRespiratoria,
      pulso,
      mucosas,
      tllc,
      hidratacion,
      condicionCorporal,
      ayuno,
      notas
    } = req.body;

    // Verificar que el usuario es veterinario
    if (req.user.type !== 'vet') {
      return res.status(403).json({ error: 'Only veterinarians can add medical data' });
    }

    // Verificar que el procedimiento existe y pertenece al vet
    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
      include: { medicalData: true }
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    if (procedure.vetId !== req.user.id) {
      return res.status(403).json({ error: 'You can only add medical data to your own procedures' });
    }

    // Verificar que no tenga datos médicos previos
    if (procedure.medicalData) {
      return res.status(400).json({ error: 'This procedure already has medical data' });
    }

    // Crear datos médicos
    const medicalData = await prisma.medicalData.create({
      data: {
        procedureId,
        peso: peso ? parseFloat(peso) : null,
        temperatura: temperatura ? parseFloat(temperatura) : null,
        frecuenciaCardiaca: frecuenciaCardiaca ? parseInt(frecuenciaCardiaca) : null,
        frecuenciaRespiratoria: frecuenciaRespiratoria ? parseInt(frecuenciaRespiratoria) : null,
        pulso,
        mucosas,
        tllc,
        hidratacion,
        condicionCorporal: condicionCorporal ? parseInt(condicionCorporal) : null,
        ayuno: ayuno === true || ayuno === 'true',
        notas
      }
    });

    res.status(201).json({
      message: 'Medical data created successfully',
      medicalData
    });
  } catch (error) {
    console.error('Create medical data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Obtener historial médico de una mascota (peso en el tiempo, etc.)
 */
const getPetMedicalHistory = async (req, res) => {
  try {
    const { petId } = req.params;

    // Verificar que la mascota existe y el usuario tiene acceso
    let pet;
    if (req.user.type === 'user') {
      pet = await prisma.pet.findFirst({
        where: {
          id: petId,
          OR: [
            { userId: req.user.id },
            {
              coOwners: {
                some: { userId: req.user.id }
              }
            }
          ]
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

    // Obtener todos los procedimientos con datos médicos
    const procedures = await prisma.procedure.findMany({
      where: { petId },
      include: {
        medicalData: true,
        vet: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: { fecha: 'asc' }
    });

    // Filtrar solo los que tienen datos médicos
    const medicalHistory = procedures
      .filter(p => p.medicalData)
      .map(p => ({
        fecha: p.fecha,
        procedureId: p.id,
        tipo: p.tipo,
        peso: p.medicalData.peso,
        temperatura: p.medicalData.temperatura,
        frecuenciaCardiaca: p.medicalData.frecuenciaCardiaca,
        frecuenciaRespiratoria: p.medicalData.frecuenciaRespiratoria,
        pulso: p.medicalData.pulso,
        mucosas: p.medicalData.mucosas,
        tllc: p.medicalData.tllc,
        hidratacion: p.medicalData.hidratacion,
        condicionCorporal: p.medicalData.condicionCorporal,
        ayuno: p.medicalData.ayuno,
        notas: p.medicalData.notas,
        veterinario: p.vet?.nombre
      }));

    res.json({
      medicalHistory
    });
  } catch (error) {
    console.error('Get medical history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Obtener evolución de peso de una mascota
 */
const getPetWeightEvolution = async (req, res) => {
  try {
    const { petId } = req.params;
    console.log('🔍 [WEIGHT EVOLUTION] Starting request');
    console.log('📋 [WEIGHT EVOLUTION] Pet ID:', petId);
    console.log('👤 [WEIGHT EVOLUTION] User:', {
      id: req.user.id,
      type: req.user.type
    });

    // Primero verificar que la mascota existe
    const pet = await prisma.pet.findUnique({
      where: { id: petId }
    });

    console.log('🐕 [WEIGHT EVOLUTION] Pet found?', !!pet);
    if (pet) {
      console.log('🐕 [WEIGHT EVOLUTION] Pet details:', {
        id: pet.id,
        nombre: pet.nombre,
        userId: pet.userId
      });
    }

    if (!pet) {
      console.log('❌ [WEIGHT EVOLUTION] Pet not found, returning 404');
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Verificar permisos según tipo de usuario
    if (req.user.type === 'user') {
      console.log('👤 [WEIGHT EVOLUTION] User type is USER, checking permissions');
      // El usuario debe ser dueño o co-dueño
      const isOwner = pet.userId === req.user.id;
      console.log('👤 [WEIGHT EVOLUTION] Is owner?', isOwner);

      const isCoOwner = await prisma.coOwnerPetLink.findFirst({
        where: {
          userId: req.user.id,
          petId
        }
      });
      console.log('👤 [WEIGHT EVOLUTION] Is co-owner?', !!isCoOwner);

      if (!isOwner && !isCoOwner) {
        console.log('❌ [WEIGHT EVOLUTION] Access denied, returning 403');
        return res.status(403).json({ error: 'Access denied' });
      }
      console.log('✅ [WEIGHT EVOLUTION] Permission granted');
    } else {
      console.log('👤 [WEIGHT EVOLUTION] User type is VET, permission granted');
    }

    // Obtener datos de peso
    console.log('📊 [WEIGHT EVOLUTION] Fetching procedures with medical data');
    const procedures = await prisma.procedure.findMany({
      where: { petId },
      include: {
        medicalData: {
          select: {
            peso: true
          }
        }
      },
      orderBy: { fecha: 'asc' }
    });

    console.log('📊 [WEIGHT EVOLUTION] Total procedures found:', procedures.length);
    const proceduresWithMedicalData = procedures.filter(p => p.medicalData);
    console.log('📊 [WEIGHT EVOLUTION] Procedures with medical data:', proceduresWithMedicalData.length);
    const proceduresWithWeight = proceduresWithMedicalData.filter(p => p.medicalData.peso);
    console.log('📊 [WEIGHT EVOLUTION] Procedures with weight data:', proceduresWithWeight.length);

    const weightData = procedures
      .filter(p => p.medicalData && p.medicalData.peso)
      .map(p => ({
        fecha: p.fecha,
        peso: p.medicalData.peso
      }));

    console.log('📊 [WEIGHT EVOLUTION] Final weight data array length:', weightData.length);
    console.log('✅ [WEIGHT EVOLUTION] Returning 200 with data');

    // Siempre devolver 200 con array (vacío o con datos)
    res.json({
      weightEvolution: weightData
    });
  } catch (error) {
    console.error('❌ [WEIGHT EVOLUTION] ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createMedicalData,
  getPetMedicalHistory,
  getPetWeightEvolution
};
