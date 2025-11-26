const prisma = require('../utils/prisma');
const path = require('path');
const { generateLinkCode } = require('../utils/linkCodeGenerator');
const { uploadPublicImage, deletePublicImage, generatePresignedUrl } = require('../services/s3Service');

// Crear una nueva mascota
const createPet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nombre, especie, raza, fechaNacimiento } = req.body;

    // Validar campos requeridos
    if (!nombre || !especie) {
      return res.status(400).json({ error: 'Nombre and especie are required' });
    }

    // Procesar foto si existe y subirla a S3
    let fotoUrl = null;
    if (req.file) {
      fotoUrl = await uploadPublicImage(req.file.buffer, req.file.originalname, 'pets/profiles');
    }

    // Generar código de linkeo único
    let linkCode;
    let isUnique = false;
    while (!isUnique) {
      linkCode = generateLinkCode();
      const existing = await prisma.pet.findUnique({
        where: { linkCode }
      });
      if (!existing) {
        isUnique = true;
      }
    }

    // Crear mascota
    const pet = await prisma.pet.create({
      data: {
        userId,
        nombre,
        especie,
        raza: raza || null,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        fotoUrl,
        linkCode
      }
    });

    res.status(201).json({
      message: 'Pet created successfully',
      pet
    });
  } catch (error) {
    console.error('Create pet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Obtener todas las mascotas (del usuario o todas si es veterinario)
const getUserPets = async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    let pets;
    let hasArchivedPets = false;

    if (userType === 'vet') {
      // Los veterinarios ven las mascotas linkeadas a ellos Y las que crearon
      const allPets = await prisma.pet.findMany({
        where: {
          OR: [
            // Mascotas linkeadas al veterinario
            {
              linkedVets: {
                some: {
                  vetId: userId
                }
              }
            },
            // Mascotas creadas por el veterinario
            {
              createdByVetId: userId
            }
          ]
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          },
          linkedVets: {
            where: {
              vetId: userId
            },
            select: {
              id: true,
              archived: true,
              createdAt: true
            }
          }
        }
      });

      // Verificar si hay mascotas archivadas por el vet
      hasArchivedPets = allPets.some(pet =>
        pet.linkedVets.length > 0 && pet.linkedVets[0].archived
      );

      // Filtrar las que no están archivadas por el vet
      pets = allPets
        .filter(pet => {
          // Mostrar si: 1) está linkeada y no archivada, O 2) fue creada por el vet
          const isLinked = pet.linkedVets.length > 0;
          const isArchived = isLinked && pet.linkedVets[0].archived;
          const isCreatedByVet = pet.createdByVetId === userId;

          return (isLinked && !isArchived) || (isCreatedByVet && !isLinked);
        })
        .map(pet => ({
          ...pet,
          isLinked: pet.linkedVets.length > 0,
          isCreatedByVet: pet.createdByVetId === userId,
          isPendingTransfer: pet.pendingTransfer,
          isArchivedByOwner: pet.archivedByOwner,
          linkedVets: undefined
        }));
    } else {
      // Verificar si el usuario tiene mascotas archivadas (propias o co-owned)
      const ownedArchivedCount = await prisma.pet.count({
        where: {
          userId,
          archivedByOwner: true
        }
      });

      const coOwnedArchivedCount = await prisma.coOwnerPetLink.count({
        where: {
          userId,
          archived: true
        }
      });

      hasArchivedPets = (ownedArchivedCount + coOwnedArchivedCount) > 0;

      // Los usuarios ven sus mascotas no archivadas Y las que son co-dueños
      const ownedPets = await prisma.pet.findMany({
        where: {
          userId,
          archivedByOwner: false
        },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Obtener mascotas donde es co-dueño
      const coOwnedPets = await prisma.pet.findMany({
        where: {
          coOwners: {
            some: {
              userId,
              archived: false
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Combinar ambas listas, marcando las co-owned
      const ownedWithFlag = ownedPets.map(pet => ({ ...pet, isCoOwner: false }));
      const coOwnedWithFlag = coOwnedPets.map(pet => ({ ...pet, isCoOwner: true }));

      pets = [...ownedWithFlag, ...coOwnedWithFlag];
    }

    res.json({
      pets,
      hasArchivedPets
    });
  } catch (error) {
    console.error('Get user pets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Obtener una mascota por ID con su historial completo
const getPetById = async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;
    const petId = req.params.id;

    let whereClause;
    if (userType === 'vet') {
      whereClause = { id: petId };  // Veterinarios pueden ver cualquier mascota
    } else {
      // Usuarios ven sus mascotas o las que son co-dueños
      whereClause = {
        id: petId,
        OR: [
          { userId },  // Es el dueño
          {
            coOwners: {
              some: { userId }  // Es co-dueño
            }
          }
        ]
      };
    }

    const includeClause = {
      user: {
        select: {
          id: true,
          nombre: true,
          email: true
        }
      },
      vaccines: {
        where: {
          status: 'COMPLETED' // Filtrar solo vacunas completadas, excluir drafts
        },
        include: {
          vet: {
            select: {
              id: true,
              nombre: true,
              cedulaProfesional: true
            }
          },
          consentRecord: {
            select: {
              id: true,
              consentType: true,
              pdfUrl: true,
              signerName: true,
              signedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      procedures: {
        where: {
          status: 'COMPLETED' // Filtrar solo procedimientos completados, excluir drafts
        },
        include: {
          vet: {
            select: {
              id: true,
              nombre: true,
              cedulaProfesional: true
            }
          },
          consentRecord: {
            select: {
              id: true,
              consentType: true,
              pdfUrl: true,
              signerName: true,
              signedAt: true
            }
          }
        },
        orderBy: { fecha: 'desc' }
      }
    };

    // Si es veterinario, incluir la relación VetPetLink para obtener el estado archived
    if (userType === 'vet') {
      includeClause.linkedVets = {
        where: {
          vetId: userId
        },
        select: {
          id: true,
          archived: true
        }
      };
    } else {
      // Si es usuario, incluir la relación CoOwnerPetLink para saber si es co-dueño
      includeClause.coOwners = {
        where: {
          userId
        },
        select: {
          id: true,
          archived: true
        }
      };
    }

    const pet = await prisma.pet.findFirst({
      where: whereClause,
      include: includeClause
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // NO generamos presigned URLs aquí para optimizar performance
    // Las URLs se generarán solo cuando se acceda al detalle específico de vacuna/procedimiento

    // Preparar la respuesta según el tipo de usuario
    let petResponse = { ...pet };

    if (userType === 'vet') {
      // Para veterinarios, agregar el campo isArchived basado en VetPetLink
      const isArchived = pet.linkedVets && pet.linkedVets.length > 0
        ? pet.linkedVets[0].archived
        : false;

      petResponse = {
        ...pet,
        isArchived,
        archived: isArchived,
        linkedVets: undefined // Remover el array linkedVets de la respuesta
      };
    } else {
      // Para usuarios normales, verificar si es dueño o co-dueño
      const isOwner = pet.userId === userId;
      const isCoOwner = pet.coOwners && pet.coOwners.length > 0;

      // Determinar estado de archivado
      let isArchived;
      if (isOwner) {
        isArchived = pet.archivedByOwner;
      } else if (isCoOwner) {
        isArchived = pet.coOwners[0].archived;
      } else {
        isArchived = false;
      }

      petResponse = {
        ...pet,
        isOwner,
        isCoOwner,
        isArchived,
        archived: isArchived,
        coOwners: undefined // Remover el array coOwners de la respuesta
      };
    }

    res.json({
      pet: petResponse
    });
  } catch (error) {
    console.error('Get pet by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Actualizar una mascota
const updatePet = async (req, res) => {
  try {
    const userId = req.user.id;
    const petId = req.params.id;
    const { nombre, especie, raza, fechaNacimiento, removeFoto, removeCoverPhoto } = req.body;

    // Verificar que la mascota pertenece al usuario
    const pet = await prisma.pet.findFirst({
      where: {
        id: petId,
        userId
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Procesar foto de perfil
    let fotoUrl = pet.fotoUrl;
    if (req.files && req.files.foto) {
      // Eliminar foto anterior si existe
      if (pet.fotoUrl) {
        await deletePublicImage(pet.fotoUrl);
      }
      // Subir nueva foto a S3
      fotoUrl = await uploadPublicImage(req.files.foto[0].buffer, req.files.foto[0].originalname, 'pets/profiles');
    } else if (req.file && !req.files) {
      // Backward compatibility: si solo se sube un archivo con el nombre 'file'
      if (pet.fotoUrl) {
        await deletePublicImage(pet.fotoUrl);
      }
      fotoUrl = await uploadPublicImage(req.file.buffer, req.file.originalname, 'pets/profiles');
    } else if (removeFoto === 'true') {
      // Si se solicita eliminar la foto
      if (pet.fotoUrl) {
        await deletePublicImage(pet.fotoUrl);
      }
      fotoUrl = null;
    }

    // Procesar cover photo
    let coverPhotoUrl = pet.coverPhotoUrl;
    if (req.files && req.files.coverPhoto) {
      // Eliminar cover anterior si existe
      if (pet.coverPhotoUrl) {
        await deletePublicImage(pet.coverPhotoUrl);
      }
      // Subir nueva cover a S3
      coverPhotoUrl = await uploadPublicImage(req.files.coverPhoto[0].buffer, req.files.coverPhoto[0].originalname, 'pets/covers');
    } else if (removeCoverPhoto === 'true') {
      // Si se solicita eliminar la cover photo
      if (pet.coverPhotoUrl) {
        await deletePublicImage(pet.coverPhotoUrl);
      }
      coverPhotoUrl = null;
    }

    // Actualizar mascota
    const updatedPet = await prisma.pet.update({
      where: { id: petId },
      data: {
        nombre: nombre || pet.nombre,
        especie: especie || pet.especie,
        raza: raza !== undefined ? raza : pet.raza,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : pet.fechaNacimiento,
        fotoUrl,
        coverPhotoUrl
      }
    });

    res.json({
      message: 'Pet updated successfully',
      pet: updatedPet
    });
  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Eliminar una mascota
const deletePet = async (req, res) => {
  try {
    const userId = req.user.id;
    const petId = req.params.id;

    // Verificar que la mascota pertenece al usuario
    const pet = await prisma.pet.findFirst({
      where: {
        id: petId,
        userId
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Eliminar mascota (cascade eliminará vacunas y procedimientos)
    await prisma.pet.delete({
      where: { id: petId }
    });

    res.json({
      message: 'Pet deleted successfully'
    });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Archivar o desarchivar mascota
const toggleArchivePet = async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;
    const petId = req.params.id;
    const { archived } = req.body;

    if (typeof archived !== 'boolean') {
      return res.status(400).json({ error: 'archived field must be a boolean' });
    }

    if (userType === 'vet') {
      // Para veterinarios, archivar en la relación VetPetLink
      const link = await prisma.vetPetLink.findFirst({
        where: {
          vetId: userId,
          petId
        }
      });

      if (!link) {
        return res.status(404).json({ error: 'Pet not linked to this vet' });
      }

      await prisma.vetPetLink.update({
        where: { id: link.id },
        data: { archived }
      });
    } else {
      // Para usuarios, verificar si es dueño o co-dueño
      const pet = await prisma.pet.findFirst({
        where: {
          id: petId,
          userId
        }
      });

      if (pet) {
        // Es el dueño, archivar en la tabla Pet
        await prisma.pet.update({
          where: { id: petId },
          data: { archivedByOwner: archived }
        });
      } else {
        // Verificar si es co-dueño
        const coOwnerLink = await prisma.coOwnerPetLink.findFirst({
          where: {
            userId,
            petId
          }
        });

        if (!coOwnerLink) {
          return res.status(404).json({ error: 'Pet not found' });
        }

        // Es co-dueño, archivar en la relación CoOwnerPetLink
        await prisma.coOwnerPetLink.update({
          where: { id: coOwnerLink.id },
          data: { archived }
        });
      }
    }

    res.json({
      message: archived ? 'Pet archived successfully' : 'Pet unarchived successfully'
    });
  } catch (error) {
    console.error('Toggle archive pet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Obtener mascotas archivadas
const getArchivedPets = async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    let pets;

    if (userType === 'vet') {
      // Los veterinarios ven sus mascotas archivadas
      const allPets = await prisma.pet.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          },
          linkedVets: {
            where: {
              vetId: userId,
              archived: true
            },
            select: {
              id: true,
              archived: true,
              createdAt: true
            }
          }
        }
      });

      // Filtrar solo las que están archivadas por el vet
      pets = allPets
        .filter(pet => pet.linkedVets.length > 0)
        .map(pet => ({
          ...pet,
          isLinked: true,
          isArchivedByOwner: pet.archivedByOwner,
          linkedVets: undefined
        }));
    } else {
      // Los usuarios ven sus mascotas archivadas (propias y co-owned)
      const ownedArchivedPets = await prisma.pet.findMany({
        where: {
          userId,
          archivedByOwner: true
        },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Obtener mascotas archivadas donde es co-dueño
      const coOwnedArchivedPets = await prisma.pet.findMany({
        where: {
          coOwners: {
            some: {
              userId,
              archived: true
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Combinar ambas listas, marcando las co-owned
      const ownedWithFlag = ownedArchivedPets.map(pet => ({ ...pet, isCoOwner: false }));
      const coOwnedWithFlag = coOwnedArchivedPets.map(pet => ({ ...pet, isCoOwner: true }));

      pets = [...ownedWithFlag, ...coOwnedWithFlag];
    }

    res.json({
      pets
    });
  } catch (error) {
    console.error('Get archived pets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Crear mascota rápida (solo para veterinarios)
const createQuickPet = async (req, res) => {
  try {
    const { id: vetId, type: userType } = req.user;

    // Verificar que sea veterinario
    if (userType !== 'vet') {
      return res.status(403).json({ error: 'Only vets can create quick pets' });
    }

    // Verificar que el veterinario existe en la base de datos
    console.log('🔍 [CREATE QUICK PET] Verificando veterinario:', vetId);
    const vet = await prisma.vet.findUnique({
      where: { id: vetId }
    });

    if (!vet) {
      console.log('❌ [CREATE QUICK PET] Veterinario no encontrado:', vetId);
      return res.status(404).json({ error: 'Veterinarian not found' });
    }

    console.log('✅ [CREATE QUICK PET] Veterinario encontrado:', vet.nombre);

    const { nombre, especie, raza, fechaNacimiento } = req.body;

    // Validar solo el campo requerido
    if (!nombre) {
      return res.status(400).json({ error: 'Pet name is required' });
    }

    // Valores por defecto
    const especieDefault = especie || 'Perro';

    // Procesar foto de perfil si existe
    let fotoUrl = null;
    if (req.files && req.files.foto) {
      fotoUrl = await uploadPublicImage(req.files.foto[0].buffer, req.files.foto[0].originalname, 'pets/profiles');
    }

    // Procesar foto de portada si existe
    let coverPhotoUrl = null;
    if (req.files && req.files.coverPhoto) {
      coverPhotoUrl = await uploadPublicImage(req.files.coverPhoto[0].buffer, req.files.coverPhoto[0].originalname, 'pets/covers');
    }

    // Generar códigos únicos
    let linkCode, transferCode;
    let isUnique = false;

    while (!isUnique) {
      linkCode = generateLinkCode();
      transferCode = generateLinkCode();

      const existingLink = await prisma.pet.findUnique({
        where: { linkCode }
      });

      const existingTransfer = await prisma.pet.findUnique({
        where: { transferCode }
      });

      if (!existingLink && !existingTransfer) {
        isUnique = true;
      }
    }

    // Crear mascota sin dueño (userId = null) pendiente de transferencia
    const pet = await prisma.pet.create({
      data: {
        userId: null, // Sin dueño hasta que alguien la reclame
        nombre,
        especie: especieDefault,
        raza: raza || null,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        fotoUrl,
        coverPhotoUrl,
        linkCode,
        transferCode,
        transferCodeExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        createdByVetId: vetId,
        pendingTransfer: true
      }
    });

    res.status(201).json({
      message: 'Quick pet created successfully',
      pet,
      transferCode
    });
  } catch (error) {
    console.error('Create quick pet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generar/obtener código de transferencia para una mascota
const getTransferCode = async (req, res) => {
  try {
    const { id: petId } = req.params;
    const { id: userId, type: userType } = req.user;

    // Buscar la mascota
    const pet = await prisma.pet.findUnique({
      where: { id: petId }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Verificar permisos: debe ser el dueño o el veterinario que la creó
    const isOwner = pet.userId === userId;
    const isCreator = pet.createdByVetId === userId && userType === 'vet';

    if (!isOwner && !isCreator) {
      return res.status(403).json({ error: 'You do not have permission to transfer this pet' });
    }

    // Si ya tiene un código válido, devolverlo
    if (pet.transferCode && pet.transferCodeExpiresAt && new Date(pet.transferCodeExpiresAt) > new Date()) {
      return res.json({
        transferCode: pet.transferCode,
        expiresAt: pet.transferCodeExpiresAt
      });
    }

    // Generar nuevo código
    let transferCode;
    let isUnique = false;

    while (!isUnique) {
      transferCode = generateLinkCode();
      const existing = await prisma.pet.findUnique({
        where: { transferCode }
      });
      if (!existing) {
        isUnique = true;
      }
    }

    // Actualizar mascota con nuevo código
    const updatedPet = await prisma.pet.update({
      where: { id: petId },
      data: {
        transferCode,
        transferCodeExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        pendingTransfer: true
      }
    });

    res.json({
      transferCode: updatedPet.transferCode,
      expiresAt: updatedPet.transferCodeExpiresAt
    });
  } catch (error) {
    console.error('Get transfer code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reclamar mascota con código de transferencia
const claimPet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { transferCode } = req.body;

    if (!transferCode) {
      return res.status(400).json({ error: 'Transfer code is required' });
    }

    // Buscar mascota con ese código
    const pet = await prisma.pet.findUnique({
      where: { transferCode: transferCode.toUpperCase().trim() },
      include: {
        user: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Invalid transfer code' });
    }

    // Verificar que no sea el mismo usuario
    if (pet.userId === userId) {
      return res.status(400).json({ error: 'You already own this pet' });
    }

    // Verificar que el código no haya expirado
    if (!pet.transferCodeExpiresAt || new Date(pet.transferCodeExpiresAt) < new Date()) {
      return res.status(400).json({ error: 'Transfer code has expired' });
    }

    // Transferir la mascota
    const updatedPet = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        userId,
        transferCode: null,
        transferCodeExpiresAt: null,
        pendingTransfer: false
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Pet claimed successfully',
      pet: updatedPet
    });
  } catch (error) {
    console.error('Claim pet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createPet,
  getUserPets,
  getPetById,
  updatePet,
  deletePet,
  toggleArchivePet,
  getArchivedPets,
  createQuickPet,
  getTransferCode,
  claimPet
};
