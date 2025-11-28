const prisma = require('../utils/prisma');

/**
 * Obtener datos para la pantalla de inicio de citas (Booking Home)
 * Retorna: Veterinarios vinculados, Favoritos, Próximas citas
 */
const getBookingHomeData = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Obtener Veterinarios Vinculados (My Vets)
    // Lógica: Buscar mascotas del usuario -> buscar vets vinculados a esas mascotas -> obtener datos únicos de vets
    // También incluimos vets que hayan creado mascotas del usuario (si aplica)
    const linkedVetsRaw = await prisma.vetPetLink.findMany({
      where: {
        pet: {
          userId: userId
        },
        archived: false
      },
      select: {
        vet: {
          select: {
            id: true,
            nombre: true,
            fotoUrl: true,
            coverPhotoUrl: true, // Add this
            _count: { select: { favoritedBy: true } }, // Add count
            clinicMemberships: {
              where: { isActive: true },
              select: { clinic: { select: { name: true } } },
              take: 1
            }
          }
        }
      }
    });

    // Deduplicar veterinarios
    const uniqueVetsMap = new Map();
    linkedVetsRaw.forEach(item => {
      if (!uniqueVetsMap.has(item.vet.id)) {
        uniqueVetsMap.set(item.vet.id, {
          id: item.vet.id,
          name: item.vet.nombre,
          image: item.vet.fotoUrl,
          coverPhoto: item.vet.coverPhotoUrl, // Add this
          likes: item.vet._count.favoritedBy, // Add this
          clinic: item.vet.clinicMemberships[0]?.clinic.name || 'Veterinario Independiente'
        });
      }
    });
    const myVets = Array.from(uniqueVetsMap.values());

    // 2. Obtener Favoritos
    // Asegurarse de que el modelo Favorite existe en el cliente de Prisma
    const favoritesRaw = await prisma.favorite.findMany({
      where: { userId },
      include: {
        vet: {
          select: {
            id: true,
            nombre: true,
            fotoUrl: true,
            coverPhotoUrl: true, // Add this
            _count: { select: { favoritedBy: true } }, // Add count
            clinicMemberships: {
              where: { isActive: true },
              select: { clinic: { select: { name: true } } },
              take: 1
            }
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            address: true,
            _count: { select: { favoritedBy: true } } // Add count
          }
        }
      }
    });

    const favorites = favoritesRaw.map(fav => {
      if (fav.vet) {
        return {
          id: fav.vet.id,
          type: 'VET',
          name: fav.vet.nombre,
          image: fav.vet.fotoUrl,
          coverPhoto: fav.vet.coverPhotoUrl, // Add this
          likes: fav.vet._count.favoritedBy, // Add this
          subtitle: fav.vet.clinicMemberships[0]?.clinic.name || 'Veterinario Independiente'
        };
      } else if (fav.clinic) {
        return {
          id: fav.clinic.id,
          type: 'CLINIC',
          name: fav.clinic.name,
          image: fav.clinic.logoUrl,
          likes: fav.clinic._count.favoritedBy, // Add this
          subtitle: fav.clinic.address || 'Clínica Veterinaria'
        };
      }
      return null;
    }).filter(Boolean);

    // 3. Obtener Citas (Futuras y Pasadas recientes)
    const allAppointments = await prisma.appointment.findMany({
      where: {
        pet: { userId },
        // Removido filtro de fecha futura para mostrar historial
        status: { notIn: ['CANCELLED', 'NO_SHOW'] } // Opcional: Mostrar canceladas también si se desea
      },
      include: {
        pet: { select: { nombre: true, fotoUrl: true } },
        vet: { select: { nombre: true } },
        clinic: { select: { name: true } }
      },
      orderBy: { startDateTime: 'desc' }, // Más recientes primero
      take: 20
    });

    const appointments = allAppointments.map(appt => ({
      id: appt.id,
      petName: appt.pet.nombre,
      petImage: appt.pet.fotoUrl,
      providerName: appt.vet?.nombre || appt.clinic.name,
      date: appt.startDateTime,
      status: appt.status
    }));

    res.json({
      myVets,
      favorites,
      appointments
    });

  } catch (error) {
    console.error('Get booking home data error:', error);
    res.status(500).json({ error: 'Failed to fetch booking data' });
  }
};

/**
 * Alternar favorito (Toggle Favorite)
 */
const toggleFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vetId, clinicId } = req.body;

    if (!vetId && !clinicId) {
      return res.status(400).json({ error: 'Must provide vetId or clinicId' });
    }

    const whereClause = {
      userId,
      vetId: vetId || null,
      clinicId: clinicId || null
    };

    // Verificar si ya existe
    const existing = await prisma.favorite.findFirst({
      where: whereClause
    });

    if (existing) {
      // Eliminar (Untoggle)
      await prisma.favorite.delete({
        where: { id: existing.id }
      });
      return res.json({ message: 'Removed from favorites', isFavorite: false });
    } else {
      // Crear (Toggle)
      // Si es vetId, asegurar clinicId es null en whereClause para findFirst, pero aquí creamos
      // La unique constraint es compuesta, así que create funciona bien.
      await prisma.favorite.create({
        data: whereClause
      });
      return res.json({ message: 'Added to favorites', isFavorite: true });
    }

  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
};

/**
 * Verificar si es favorito
 */
const checkIsFavorite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { vetId, clinicId } = req.query;

        if (!vetId && !clinicId) {
            return res.status(400).json({ error: 'Must provide vetId or clinicId' });
        }

        const favorite = await prisma.favorite.findFirst({
            where: {
                userId,
                vetId: vetId || undefined,
                clinicId: clinicId || undefined
            }
        });

        res.json({ isFavorite: !!favorite });
    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({ error: 'Failed to check favorite status' });
    }
};

/**
 * Obtener notificaciones del usuario (invitaciones a clínicas)
 * GET /api/user/notifications
 */
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar invitaciones en ClinicMember donde el vetId coincida con el usuario
    const invitations = await prisma.clinicMember.findMany({
      where: {
        vetId: userId,
        status: 'INVITED'
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mapear a formato genérico de notificación
    const notifications = invitations.map(inv => ({
      id: inv.id,
      type: 'INVITATION',
      title: 'Invitación a Clínica',
      subtitle: `Te han invitado a unirte a ${inv.clinic.name} como ${inv.role}`,
      data: {
        clinicId: inv.clinicId,
        clinicName: inv.clinic.name,
        role: inv.role
      },
      createdAt: inv.createdAt
    }));

    res.json({ notifications });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

module.exports = {
  getBookingHomeData,
  toggleFavorite,
  checkIsFavorite,
  getUserNotifications
};