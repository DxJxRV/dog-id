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
          coverPhotoUrl: true, // Add this
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
          logoUrl: true
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
      coverPhoto: v.coverPhotoUrl, // Add this
      details: `Cédula: ${v.cedulaProfesional}`
    }));

    const formattedClinics = clinics.map(c => ({
      id: c.id,
      type: 'CLINIC',
      title: c.name,
      subtitle: c.address || 'Sin dirección registrada',
      image: c.logoUrl,
      details: 'Clínica Veterinaria'
    }));

    res.json({ results: [...formattedVets, ...formattedClinics] });

  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

module.exports = {
  globalSearch
};
