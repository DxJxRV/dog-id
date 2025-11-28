const prisma = require('../utils/prisma');

/**
 * Crear una nueva cita
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
    // Conflicto si: (NewStart < ExistingEnd) AND (NewEnd > ExistingStart)
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

    if (appointment.vetId !== vetId) {
      return res.status(403).json({ error: 'Not authorized to update this appointment' });
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

module.exports = {
  createAppointment,
  getSchedule,
  updateStatus,
  getAppointmentDetail
};
