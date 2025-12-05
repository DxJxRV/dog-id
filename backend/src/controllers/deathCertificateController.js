const prisma = require('../utils/prisma');
const { generateDeathCertificatePdf } = require('../services/pdfService');
const { uploadPrivateImage } = require('../services/s3Service');
const fs = require('fs');

/**
 * Crear certificado de defunción (SOLO VETERINARIOS)
 */
const createDeathCertificate = async (req, res) => {
  try {
    const {
      petId,
      deathDate,
      deathType,
      causeOfDeath,
      bodyDisposal,
      disposalLocation,
      witnessName,
      witnessRelation,
      notes
    } = req.body;

    // VALIDAR QUE ES VETERINARIO
    if (req.user.type !== 'vet') {
      return res.status(403).json({ error: 'Only veterinarians can issue death certificates' });
    }

    // Validar campos requeridos
    if (!petId || !deathDate || !deathType || !causeOfDeath || !bodyDisposal) {
      return res.status(400).json({ error: 'petId, deathDate, deathType, causeOfDeath, and bodyDisposal are required' });
    }

    // Obtener datos del veterinario
    const vet = await prisma.vet.findUnique({
      where: { id: req.user.id }
    });

    // Verificar que la mascota existe
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        user: true,
        deathCertificate: true
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Verificar que no tenga certificado previo
    if (pet.deathCertificate) {
      return res.status(400).json({ error: 'This pet already has a death certificate' });
    }

    // Generar PDF del certificado
    const pdfResult = await generateDeathCertificatePdf({
      petName: pet.nombre,
      petSpecies: pet.especie,
      petBreed: pet.raza,
      ownerName: pet.user?.nombre || 'Propietario No Registrado',
      vetName: vet.nombre,
      vetLicense: vet.cedulaProfesional,
      deathDate,
      deathType,
      causeOfDeath,
      bodyDisposal,
      disposalLocation,
      witnessName,
      witnessRelation,
      clinicName: 'Mi Mascota Plus',
      notes
    });

    // Subir PDF a S3
    const pdfBuffer = fs.readFileSync(pdfResult.filepath);
    const pdfUrl = await uploadPrivateImage(pdfBuffer, `death-cert-${Date.now()}.pdf`, 'legal/death-certificates');

    // Limpiar archivo local
    fs.unlinkSync(pdfResult.filepath);

    // Crear certificado en BD
    const deathCertificate = await prisma.deathCertificate.create({
      data: {
        petId,
        vetId: req.user.id,
        deathDate: new Date(deathDate),
        deathType,
        causeOfDeath,
        bodyDisposal,
        disposalLocation,
        witnessName,
        witnessRelation,
        pdfUrl,
        notes
      },
      include: {
        pet: {
          include: {
            user: true
          }
        },
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true
          }
        }
      }
    });

    // Actualizar status del pet a DECEASED
    await prisma.pet.update({
      where: { id: petId },
      data: { status: 'DECEASED' }
    });

    res.status(201).json({
      message: 'Death certificate created successfully',
      deathCertificate
    });
  } catch (error) {
    console.error('Create death certificate error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

/**
 * Obtener certificado de defunción de una mascota
 */
const getPetDeathCertificate = async (req, res) => {
  try {
    const { petId } = req.params;

    // Verificar que la mascota existe
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        deathCertificate: {
          include: {
            vet: {
              select: {
                id: true,
                nombre: true,
                cedulaProfesional: true
              }
            }
          }
        }
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Verificar permisos
    if (req.user.type === 'user') {
      if (pet.userId !== req.user.id) {
        // Verificar si es co-dueño
        const isCoOwner = await prisma.coOwnerPetLink.findFirst({
          where: {
            userId: req.user.id,
            petId
          }
        });

        if (!isCoOwner) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
    }

    if (!pet.deathCertificate) {
      return res.status(404).json({ error: 'No death certificate found for this pet' });
    }

    res.json({
      deathCertificate: pet.deathCertificate
    });
  } catch (error) {
    console.error('Get death certificate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createDeathCertificate,
  getPetDeathCertificate
};
