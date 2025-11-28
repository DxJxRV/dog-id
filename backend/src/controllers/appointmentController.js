const prisma = require('../utils/prisma');
const { startOfDay, endOfDay, addMinutes, format, isSameDay } = require('date-fns');

// ... existing imports ...

// ... existing createAppointment, requestAppointment, getSchedule, updateStatus, getAppointmentDetail, getPendingRequests, manageRequest ...

/**
 * Crear una nueva cita (Vet)
 */
const createAppointment = async (req, res) => {
  try {
    let { clinicId, petId, startDateTime, endDateTime, reason, notes } = req.body;
    const vetId = req.user.id;

    if (!petId || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!clinicId || clinicId === 'default') {
      const membership = await prisma.clinicMember.findFirst({
        where: { vetId: vetId, isActive: true },
        select: { clinicId: true }
      });

      if (membership) {
        clinicId = membership.clinicId;
      } else {
        console.log('⚠️ No clinic found for vet, creating default personal clinic...');
        const vet = await prisma.vet.findUnique({ where: { id: vetId } });
        
        const newClinic = await prisma.clinic.create({
          data: {
            name: `Consultorio de Dr. ${vet.nombre}`,
            address: 'Dirección por definir',
            phone: vet.telefono
          }
        });

        await prisma.clinicMember.create({
          data: {
            clinicId: newClinic.id,
            vetId: vetId,
            role: 'OWNER',
            isAvailable: true
          }
        });

        clinicId = newClinic.id;
      }
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const conflict = await prisma.appointment.findFirst({
      where: {
        vetId: vetId,
        clinicId: clinicId,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        },
        AND: [
          { startDateTime: { lt: end } },
          { endDateTime: { gt: start } }
        ]
      }
    });

    if (conflict) {
      return res.status(409).json({ 
        error: 'Time slot conflict', 
        message: 'You already have an appointment during this time range.' 
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        clinicId,
        vetId,
        petId,
        startDateTime: start,
        endDateTime: end,
        reason,
        notes,
        status: 'CONFIRMED'
      }
    });

    res.status(201).json({ message: 'Appointment created', appointment });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

// ... requestAppointment, getSchedule, updateStatus, getAppointmentDetail, getPendingRequests, manageRequest ...

const requestAppointment = async (req, res) => {
  try {
    const { clinicId, vetId, petId, startDateTime, reason } = req.body;
    const userId = req.user.id;

    const pet = await prisma.pet.findFirst({
      where: { id: petId, userId: userId }
    });

    if (!pet) {
      return res.status(403).json({ error: 'You can only request appointments for your own pets' });
    }

    if (!clinicId && !vetId) {
      return res.status(400).json({ error: 'Must provide clinicId or vetId' });
    }

    // Si se proporciona vetId pero no clinicId, buscar la clínica del vet
    let targetClinicId = clinicId;
    if (vetId && !clinicId) {
      const membership = await prisma.clinicMember.findFirst({
        where: { vetId: vetId, isActive: true },
        select: { clinicId: true }
      });
      
      if (membership) {
        targetClinicId = membership.clinicId;
      } else {
        // Si el veterinario no tiene clínica, crear una por defecto
        console.log('⚠️ Vet has no clinic, creating default personal clinic for request...');
        const vet = await prisma.vet.findUnique({ where: { id: vetId } });
        
        if (!vet) return res.status(404).json({ error: 'Veterinarian not found' });

        const newClinic = await prisma.clinic.create({
          data: {
            name: `Consultorio de Dr. ${vet.nombre}`,
            address: 'Dirección por definir',
            phone: vet.telefono
          }
        });

        await prisma.clinicMember.create({
          data: {
            clinicId: newClinic.id,
            vetId: vet.id,
            role: 'OWNER',
            status: 'ACTIVE',
            isActive: true,
            isAvailable: true
          }
        });

        targetClinicId = newClinic.id;
      }
    }

    const start = new Date(startDateTime);
    const end = new Date(start.getTime() + 30 * 60000);

    const appointment = await prisma.appointment.create({
      data: {
        clinicId: targetClinicId,
        vetId: vetId || null,
        petId,
        startDateTime: start,
        endDateTime: end,
        reason,
        status: 'PENDING_APPROVAL'
      }
    });

    res.status(201).json({ message: 'Appointment requested successfully', appointment });
  } catch (error) {
    console.error('Error requesting appointment:', error);
    res.status(500).json({ error: 'Failed to request appointment' });
  }
};

const getSchedule = async (req, res) => {
  try {
    const { start, end, clinicId } = req.query;
    const vetId = req.user.id;

    const whereClause = {
      vetId: vetId
    };

    if (clinicId) whereClause.clinicId = clinicId;
    
    if (start && end) {
      whereClause.startDateTime = {
        gte: new Date(start),
        lte: new Date(end)
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        pet: {
          select: {
            id: true,
            nombre: true,
            especie: true,
            fotoUrl: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        startDateTime: 'asc'
      }
    });

    res.json({ appointments });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const vetId = req.user.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.vetId && appointment.vetId !== vetId) {
        const membership = await prisma.clinicMember.findUnique({
            where: {
                clinicId_vetId: {
                    clinicId: appointment.clinicId,
                    vetId: vetId
                }
            }
        });
        
        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
             return res.status(403).json({ error: 'Not authorized to update this appointment' });
        }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status }
    });

    res.json({ message: 'Status updated', appointment: updated });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

const getAppointmentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        pet: true,
        clinic: true,
        smartConsultation: true
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Error fetching appointment detail:', error);
    res.status(500).json({ error: 'Failed to fetch appointment detail' });
  }
};

const getPendingRequests = async (req, res) => {
    try {
        const vetId = req.user.id;
        
        // Buscar las clínicas donde trabaja el vet
        const memberships = await prisma.clinicMember.findMany({
            where: { vetId, status: 'ACTIVE' },
            include: { clinic: true }
        });

        const clinicIds = memberships.map(m => m.clinicId);

        if (clinicIds.length === 0) {
            return res.json({ requests: [] });
        }

        // Buscar citas PENDING_APPROVAL en esas clínicas
        const requests = await prisma.appointment.findMany({
            where: {
                clinicId: { in: clinicIds },
                status: 'PENDING_APPROVAL',
                OR: [
                    { vetId: vetId }, // Asignadas a mí
                    { vetId: null }   // Generales (para dueños/admins)
                ]
            },
            include: {
                pet: {
                    select: {
                        id: true,
                        nombre: true,
                        especie: true,
                        raza: true,
                        fotoUrl: true,
                        user: {
                            select: { nombre: true, telefono: true }
                        }
                    }
                },
                clinic: { select: { name: true } }
            },
            orderBy: { startDateTime: 'asc' }
        });

        res.json({ requests });
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
};

const manageRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, vetId: assignedVetId } = req.body;
        const requesterId = req.user.id;

        const appointment = await prisma.appointment.findUnique({ where: { id } });
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        const membership = await prisma.clinicMember.findUnique({
            where: { clinicId_vetId: { clinicId: appointment.clinicId, vetId: requesterId } }
        });

        if (!membership) return res.status(403).json({ error: 'Access denied' });

        let updateData = {};

        if (action === 'APPROVE') {
            updateData.status = 'CONFIRMED';
            if (!appointment.vetId) updateData.vetId = requesterId;
        } else if (action === 'REJECT') {
            updateData.status = 'CANCELLED';
        } else if (action === 'ASSIGN') {
            if (!['OWNER', 'ADMIN'].includes(membership.role)) {
                return res.status(403).json({ error: 'Only admins can assign appointments' });
            }
            if (assignedVetId) updateData.vetId = assignedVetId;
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const updated = await prisma.appointment.update({
            where: { id },
            data: updateData
        });

        res.json({ message: 'Request updated', appointment: updated });

    } catch (error) {
        console.error('Error managing request:', error);
        res.status(500).json({ error: 'Failed to manage request' });
    }
};

const getAvailableSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) return res.status(400).json({ error: 'Date is required' });

    const workStartHour = 9;
    const workEndHour = 18;
    const slotDuration = 30; 

    const queryDate = new Date(date);
    const startOfDayDate = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDayDate = new Date(queryDate.setHours(23, 59, 59, 999));

    const appointments = await prisma.appointment.findMany({
      where: {
        vetId: id,
        startDateTime: {
          gte: startOfDayDate,
          lte: endOfDayDate
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      }
    });

    const slots = [];
    let currentSlot = new Date(startOfDayDate);
    currentSlot.setHours(workStartHour, 0, 0, 0);

    const workEndTime = new Date(startOfDayDate);
    workEndTime.setHours(workEndHour, 0, 0, 0);

    while (currentSlot < workEndTime) {
      const slotEnd = new Date(currentSlot.getTime() + slotDuration * 60000);
      
      const isOccupied = appointments.some(appt => {
        const apptStart = new Date(appt.startDateTime);
        const apptEnd = new Date(appt.endDateTime);
        return (currentSlot < apptEnd && slotEnd > apptStart);
      });

      if (!isOccupied) {
        if (new Date().toDateString() !== startOfDayDate.toDateString() || currentSlot > new Date()) {
           slots.push(format(currentSlot, 'HH:mm'));
        }
      }

      currentSlot = slotEnd;
    }

    res.json({ slots });

  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
};

/**
 * Asignar y confirmar solicitud
 * POST /appointments/:id/assign-confirm
 */
const assignAndConfirm = async (req, res) => {
  try {
    const { id } = req.params;
    const { vetId, durationMinutes } = req.body;
    const requesterId = req.user.id;

    if (!vetId || !durationMinutes) {
      return res.status(400).json({ error: 'Vet ID and duration are required' });
    }

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // Verificar permisos (debe ser miembro de la clínica)
    const membership = await prisma.clinicMember.findUnique({
        where: { clinicId_vetId: { clinicId: appointment.clinicId, vetId: requesterId } }
    });

    if (!membership) return res.status(403).json({ error: 'Access denied' });

    // Calcular nuevo endDateTime
    const start = new Date(appointment.startDateTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        vetId: vetId,
        endDateTime: end,
        status: 'CONFIRMED'
      }
    });

    res.json({ message: 'Appointment assigned and confirmed', appointment: updated });

  } catch (error) {
    console.error('Error assigning and confirming:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

module.exports = {
  createAppointment,
  getSchedule,
  updateStatus,
  getAppointmentDetail,
  requestAppointment,
  getPendingRequests,
  manageRequest,
  getAvailableSlots,
  assignAndConfirm
};