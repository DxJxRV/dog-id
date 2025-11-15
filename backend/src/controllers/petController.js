const prisma = require('../utils/prisma');
const path = require('path');
const { generateLinkCode } = require('../utils/linkCodeGenerator');

// Crear una nueva mascota
const createPet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nombre, especie, raza, fechaNacimiento } = req.body;

    // Validar campos requeridos
    if (!nombre || !especie) {
      return res.status(400).json({ error: 'Nombre and especie are required' });
    }

    // Procesar foto si existe
    let fotoUrl = null;
    if (req.file) {
      fotoUrl = `/uploads/pets/${req.file.filename}`;
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
      // Los veterinarios ven solo las mascotas linkeadas a ellos
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

      // Filtrar solo las que están linkeadas y no archivadas por el vet
      pets = allPets
        .filter(pet => {
          // Solo mostrar si está linkeada y no archivada por el vet
          return pet.linkedVets.length > 0 && !pet.linkedVets[0].archived;
        })
        .map(pet => ({
          ...pet,
          isLinked: true, // Todas las mostradas están linkeadas
          isArchivedByOwner: pet.archivedByOwner, // Agregar flag para saber si está archivada por el dueño
          linkedVets: undefined // Remover el array completo, solo necesitamos isLinked
        }));
    } else {
      // Verificar si el usuario tiene mascotas archivadas
      const archivedCount = await prisma.pet.count({
        where: {
          userId,
          archivedByOwner: true
        }
      });
      hasArchivedPets = archivedCount > 0;

      // Los usuarios ven solo sus mascotas no archivadas
      pets = await prisma.pet.findMany({
        where: {
          userId,
          archivedByOwner: false
        },
        orderBy: { createdAt: 'desc' }
      });
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
    const petId = parseInt(req.params.id);

    const whereClause = userType === 'vet'
      ? { id: petId }  // Veterinarios pueden ver cualquier mascota
      : { id: petId, userId };  // Usuarios solo ven sus mascotas

    const pet = await prisma.pet.findFirst({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        vaccines: {
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
        },
        procedures: {
          include: {
            vet: {
              select: {
                id: true,
                nombre: true,
                cedulaProfesional: true
              }
            }
          },
          orderBy: { fecha: 'desc' }
        }
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    res.json({
      pet
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
    const petId = parseInt(req.params.id);
    const { nombre, especie, raza, fechaNacimiento } = req.body;

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

    // Procesar foto si existe
    let fotoUrl = pet.fotoUrl;
    if (req.file) {
      fotoUrl = `/uploads/pets/${req.file.filename}`;
    }

    // Actualizar mascota
    const updatedPet = await prisma.pet.update({
      where: { id: petId },
      data: {
        nombre: nombre || pet.nombre,
        especie: especie || pet.especie,
        raza: raza !== undefined ? raza : pet.raza,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : pet.fechaNacimiento,
        fotoUrl
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
    const petId = parseInt(req.params.id);

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
    const petId = parseInt(req.params.id);
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
      // Para usuarios, archivar en la tabla Pet
      const pet = await prisma.pet.findFirst({
        where: {
          id: petId,
          userId
        }
      });

      if (!pet) {
        return res.status(404).json({ error: 'Pet not found' });
      }

      await prisma.pet.update({
        where: { id: petId },
        data: { archivedByOwner: archived }
      });
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
      // Los usuarios ven sus mascotas archivadas
      pets = await prisma.pet.findMany({
        where: {
          userId,
          archivedByOwner: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json({
      pets
    });
  } catch (error) {
    console.error('Get archived pets error:', error);
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
  getArchivedPets
};
