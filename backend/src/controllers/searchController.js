const prisma = require('../utils/prisma');

const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ results: [] });
    }

    // Búsqueda paralela en Veterinarios y Clínicas
    const [vets, clinics] = await Promise.all([
      prisma.vet.findMany({
        where: {
          nombre: { contains: q }
        },
        select: {
          id: true,
          nombre: true,
          cedulaProfesional: true,
          fotoUrl: true,
          coverPhotoUrl: true,
          _count: { select: { favoritedBy: true } }, // Para ranking implícito si se necesitara
          clinicMemberships: {
            where: { isActive: true },
            include: { clinic: { select: { name: true } } }
          }
        },
        take: 5
      }),
      prisma.clinic.findMany({
        where: {
          name: { contains: q }
        },
        select: {
          id: true,
          name: true,
          address: true,
          logoUrl: true,
          _count: { select: { favoritedBy: true } }
        },
        take: 5
      })
    ]);

    // Formatear resultados
    const formattedVets = vets.map(v => ({
      id: v.id,
      type: 'VET',
      title: v.nombre,
      subtitle: v.clinicMemberships[0]?.clinic.name || 'Veterinario Independiente',
      image: v.fotoUrl,
      coverPhoto: v.coverPhotoUrl,
      details: `Cédula: ${v.cedulaProfesional}`,
      likes: v._count.favoritedBy
    }));

    const formattedClinics = clinics.map(c => ({
      id: c.id,
      type: 'CLINIC',
      title: c.name,
      subtitle: c.address || 'Sin dirección registrada',
      image: c.logoUrl,
      details: 'Clínica Veterinaria',
      likes: c._count.favoritedBy
    }));

    res.json({ results: [...formattedVets, ...formattedClinics] });

  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

/**
 * Obtener datos de descubrimiento (Top Vets & Clínicas)
 * GET /search/discovery
 */
const getDiscoveryData = async (req, res) => {
  try {
    // 1. Top Veterinarios (por número de favoritos)
    const topVets = await prisma.vet.findMany({
      orderBy: {
        favoritedBy: { _count: 'desc' }
      },
      take: 5,
      select: {
        id: true,
        nombre: true,
        fotoUrl: true,
        coverPhotoUrl: true,
        _count: { select: { favoritedBy: true } },
        clinicMemberships: {
          where: { isActive: true },
          select: { clinic: { select: { name: true } } },
          take: 1
        }
      }
    });

    // 2. Clínicas Destacadas (por número de favoritos)
    const featuredClinics = await prisma.clinic.findMany({
      orderBy: {
        favoritedBy: { _count: 'desc' }
      },
      take: 5,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        address: true,
        _count: { select: { favoritedBy: true } }
      }
    });

    const formattedTopVets = topVets.map(v => ({
      id: v.id,
      type: 'VET',
      title: v.nombre,
      subtitle: v.clinicMemberships[0]?.clinic.name || 'Veterinario Independiente',
      image: v.fotoUrl,
      coverPhoto: v.coverPhotoUrl,
      rating: 4.9, // Mock rating por ahora, o usar likes
      likes: v._count.favoritedBy
    }));

    const formattedClinics = featuredClinics.map(c => ({
      id: c.id,
      type: 'CLINIC',
      title: c.name,
      subtitle: c.address || 'Ubicación no disponible',
      image: c.logoUrl,
      likes: c._count.favoritedBy
    }));

    res.json({
      topVets: formattedTopVets,
      featuredClinics: formattedClinics
    });

  } catch (error) {
    console.error('Discovery data error:', error);
    res.status(500).json({ error: 'Failed to fetch discovery data' });
  }
};

module.exports = {
  globalSearch,
  getDiscoveryData
};