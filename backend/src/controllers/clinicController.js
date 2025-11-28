const prisma = require('../utils/prisma');

/**
 * Crear una nueva clínica
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
          status: 'ACTIVE', // Default to ACTIVE for creator
          isActive: true,
          isAvailable: true
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
        status: 'ACTIVE' // Solo activas
      },
      include: {
        clinic: true
      }
    });

    const clinics = memberships.map(m => ({
      ...m.clinic,
      myRole: m.role,
      isAvailable: m.isAvailable
    }));

    res.json({ clinics });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({ error: 'Failed to fetch clinics' });
  }
};

/**
 * Actualizar información de la clínica
 */
const updateClinic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, settings, latitude, longitude } = req.body;
    const requesterId = req.user.id;

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
        settings,
        latitude,
        longitude
      }
    });

    res.json({ message: 'Clinic updated', clinic: updatedClinic });
  } catch (error) {
    console.error('Error updating clinic:', error);
    res.status(500).json({ error: 'Failed to update clinic' });
  }
};

/**
 * Obtener staff de la clínica
 */
const getClinicStaff = async (req, res) => {
  try {
    const { id } = req.params;
    
    const members = await prisma.clinicMember.findMany({
      where: { clinicId: id, status: { in: ['ACTIVE', 'INVITED'] } }, // Mostrar activos e invitados
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
 * Agregar un miembro directamente (Legacy / Admin force add)
 * Mantenido por compatibilidad, pero prefiere inviteMember
 */
const addMember = async (req, res) => {
  // ... (Legacy implementation redirected to invite logic effectively)
  // For strict legacy behavior:
  try {
    const clinicId = req.params.id || req.body.clinicId;
    const { vetEmail, role } = req.body;
    const requesterId = req.user.id;

    // ... validation logic ...
    const requesterMembership = await prisma.clinicMember.findUnique({
      where: { clinicId_vetId: { clinicId, vetId: requesterId } }
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const vetToAdd = await prisma.vet.findUnique({ where: { email: vetEmail } });
    if (!vetToAdd) return res.status(404).json({ error: 'Veterinarian not found' });

    const existingMember = await prisma.clinicMember.findUnique({
      where: { clinicId_vetId: { clinicId, vetId: vetToAdd.id } }
    });

    if (existingMember) {
        // ... handle re-activation ...
        await prisma.clinicMember.update({
            where: { id: existingMember.id },
            data: { status: 'ACTIVE', isActive: true, role: role || 'VET' }
        });
        return res.json({ message: 'Member added (reactivated)' });
    }

    await prisma.clinicMember.create({
      data: {
        clinicId,
        vetId: vetToAdd.id,
        role: role || 'VET',
        status: 'ACTIVE', // Direct add is ACTIVE
        isActive: true,
        isAvailable: true
      }
    });

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

/**
 * Invitar a un miembro a la clínica (Nuevo Flujo)
 */
const inviteMember = async (req, res) => {
  try {
    const clinicId = req.params.id;
    const { email, role } = req.body;
    const requesterId = req.user.id;

    const requesterMembership = await prisma.clinicMember.findUnique({
      where: { clinicId_vetId: { clinicId, vetId: requesterId } }
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const vet = await prisma.vet.findUnique({ where: { email } });
    if (!vet) {
      return res.status(404).json({ error: 'Veterinarian not found with that email' });
    }

    const existingMember = await prisma.clinicMember.findUnique({
      where: { clinicId_vetId: { clinicId, vetId: vet.id } }
    });

    if (existingMember) {
      if (existingMember.status === 'INACTIVE' || existingMember.status === 'INVITED') {
        await prisma.clinicMember.update({
          where: { id: existingMember.id },
          data: { status: 'INVITED', role: role || 'VET', isActive: true }
        });
        return res.json({ message: 'Invitation sent/updated' });
      }
      return res.status(400).json({ error: 'User is already an active member' });
    }

    await prisma.clinicMember.create({
      data: {
        clinicId,
        vetId: vet.id,
        role: role || 'VET',
        status: 'INVITED',
        isActive: true
      }
    });

    res.json({ message: 'Invitation sent successfully' });

  } catch (error) {
    console.error('Error inviting member:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
};

/**
 * Gestionar invitación (Aceptar/Rechazar)
 */
const manageInvitation = async (req, res) => {
  try {
    const { id } = req.params; // Clinic ID
    const { action } = req.body; // 'ACCEPT' | 'REJECT'
    const vetId = req.user.id;

    const membership = await prisma.clinicMember.findUnique({
      where: { clinicId_vetId: { clinicId: id, vetId } }
    });

    if (!membership || membership.status !== 'INVITED') {
      return res.status(404).json({ error: 'No pending invitation found' });
    }

    if (action === 'ACCEPT') {
      await prisma.clinicMember.update({
        where: { id: membership.id },
        data: { status: 'ACTIVE' }
      });
      res.json({ message: 'Invitation accepted' });
    } else if (action === 'REJECT') {
      await prisma.clinicMember.delete({
        where: { id: membership.id }
      });
      res.json({ message: 'Invitation rejected' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Error managing invitation:', error);
    res.status(500).json({ error: 'Failed to manage invitation' });
  }
};

/**
 * Obtener invitaciones pendientes del veterinario
 */
const getMyInvitations = async (req, res) => {
    try {
        const vetId = req.user.id;
        const invitations = await prisma.clinicMember.findMany({
            where: {
                vetId,
                status: 'INVITED'
            },
            include: {
                clinic: {
                    select: { id: true, name: true, logoUrl: true }
                }
            }
        });
        res.json({ invitations });
    } catch (error) {
        console.error('Error fetching invitations:', error);
        res.status(500).json({ error: 'Failed to fetch invitations' });
    }
};

/**
 * Alternar disponibilidad
 */
const toggleAvailability = async (req, res) => {
  try {
    const clinicId = req.params.id;
    const { vetId, isAvailable } = req.body;
    const requesterId = req.user.id;
    const targetVetId = vetId || requesterId;

    const requesterMembership = await prisma.clinicMember.findUnique({
      where: { clinicId_vetId: { clinicId, vetId: requesterId } }
    });

    if (!requesterMembership) return res.status(403).json({ error: 'Access denied' });

    if (targetVetId !== requesterId && !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updatedMember = await prisma.clinicMember.update({
      where: { clinicId_vetId: { clinicId, vetId: targetVetId } },
      data: { isAvailable }
    });

    res.json({ message: 'Availability updated', member: updatedMember });

  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
};

module.exports = {
  createClinic,
  getMyClinics,
  updateClinic,
  getClinicStaff,
  addMember,
  toggleAvailability,
  inviteMember,
  manageInvitation,
  getMyInvitations
};