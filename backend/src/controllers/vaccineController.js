const prisma = require('../utils/prisma');
const { extractTextFromImage, parseVaccineInfo } = require('../services/ocrService');
const path = require('path');

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

    // Procesar archivo (obligatorio)
    evidenciaUrl = `/uploads/vaccines/${req.file.filename}`;

    // Ejecutar OCR en la imagen para registro, pero no se usa para los campos obligatorios
    try {
      const ocrResult = await extractTextFromImage(req.file.path);
      if (ocrResult.success && ocrResult.text) {
        ocrRawText = ocrResult.text;
        ocrStatus = 'success';
      } else {
        ocrStatus = 'fail';
      }
    } catch (ocrError) {
      console.error('OCR error:', ocrError);
      ocrStatus = 'fail';
    }

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

module.exports = {
  createVaccine,
  getPetVaccines,
  updateVaccine
};
