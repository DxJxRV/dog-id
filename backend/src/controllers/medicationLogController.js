const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Registrar que se tomó un medicamento
const logMedication = async (req, res) => {
  try {
    const userId = req.user.id;
    const { prescriptionItemId, scheduledTime } = req.body;

    if (!prescriptionItemId || !scheduledTime) {
      return res.status(400).json({ error: 'prescriptionItemId and scheduledTime are required' });
    }

    // Verificar que el prescription item existe y pertenece a una mascota del usuario
    const prescriptionItem = await prisma.prescriptionItem.findUnique({
      where: { id: prescriptionItemId },
      include: {
        prescription: {
          include: {
            pet: true
          }
        }
      }
    });

    if (!prescriptionItem) {
      return res.status(404).json({ error: 'Prescription item not found' });
    }

    // Verificar que el usuario es dueño de la mascota
    if (prescriptionItem.prescription.pet.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to log medication for this pet' });
    }

    // Obtener la fecha de hoy (sin hora)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar si ya existe un log para este medicamento, usuario, fecha y hora programada
    const existingLog = await prisma.medicationLog.findFirst({
      where: {
        prescriptionItemId,
        userId,
        scheduledTime,
        date: today
      }
    });

    if (existingLog) {
      // Si ya existe, lo eliminamos (toggle)
      await prisma.medicationLog.delete({
        where: { id: existingLog.id }
      });

      return res.json({
        message: 'Medication unmarked',
        logged: false
      });
    }

    // Crear el log
    const medicationLog = await prisma.medicationLog.create({
      data: {
        prescriptionItemId,
        userId,
        scheduledTime,
        date: today
      }
    });

    console.log(`✅ Medication logged: ${prescriptionItem.medication} at ${scheduledTime} for user ${userId}`);

    res.json({
      message: 'Medication logged successfully',
      logged: true,
      log: medicationLog
    });
  } catch (error) {
    console.error('❌ Error logging medication:', error);
    res.status(500).json({ error: 'Failed to log medication' });
  }
};

// Obtener logs de medicamentos del usuario para hoy
const getTodayLogs = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener la fecha de hoy (sin hora)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await prisma.medicationLog.findMany({
      where: {
        userId,
        date: today
      },
      include: {
        prescriptionItem: {
          select: {
            id: true,
            medication: true,
            dosage: true,
            prescriptionId: true
          }
        }
      }
    });

    // Convertir a un formato más simple: taskId -> log
    const logsMap = {};
    logs.forEach(log => {
      const taskId = `${log.prescriptionItemId}-${log.scheduledTime}`;
      logsMap[taskId] = {
        id: log.id,
        takenAt: log.takenAt,
        scheduledTime: log.scheduledTime
      };
    });

    res.json({ logs: logsMap });
  } catch (error) {
    console.error('❌ Error fetching today logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

// Obtener historial de adherencia para una mascota (para el vet)
const getPetAdherence = async (req, res) => {
  try {
    const { petId } = req.params;
    const { startDate, endDate } = req.query;

    // Obtener todas las prescriptions de la mascota
    const prescriptions = await prisma.prescription.findMany({
      where: {
        petId,
        status: 'FINALIZED'
      },
      include: {
        items: {
          include: {
            medicationLogs: {
              where: {
                date: {
                  gte: startDate ? new Date(startDate) : undefined,
                  lte: endDate ? new Date(endDate) : undefined
                }
              },
              orderBy: {
                takenAt: 'desc'
              }
            }
          }
        }
      }
    });

    // Calcular estadísticas de adherencia
    const adherenceData = prescriptions.map(prescription => {
      return {
        prescriptionId: prescription.id,
        diagnosis: prescription.diagnosis,
        finalizedAt: prescription.finalizedAt,
        items: prescription.items.map(item => {
          // Calcular cuántas dosis se esperaban vs cuántas se tomaron
          const logCount = item.medicationLogs.length;

          return {
            medication: item.medication,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            logCount,
            logs: item.medicationLogs
          };
        })
      };
    });

    res.json({ adherence: adherenceData });
  } catch (error) {
    console.error('❌ Error fetching pet adherence:', error);
    res.status(500).json({ error: 'Failed to fetch adherence data' });
  }
};

module.exports = {
  logMedication,
  getTodayLogs,
  getPetAdherence
};
