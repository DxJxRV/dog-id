const prisma = require('../utils/prisma');

/**
 * Crear una nueva clínica
 * El veterinario que la crea se convierte en OWNER
 */
const createClinic = async (req, res) => {
  try {
    const { name, address, phone, settings } = req.body;
    const vetId = req.user.id; // Asumiendo que el middleware de auth añade user

    if (!name) {
      return res.status(400).json({ error: 'Clinic name is required' });
    }

    // Usar transacción para crear clínica y miembro en un paso atómico
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear Clínica
      const clinic = await tx.clinic.create({
        data: {
          name,
          address,
          phone,
          settings: settings || {},
        },
      });

      // 2. Asignar al creador como OWNER
      await tx.clinicMember.create({
        data: {
          clinicId: clinic.id,
          vetId: vetId,
          role: 'OWNER',
          isActive: true
        }
      });

      return clinic;
    });

    res.status(201).json({ message: 'Clinic created successfully', clinic: result });
  } catch (error) {
    console.error('Error creating clinic:', error);
    res.status(500).json({ error: 'Failed to create clinic' });
  }
};

/**
 * Obtener las clínicas donde trabaja el veterinario
 */
const getMyClinics = async (req, res) => {
  try {
    const vetId = req.user.id;

    const memberships = await prisma.clinicMember.findMany({
      where: {
        vetId: vetId,
        isActive: true
      },
      include: {
        clinic: true
      }
    });

    // Extraer solo los objetos clinic y añadir el rol
    const clinics = memberships.map(m => ({
      ...m.clinic,
      myRole: m.role
    }));

    res.json({ clinics });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({ error: 'Failed to fetch clinics' });
  }
};

/**
 * Agregar un miembro a la clínica (Solo OWNER o ADMIN)
 */
const addMember = async (req, res) => {
  try {
    const { clinicId, vetEmail, role } = req.body;
    const requesterId = req.user.id;

    // Validar permisos
    const requesterMembership = await prisma.clinicMember.findUnique({
      where: {
        clinicId_vetId: {
          clinicId,
          vetId: requesterId
        }
      }
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Buscar al veterinario por email
    const vetToAdd = await prisma.vet.findUnique({
      where: { email: vetEmail }
    });

    if (!vetToAdd) {
      return res.status(404).json({ error: 'Veterinarian not found with that email' });
    }

    // Verificar si ya es miembro
    const existingMember = await prisma.clinicMember.findUnique({
      where: {
        clinicId_vetId: {
          clinicId,
          vetId: vetToAdd.id
        }
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Veterinarian is already a member of this clinic' });
    }

    // Agregar miembro
    const newMember = await prisma.clinicMember.create({
      data: {
        clinicId,
        vetId: vetToAdd.id,
        role: role || 'VET'
      }
    });

    res.status(201).json({ message: 'Member added successfully', member: newMember });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

module.exports = {
  createClinic,
  getMyClinics,
  addMember
};
