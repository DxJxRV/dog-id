const prisma = require('../utils/prisma');

/**
 * Crear una nueva clínica
 * El veterinario que la crea se convierte en OWNER
 */
const createClinic = async (req, res) => {
  try {
    const { name, address, phone, settings } = req.body;
    const vetId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Clinic name is required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name,
          address,
          phone,
          settings: settings || {},
        },
      });

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
 * Actualizar información de la clínica (PUT /api/clinics/:id)
 */
const updateClinic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, settings } = req.body;
    const requesterId = req.user.id;

    // Verificar permisos (OWNER o ADMIN)
    const membership = await prisma.clinicMember.findUnique({
      where: { clinicId_vetId: { clinicId: id, vetId: requesterId } }
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updatedClinic = await prisma.clinic.update({
      where: { id },
      data: {
        name,
        address,
        phone,
        settings
      }
    });

    res.json({ message: 'Clinic updated', clinic: updatedClinic });
  } catch (error) {
    console.error('Error updating clinic:', error);
    res.status(500).json({ error: 'Failed to update clinic' });
  }
};

/**
 * Obtener staff de la clínica (GET /api/clinics/:id/staff)
 */
const getClinicStaff = async (req, res) => {
  try {
    const { id } = req.params;
    
    const members = await prisma.clinicMember.findMany({
      where: { clinicId: id, isActive: true },
      include: {
        vet: {
          select: {
            id: true,
            nombre: true,
            email: true,
            fotoUrl: true,
            cedulaProfesional: true
          }
        }
      }
    });

    res.json({ staff: members });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

/**
 * Agregar un miembro a la clínica (Solo OWNER o ADMIN)
 */
const addMember = async (req, res) => {
  try {
    // Manejar tanto parámetros de URL como body para clinicId
    const clinicId = req.params.id || req.body.clinicId;
    const { vetEmail, role } = req.body;
    const requesterId = req.user.id;

    if (!clinicId) return res.status(400).json({ error: 'Clinic ID is required' });

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
      if (!existingMember.isActive) {
        // Reactivar si estaba inactivo
        const reactivated = await prisma.clinicMember.update({
          where: { id: existingMember.id },
          data: { isActive: true, role: role || 'VET' }
        });
        return res.json({ message: 'Member reactivated', member: reactivated });
      }
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
  updateClinic,
  getClinicStaff,
  addMember
};