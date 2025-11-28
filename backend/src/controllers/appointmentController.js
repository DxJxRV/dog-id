const prisma = require('../utils/prisma');
const { startOfDay, endOfDay, addMinutes, format, isSameDay } = require('date-fns');

// ... (createAppointment, requestAppointment, getSchedule, updateStatus, getAppointmentDetail, getPendingRequests, manageRequest existing functions)

/**
 * Crear una nueva cita (Vet)
 */
const createAppointment = async (req, res) => {
  try {
    let { clinicId, petId, startDateTime, endDateTime, reason, notes } = req.body;
    const vetId = req.user.id; // El vet logueado crea la cita para sí mismo (por ahora)

    // Validaciones básicas
    if (!petId || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Si clinicId es 'default' o no se envía, buscar la primera clínica del vet
    if (!clinicId || clinicId === 'default') {
      const membership = await prisma.clinicMember.findFirst({
        where: { vetId: vetId, isActive: true },
        select: { clinicId: true }
      });

      if (membership) {
        clinicId = membership.clinicId;
      } else {
        // Si no tiene clínica, crear una por defecto "Consultorio Personal"
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
            role: 'OWNER'
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

    // Verificar conflictos de horario para este Vet en esta Clínica
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

    // Crear la cita
    const appointment = await prisma.appointment.create({
      data: {
        clinicId,
        vetId,
        petId,
        startDateTime: start,
        endDateTime: end,
        reason,
        notes,
        status: 'CONFIRMED' // Por defecto confirmada si la crea el vet
      }
    });

    res.status(201).json({ message: 'Appointment created', appointment });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

/**
 * Solicitar una cita (User)
 */
const requestAppointment = async (req, res) => {
  try {
    const { clinicId, vetId, petId, startDateTime, reason } = req.body;
    const userId = req.user.id;

    // Validar que la mascota pertenece al usuario
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
        return res.status(404).json({ error: 'Veterinarian is not associated with any clinic' });
      }
    }

    const start = new Date(startDateTime);
    const end = new Date(start.getTime() + 30 * 60000); // Default 30 min duration

    // Crear solicitud
    const appointment = await prisma.appointment.create({
      data: {
        clinicId: targetClinicId,
        vetId: vetId || null, // Puede ser null si es cita general a la clínica
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

/**
 * Obtener citas (Schedule)
 * Filtros: startDate, endDate, clinicId
 */
const getSchedule = async (req, res) => {
  try {
    const { start, end, clinicId } = req.query;
    const vetId = req.user.id;

    const whereClause = {
      vetId: vetId
    };

    if (clinicId) whereClause.clinicId = clinicId;
    
    // Filtro por rango de fechas
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

/**
 * Actualizar estado de la cita
 */
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

    // Verificar permisos: El vet asignado o un miembro de la clínica con permisos
    if (appointment.vetId && appointment.vetId !== vetId) {
        // Check if requester is admin/owner of the clinic
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

/**
 * Obtener detalle de cita
 */
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

/**
 * Obtener solicitudes pendientes (Clinic Dashboard)
 */
const getPendingRequests = async (req, res) => {
    try {
        const vetId = req.user.id;
        
        // Buscar las clínicas donde trabaja el vet
        const memberships = await prisma.clinicMember.findMany({
            where: { vetId, isActive: true },
            include: { clinic: true }
        });

        const clinicIds = memberships.map(m => m.clinicId);

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

/**
 * Gestionar solicitud (Aceptar/Rechazar/Asignar)
 */
const manageRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, vetId: assignedVetId } = req.body; // action: 'APPROVE', 'REJECT', 'ASSIGN'
        const requesterId = req.user.id;

        const appointment = await prisma.appointment.findUnique({ where: { id } });
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        // Validar permisos básicos (pertenecer a la clínica)
        const membership = await prisma.clinicMember.findUnique({
            where: { clinicId_vetId: { clinicId: appointment.clinicId, vetId: requesterId } }
        });

        if (!membership) return res.status(403).json({ error: 'Access denied' });

        let updateData = {};

        if (action === 'APPROVE') {
            updateData.status = 'CONFIRMED';
            // Si no tenía vet asignado, se asigna al que aprueba (opcional, o validar que ya tenga)
            if (!appointment.vetId) updateData.vetId = requesterId;
        } else if (action === 'REJECT') {
            updateData.status = 'CANCELLED';
        } else if (action === 'ASSIGN') {
            // Solo admins/owners pueden asignar
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

/**
 * Obtener horarios disponibles para un día
 * GET /api/vets/:id/slots?date=YYYY-MM-DD
 */
const getAvailableSlots = async (req, res) => {
  try {
    const { id } = req.params; // Puede ser vetId o clinicId (lógica simplificada: id = vetId)
    const { date } = req.query;

    if (!date) return res.status(400).json({ error: 'Date is required' });

    // Definir horario de trabajo (Hardcoded por ahora: 9am - 6pm)
    // TODO: Obtener de clinic.settings
    const workStartHour = 9;
    const workEndHour = 18;
    const slotDuration = 30; // minutos

    const queryDate = new Date(date);
    const startOfDayDate = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDayDate = new Date(queryDate.setHours(23, 59, 59, 999));

    // Buscar citas existentes para ese día y ese veterinario
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

    // Generar todos los slots posibles
    const slots = [];
    let currentSlot = new Date(startOfDayDate);
    currentSlot.setHours(workStartHour, 0, 0, 0);

    const workEndTime = new Date(startOfDayDate);
    workEndTime.setHours(workEndHour, 0, 0, 0);

    while (currentSlot < workEndTime) {
      const slotEnd = new Date(currentSlot.getTime() + slotDuration * 60000);
      
      // Verificar colisión
      const isOccupied = appointments.some(appt => {
        const apptStart = new Date(appt.startDateTime);
        const apptEnd = new Date(appt.endDateTime);
        
        // Lógica de superposición de rangos: (StartA < EndB) and (EndA > StartB)
        return (currentSlot < apptEnd && slotEnd > apptStart);
      });

      if (!isOccupied) {
        // Verificar que no sea en el pasado (si es hoy)
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

module.exports = {
  createAppointment,
  getSchedule,
  updateStatus,
  getAppointmentDetail,
  requestAppointment,
  getPendingRequests,
  manageRequest,
  getAvailableSlots
};
