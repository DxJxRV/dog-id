const prisma = require('../utils/prisma');

// Obtener código y datos para mostrar QR (solo dueño)
const getPetLinkCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const petId = parseInt(req.params.id);

    const pet = await prisma.pet.findFirst({
      where: {
        id: petId,
        userId
      },
      select: {
        id: true,
        nombre: true,
        linkCode: true,
        especie: true,
        fotoUrl: true
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found or you do not own this pet' });
    }

    res.json({
      linkCode: pet.linkCode,
      pet: {
        id: pet.id,
        nombre: pet.nombre,
        especie: pet.especie,
        fotoUrl: pet.fotoUrl
      }
    });
  } catch (error) {
    console.error('Get pet link code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Linkear mascota a veterinario usando código
const linkPetToVet = async (req, res) => {
  try {
    const vetId = req.user.id;
    const { linkCode } = req.body;

    if (!linkCode) {
      return res.status(400).json({ error: 'Link code is required' });
    }

    // Buscar mascota por código
    const pet = await prisma.pet.findUnique({
      where: { linkCode: linkCode.toUpperCase().trim() },
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

    if (!pet) {
      return res.status(404).json({ error: 'Invalid link code. Pet not found.' });
    }

    // Verificar si ya está linkeada
    const existingLink = await prisma.vetPetLink.findUnique({
      where: {
        vetId_petId: {
          vetId,
          petId: pet.id
        }
      }
    });

    if (existingLink) {
      return res.status(400).json({
        error: 'This pet is already linked to your account',
        pet: {
          id: pet.id,
          nombre: pet.nombre,
          especie: pet.especie
        }
      });
    }

    // Crear link
    await prisma.vetPetLink.create({
      data: {
        vetId,
        petId: pet.id
      }
    });

    res.status(201).json({
      message: 'Pet linked successfully',
      pet: {
        id: pet.id,
        nombre: pet.nombre,
        especie: pet.especie,
        raza: pet.raza,
        fechaNacimiento: pet.fechaNacimiento,
        fotoUrl: pet.fotoUrl,
        owner: pet.user
      }
    });
  } catch (error) {
    console.error('Link pet to vet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Deslikenar mascota de veterinario
const unlinkPetFromVet = async (req, res) => {
  try {
    const vetId = req.user.id;
    const petId = parseInt(req.params.id);

    const link = await prisma.vetPetLink.findUnique({
      where: {
        vetId_petId: {
          vetId,
          petId
        }
      }
    });

    if (!link) {
      return res.status(404).json({ error: 'Pet link not found' });
    }

    await prisma.vetPetLink.delete({
      where: {
        vetId_petId: {
          vetId,
          petId
        }
      }
    });

    res.json({
      message: 'Pet unlinked successfully'
    });
  } catch (error) {
    console.error('Unlink pet from vet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPetLinkCode,
  linkPetToVet,
  unlinkPetFromVet
};
