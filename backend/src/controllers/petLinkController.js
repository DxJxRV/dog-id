const prisma = require('../utils/prisma');

// Obtener código y datos para mostrar QR (solo dueño)
const getPetLinkCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const petId = req.params.id;

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

// Linkear mascota (tanto para veterinarios como para co-dueños)
const linkPet = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type; // 'vet' o 'user'
    const { linkCode } = req.body;

    console.log('🔗 [linkPet] Starting pet link process');
    console.log('   User ID:', userId);
    console.log('   User Type:', userType);
    console.log('   Link Code:', linkCode);

    if (!linkCode) {
      console.log('❌ [linkPet] No link code provided');
      return res.status(400).json({ error: 'Link code is required' });
    }

    // Buscar mascota por código
    console.log('🔍 [linkPet] Looking for pet with code:', linkCode.toUpperCase().trim());
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
      console.log('❌ [linkPet] Pet not found with code:', linkCode);
      return res.status(404).json({ error: 'Invalid link code. Pet not found.' });
    }

    console.log('✅ [linkPet] Pet found:', { id: pet.id, nombre: pet.nombre, ownerId: pet.userId });

    // Verificar que no sea el dueño principal
    if (pet.userId === userId && userType === 'user') {
      console.log('❌ [linkPet] User is already the owner of this pet');
      return res.status(400).json({
        error: 'You are already the owner of this pet'
      });
    }

    if (userType === 'vet') {
      console.log('🏥 [linkPet] Processing as veterinarian');

      // Verificar si ya está linkeada como veterinario
      const existingLink = await prisma.vetPetLink.findUnique({
        where: {
          vetId_petId: {
            vetId: userId,
            petId: pet.id
          }
        }
      });

      if (existingLink) {
        console.log('⚠️  [linkPet] Pet already linked to this vet');
        return res.status(400).json({
          error: 'This pet is already linked to your veterinary account',
          pet: {
            id: pet.id,
            nombre: pet.nombre,
            especie: pet.especie
          }
        });
      }

      // Crear link de veterinario
      console.log('➕ [linkPet] Creating vet-pet link');
      await prisma.vetPetLink.create({
        data: {
          vetId: userId,
          petId: pet.id
        }
      });
      console.log('✅ [linkPet] Vet-pet link created successfully');
    } else {
      console.log('👥 [linkPet] Processing as co-owner');

      // Es un usuario regular (co-dueño)
      // Verificar si ya está linkeado como co-dueño
      console.log('🔍 [linkPet] Checking for existing co-owner link');
      const existingLink = await prisma.coOwnerPetLink.findUnique({
        where: {
          userId_petId: {
            userId,
            petId: pet.id
          }
        }
      });

      if (existingLink) {
        console.log('⚠️  [linkPet] User is already a co-owner of this pet');
        return res.status(400).json({
          error: 'You are already a co-owner of this pet',
          pet: {
            id: pet.id,
            nombre: pet.nombre,
            especie: pet.especie
          }
        });
      }

      // Crear link de co-dueño
      console.log('➕ [linkPet] Creating co-owner-pet link with data:', { userId, petId: pet.id });
      const newLink = await prisma.coOwnerPetLink.create({
        data: {
          userId,
          petId: pet.id
        }
      });
      console.log('✅ [linkPet] Co-owner-pet link created successfully:', newLink.id);
    }

    console.log('🎉 [linkPet] Pet linked successfully as', userType === 'vet' ? 'veterinarian' : 'co-owner');
    res.status(201).json({
      message: `Pet linked successfully as ${userType === 'vet' ? 'veterinarian' : 'co-owner'}`,
      linkType: userType === 'vet' ? 'veterinarian' : 'co-owner',
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
    console.error('💥 [linkPet] ERROR DETAILS:');
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error stack:', error.stack);
    if (error.meta) {
      console.error('   Prisma meta:', JSON.stringify(error.meta, null, 2));
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Mantener compatibilidad con nombre anterior
const linkPetToVet = linkPet;

// Deslikenar mascota de veterinario
const unlinkPetFromVet = async (req, res) => {
  try {
    const vetId = req.user.id;
    const petId = req.params.id;

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

// Deslikenar mascota como co-dueño
const unlinkPetAsCoOwner = async (req, res) => {
  try {
    const userId = req.user.id;
    const petId = req.params.id;

    console.log('🔗 [unlinkPetAsCoOwner] Attempting to unlink co-owner');
    console.log('   User ID:', userId);
    console.log('   Pet ID:', petId);

    const link = await prisma.coOwnerPetLink.findUnique({
      where: {
        userId_petId: {
          userId,
          petId
        }
      }
    });

    if (!link) {
      console.log('❌ [unlinkPetAsCoOwner] Co-owner link not found');
      return res.status(404).json({ error: 'Pet link not found' });
    }

    await prisma.coOwnerPetLink.delete({
      where: {
        userId_petId: {
          userId,
          petId
        }
      }
    });

    console.log('✅ [unlinkPetAsCoOwner] Co-owner link deleted successfully');
    res.json({
      message: 'Pet unlinked successfully'
    });
  } catch (error) {
    console.error('💥 [unlinkPetAsCoOwner] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPetLinkCode,
  linkPet,
  linkPetToVet,
  unlinkPetFromVet,
  unlinkPetAsCoOwner
};
