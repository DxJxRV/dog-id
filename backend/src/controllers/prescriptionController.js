const prisma = require('../utils/prisma');
const { nanoid } = require('nanoid');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const axios = require('axios');
const { uploadPrivateFile } = require('../services/s3Service');
const fs = require('fs');
const path = require('path');

/**
 * Crear o obtener prescription DRAFT para una cita
 * POST /appointments/:appointmentId/prescription
 * Si ya existe una prescription para la cita, la retorna
 */
const createOrGetPrescription = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const vetId = req.user.id;

    // Validar que es un veterinario
    if (req.user.type !== 'vet') {
      return res.status(403).json({ error: 'Only veterinarians can create prescriptions' });
    }

    console.log('💊 [PRESCRIPTION] Creating or getting prescription...');
    console.log('   📋 Appointment ID:', appointmentId);
    console.log('   👨‍⚕️ Vet ID:', vetId);

    // Verificar que la cita existe y pertenece al veterinario
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        pet: {
          select: {
            id: true,
            nombre: true,
            especie: true,
            raza: true
          }
        }
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.vetId !== vetId) {
      return res.status(403).json({ error: 'Access denied to this appointment' });
    }

    // Verificar si ya existe una prescription
    let prescription = await prisma.prescription.findUnique({
      where: { appointmentId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        },
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true
          }
        },
        appointment: {
          select: {
            id: true,
            startDateTime: true,
            endDateTime: true,
            reason: true,
            notes: true,
            status: true,
            pet: {
              select: {
                id: true,
                nombre: true,
                especie: true,
                raza: true,
                fotoUrl: true,
                user: {
                  select: {
                    id: true,
                    nombre: true,
                    email: true,
                    telefono: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Si no existe, crear una nueva en estado DRAFT
    if (!prescription) {
      console.log('   ✅ Creating new prescription');
      prescription = await prisma.prescription.create({
        data: {
          appointmentId,
          petId: appointment.petId,
          vetId,
          status: 'DRAFT'
        },
        include: {
          items: true,
          vet: {
            select: {
              id: true,
              nombre: true,
              cedulaProfesional: true
            }
          },
          appointment: {
            select: {
              id: true,
              startDateTime: true,
              endDateTime: true,
              reason: true,
              notes: true,
              status: true,
              pet: {
                select: {
                  id: true,
                  nombre: true,
                  especie: true,
                  raza: true,
                  fotoUrl: true
                }
              }
            }
          }
        }
      });
    } else {
      console.log('   ✅ Returning existing prescription');
    }

    res.json({
      prescription
    });
  } catch (error) {
    console.error('❌ [PRESCRIPTION] Create/Get error:', error);
    res.status(500).json({ error: 'Failed to create or get prescription', details: error.message });
  }
};

/**
 * Agregar medicamento a prescription (incremental)
 * POST /prescriptions/:id/items
 */
const addMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const { medication, dosage, frequency, duration, instructions } = req.body;
    const vetId = req.user.id;

    console.log('💊 [PRESCRIPTION] Adding medication...');
    console.log('   📋 Prescription ID:', id);
    console.log('   💊 Medication:', medication);

    // Validar campos requeridos
    if (!medication || !dosage || !frequency) {
      return res.status(400).json({
        error: 'Missing required fields: medication, dosage, frequency are required'
      });
    }

    // Verificar que la prescription existe y es del veterinario
    const prescription = await prisma.prescription.findUnique({
      where: { id }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.vetId !== vetId) {
      return res.status(403).json({ error: 'Access denied to this prescription' });
    }

    if (prescription.status === 'FINALIZED') {
      return res.status(400).json({ error: 'Cannot modify a finalized prescription' });
    }

    // Crear el item
    const item = await prisma.prescriptionItem.create({
      data: {
        prescriptionId: id,
        medication,
        dosage,
        frequency,
        duration: duration || null,
        instructions: instructions || null
      }
    });

    console.log('   ✅ Medication added:', item.id);

    res.status(201).json({ item });
  } catch (error) {
    console.error('❌ [PRESCRIPTION] Add medication error:', error);
    res.status(500).json({ error: 'Failed to add medication', details: error.message });
  }
};

/**
 * Agregar múltiples medicamentos de una vez (desde AI)
 * POST /prescriptions/:id/items/batch
 */
const addMedicationsBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { medications } = req.body; // Array de medications
    const vetId = req.user.id;

    console.log('💊 [PRESCRIPTION] Adding medications batch...');
    console.log('   📋 Prescription ID:', id);
    console.log('   💊 Medications count:', medications?.length || 0);

    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ error: 'medications array is required' });
    }

    // Verificar que la prescription existe y es del veterinario
    const prescription = await prisma.prescription.findUnique({
      where: { id }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.vetId !== vetId) {
      return res.status(403).json({ error: 'Access denied to this prescription' });
    }

    if (prescription.status === 'FINALIZED') {
      return res.status(400).json({ error: 'Cannot modify a finalized prescription' });
    }

    // Validar que todos tengan los campos requeridos
    for (const med of medications) {
      if (!med.medication || !med.dosage || !med.frequency) {
        return res.status(400).json({
          error: 'Each medication must have: medication, dosage, frequency'
        });
      }
    }

    // Crear todos los items
    const items = await Promise.all(
      medications.map(med =>
        prisma.prescriptionItem.create({
          data: {
            prescriptionId: id,
            medication: med.medication,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration || null,
            instructions: med.instructions || null
          }
        })
      )
    );

    console.log('   ✅ Medications added:', items.length);

    res.status(201).json({ items, count: items.length });
  } catch (error) {
    console.error('❌ [PRESCRIPTION] Add medications batch error:', error);
    res.status(500).json({ error: 'Failed to add medications', details: error.message });
  }
};

/**
 * Actualizar medicamento
 * PUT /prescriptions/items/:itemId
 */
const updateMedication = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { medication, dosage, frequency, duration, instructions } = req.body;
    const vetId = req.user.id;

    console.log('💊 [PRESCRIPTION] Updating medication...');
    console.log('   📋 Item ID:', itemId);

    // Verificar que el item existe
    const item = await prisma.prescriptionItem.findUnique({
      where: { id: itemId },
      include: {
        prescription: true
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Medication item not found' });
    }

    if (item.prescription.vetId !== vetId) {
      return res.status(403).json({ error: 'Access denied to this prescription' });
    }

    // PERMITIR EDICIÓN EN PRESCRIPCIONES FINALIZADAS
    // Esto permite el flujo de "Corregir Receta" donde se editan items
    // y luego se regenera el PDF con el endpoint /regenerate
    // La validación de que solo el vet propietario puede editar ya se hizo arriba

    // Actualizar
    const updatedItem = await prisma.prescriptionItem.update({
      where: { id: itemId },
      data: {
        medication: medication || item.medication,
        dosage: dosage || item.dosage,
        frequency: frequency || item.frequency,
        duration: duration !== undefined ? duration : item.duration,
        instructions: instructions !== undefined ? instructions : item.instructions
      }
    });

    console.log('   ✅ Medication updated');

    res.json({ item: updatedItem });
  } catch (error) {
    console.error('❌ [PRESCRIPTION] Update medication error:', error);
    res.status(500).json({ error: 'Failed to update medication', details: error.message });
  }
};

/**
 * Eliminar medicamento
 * DELETE /prescriptions/items/:itemId
 */
const removeMedication = async (req, res) => {
  try {
    const { itemId } = req.params;
    const vetId = req.user.id;

    console.log('💊 [PRESCRIPTION] Removing medication...');
    console.log('   📋 Item ID:', itemId);

    // Verificar que el item existe
    const item = await prisma.prescriptionItem.findUnique({
      where: { id: itemId },
      include: {
        prescription: true
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Medication item not found' });
    }

    if (item.prescription.vetId !== vetId) {
      return res.status(403).json({ error: 'Access denied to this prescription' });
    }

    if (item.prescription.status === 'FINALIZED') {
      return res.status(400).json({ error: 'Cannot modify a finalized prescription' });
    }

    // Eliminar
    await prisma.prescriptionItem.delete({
      where: { id: itemId }
    });

    console.log('   ✅ Medication removed');

    res.json({ message: 'Medication removed successfully' });
  } catch (error) {
    console.error('❌ [PRESCRIPTION] Remove medication error:', error);
    res.status(500).json({ error: 'Failed to remove medication', details: error.message });
  }
};

/**
 * Actualizar diagnosis y notes de prescription
 * PUT /prescriptions/:id
 */
const updatePrescriptionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, notes } = req.body;
    const vetId = req.user.id;

    console.log('💊 [PRESCRIPTION] Updating prescription details...');

    // Verificar que la prescription existe y es del veterinario
    const prescription = await prisma.prescription.findUnique({
      where: { id }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.vetId !== vetId) {
      return res.status(403).json({ error: 'Access denied to this prescription' });
    }

    if (prescription.status === 'FINALIZED') {
      return res.status(400).json({ error: 'Cannot modify a finalized prescription' });
    }

    // Actualizar
    const updated = await prisma.prescription.update({
      where: { id },
      data: {
        diagnosis: diagnosis !== undefined ? diagnosis : prescription.diagnosis,
        notes: notes !== undefined ? notes : prescription.notes
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    console.log('   ✅ Prescription details updated');

    res.json({ prescription: updated });
  } catch (error) {
    console.error('❌ [PRESCRIPTION] Update details error:', error);
    res.status(500).json({ error: 'Failed to update prescription details', details: error.message });
  }
};

/**
 * Obtener prescription con items
 * GET /prescriptions/:id
 */
const getPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.type;

    console.log('💊 [PRESCRIPTION] Getting prescription...');
    console.log('   📋 Prescription ID:', id);
    console.log('   👤 User type:', userType);

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        },
        pet: {
          select: {
            id: true,
            nombre: true,
            especie: true,
            raza: true,
            userId: true
          }
        },
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true,
            telefono: true
          }
        },
        appointment: {
          select: {
            id: true,
            startDateTime: true,
            reason: true
          }
        }
      }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Verificar acceso
    let hasAccess = false;

    if (userType === 'vet') {
      hasAccess = prescription.vetId === userId;
    } else if (userType === 'user') {
      // Usuario tiene acceso si es el dueño de la mascota o co-owner
      hasAccess = prescription.pet.userId === userId ||
                  await prisma.coOwner.findFirst({
                    where: {
                      petId: prescription.petId,
                      userId: userId
                    }
                  });
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this prescription' });
    }

    console.log('   ✅ Prescription retrieved');

    res.json({ prescription });
  } catch (error) {
    console.error('❌ [PRESCRIPTION] Get error:', error);
    res.status(500).json({ error: 'Failed to get prescription', details: error.message });
  }
};

/**
 * Generar PDF Estilo Clínico Tradicional (Sin Emojis/Iconos)
 */
const generatePrescriptionPDF = async (prescription, pet, vet, clinic = null, signature = null, shareUrl = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('📄 [PDF] Generating clinical prescription PDF...');

      // Configuración de colores - Clean Medical Design
      const PRIMARY_COLOR = '#007AFF';  // iOS Blue
      const GRAY_DARK = '#1C1C1E';
      const GRAY_MEDIUM = '#6B7280';
      const GRAY_LIGHT = '#f9f9f9';
      const MARGIN = 40;  // Margen superior reducido
      const LOGO_SIZE = 80;  // Logo más grande

      const doc = new PDFDocument({
        margin: MARGIN,
        size: 'LETTER',
        bufferPages: true  // Permite calcular el total de páginas
      });
      const tempFilePath = path.join('/tmp', `prescription-${prescription.id}.pdf`);
      const stream = fs.createWriteStream(tempFilePath);

      doc.pipe(stream);

      // Espacio reservado para footer (posicionamiento absoluto)
      const footerReservedSpace = 200;  // Aumentado para evitar overflow
      const contentMaxY = doc.page.height - footerReservedSpace;

      // ==========================================
      // 1. HEADER - ESTILO MEMBRETE PROFESIONAL
      // ==========================================

      let logoLoaded = false;

      // 🔍 DIAGNÓSTICO INICIAL DEL LOGO
      console.log('🔍 DEBUG LOGO [PDF Generator]:');
      console.log('   Clinic object received?:', !!clinic);
      console.log('   Clinic:', JSON.stringify(clinic, null, 2));

      // Logo en esquina superior izquierda (fijo)
      if (clinic?.logoUrl) {
        console.log('   ✓ clinic.logoUrl exists:', clinic.logoUrl);

        try {
          const { getImageUrl } = require('../utils/imageHelper');

          console.log('   🔄 Attempting to load logo...');
          const fullLogoUrl = getImageUrl(clinic.logoUrl);
          console.log('   📡 Full logo URL after getImageUrl():', fullLogoUrl);

          console.log('   📥 Downloading image from S3...');
          const logoResponse = await axios.get(fullLogoUrl, {
            responseType: 'arraybuffer',
            timeout: 8000  // 8 segundos timeout
          });
          console.log('   ✓ Download successful. Status:', logoResponse.status);
          console.log('   ✓ Content-Type:', logoResponse.headers['content-type']);
          console.log('   ✓ Content-Length:', logoResponse.headers['content-length']);

          const logoBuffer = Buffer.from(logoResponse.data, 'binary');
          console.log('   ✓ Buffer created. Size:', logoBuffer.length, 'bytes');

          // Logo fijo en (50, 45) con width: 50
          console.log('   🖼️  Embedding image in PDF at position: (50, 45)');
          doc.image(logoBuffer, 50, 45, {
            width: 50,
            fit: [50, 50]
          });
          logoLoaded = true;
          console.log('   ✅ Clinic logo loaded and embedded successfully');
        } catch (logoError) {
          console.error('   ❌ Logo loading failed:');
          console.error('      Error type:', logoError.name);
          console.error('      Error message:', logoError.message);
          console.error('      Error code:', logoError.code);
          if (logoError.response) {
            console.error('      HTTP Status:', logoError.response.status);
            console.error('      HTTP StatusText:', logoError.response.statusText);
          }
          console.error('      ⚠️ PDF will continue without clinic logo');
          // NO romper el PDF, simplemente continuar sin logo
        }
      } else {
        console.log('   ⚠️ No logo to load:');
        console.log('      clinic is null?:', !clinic);
        console.log('      logoUrl is null/undefined?:', !clinic?.logoUrl);
      }

      // Nombre de clínica centrado (Membrete) - 30% más grande
      let headerY = 45;
      if (clinic?.name) {
        doc.font('Helvetica-Bold')
           .fontSize(24)  // Aumentado de 18 a 24 (30% más)
           .fillColor(PRIMARY_COLOR)
           .text(clinic.name.toUpperCase(), 0, headerY, {
             width: doc.page.width,  // Centrado respecto a la página completa
             align: 'center'
           });
        headerY += 28;  // Ajustado por el tamaño más grande
      }

      // Dirección y teléfono centrados debajo del nombre
      if (clinic?.address || clinic?.phone) {
        const clinicInfo = [];
        if (clinic.address) clinicInfo.push(clinic.address);
        if (clinic.phone) clinicInfo.push(`Tel: ${clinic.phone}`);

        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(GRAY_MEDIUM)
           .text(clinicInfo.join(' • '), MARGIN, headerY, {
             width: doc.page.width - MARGIN * 2,
             align: 'center'
           });
        headerY += 16;
      }

      // Línea azul separadora en y: 110 (fijo)
      let currentY = 110;
      doc.moveTo(MARGIN, currentY)
         .lineTo(doc.page.width - MARGIN, currentY)
         .lineWidth(2)
         .strokeColor(PRIMARY_COLOR)
         .stroke();

      currentY += 20;

      // ==========================================
      // 2. HEADER DE DOS COLUMNAS (Sin Rectángulos)
      // ==========================================

      const headerStartY = currentY;
      const pageWidth = doc.page.width - MARGIN * 2;
      const columnWidth = pageWidth / 2;
      const leftColX = MARGIN;
      const rightColX = MARGIN + columnWidth;

      // COLUMNA IZQUIERDA - Datos del Paciente (sin label "PACIENTE:")
      let leftY = currentY;

      // Nombre del paciente directo (sin label)
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor(PRIMARY_COLOR)
         .text(pet.nombre, leftColX, leftY, { width: columnWidth - 20 });

      leftY += 16;

      // Especie, raza y peso en una sola línea
      let petInfo = pet.especie;
      if (pet.raza) petInfo += ` | ${pet.raza}`;
      if (pet.peso) petInfo += ` | Peso: ${pet.peso} kg`;

      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(GRAY_MEDIUM)
         .text(petInfo, leftColX, leftY, { width: columnWidth - 20 });

      leftY += 14;

      // Propietario en gris
      const ownerName = pet.user ? pet.user.nombre : 'N/A';
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(GRAY_MEDIUM)
         .text(`Propietario: ${ownerName}`, leftColX, leftY, { width: columnWidth - 20 });

      // COLUMNA DERECHA - Datos del Veterinario
      let rightY = currentY;

      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor(GRAY_DARK)
         .text(`MVZ. ${vet.nombre}`, rightColX, rightY, {
           width: columnWidth - 20,
           align: 'right'
         });

      rightY += 16;

      if (vet.cedulaProfesional) {
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(GRAY_MEDIUM)
           .text(`Cédula: ${vet.cedulaProfesional}`, rightColX, rightY, {
             width: columnWidth - 20,
             align: 'right'
           });

        rightY += 14;
      }

      const dateStr = new Date(prescription.finalizedAt || prescription.createdAt)
        .toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(GRAY_MEDIUM)
         .text(`Fecha: ${dateStr}`, rightColX, rightY, {
           width: columnWidth - 20,
           align: 'right'
         });

      // Calcular la altura máxima de ambas columnas
      currentY = Math.max(leftY, rightY) + 20;

      // Línea azul separadora debajo de los datos (crea efecto "sándwich")
      doc.moveTo(MARGIN, currentY)
         .lineTo(doc.page.width - MARGIN, currentY)
         .lineWidth(2)
         .strokeColor(PRIMARY_COLOR)
         .stroke();

      currentY += 20;

      // ==========================================
      // 4. DIAGNÓSTICO (si existe)
      // ==========================================

      if (prescription.diagnosis) {
        // Verificar espacio
        if (currentY > contentMaxY - 80) {
          doc.addPage();
          currentY = MARGIN;
        }

        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor(GRAY_DARK)
           .text('DIAGNOSTICO:', MARGIN, currentY);

        currentY += 18;

        doc.font('Helvetica')
           .fontSize(11)
           .fillColor(GRAY_DARK)
           .text(prescription.diagnosis, MARGIN, currentY, {
             width: doc.page.width - MARGIN * 2,
             align: 'left',
             lineGap: 2
           });

        currentY = doc.y + 20;
      }

      // ==========================================
      // 5. CUERPO (Rx - Tratamiento)
      // ==========================================

      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor(GRAY_DARK)
         .text('Prescripcion Medica / Rx', MARGIN, currentY);

      currentY += 25;

      // Iterar medicamentos con lista numerada tradicional
      // (contentMaxY ya definido al inicio para evitar overflow en footer)
      prescription.items.forEach((item, index) => {
        // Verificar si necesitamos una nueva página
        if (currentY > contentMaxY - 50) {
          doc.addPage();
          currentY = MARGIN;
        }

        // Número del medicamento (1., 2., 3.)
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor(GRAY_DARK)
           .text(`${index + 1}. ${item.medication}`, MARGIN, currentY);

        currentY += 16;

        // Construir indicaciones en texto corrido explicativo
        let indications = `${item.dosage} ${item.frequency}`;

        if (item.duration) {
          indications += ` durante ${item.duration}`;
        }

        if (item.instructions) {
          indications += `. ${item.instructions}`;
        }

        // Escribir las indicaciones con sangría
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor(GRAY_DARK)
           .text(indications, MARGIN + 20, currentY, {
             width: doc.page.width - MARGIN * 2 - 20,
             align: 'left',
             lineGap: 2
           });

        currentY = doc.y + 15;
      });

      // ==========================================
      // 6. NOTAS ADICIONALES (si existen)
      // ==========================================

      if (prescription.notes) {
        // Verificar espacio
        if (currentY > contentMaxY - 80) {
          doc.addPage();
          currentY = MARGIN;
        }

        currentY += 10;

        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor(GRAY_DARK)
           .text('NOTAS:', MARGIN, currentY);

        currentY += 16;

        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(GRAY_DARK)
           .text(prescription.notes, MARGIN, currentY, {
             width: doc.page.width - MARGIN * 2,
             align: 'left',
             lineGap: 2
           });

        currentY = doc.y + 20;
      }

      // ==========================================
      // 7. FOOTER - POSICIONAMIENTO ABSOLUTO DESDE ABAJO
      // ==========================================

      // Verificar si necesitamos nueva página para el footer
      // (footerReservedSpace ya definido en sección de medicamentos)
      if (currentY > contentMaxY) {
        doc.addPage();
        currentY = MARGIN;
      }

      // POSICIONAMIENTO ABSOLUTO DESDE ABAJO (ajustado más arriba)
      const bottomBaseY = doc.page.height - 50;  // Base desde el borde inferior

      // 1. DISCLAIMER (más abajo de todo)
      const disclaimerY = bottomBaseY;

      doc.font('Helvetica')
         .fontSize(7)
         .fillColor(GRAY_MEDIUM)
         .text('Receta médica generada digitalmente • MiMascota Plus', MARGIN, disclaimerY, {
           width: doc.page.width - MARGIN * 2,
           align: 'center'
         });

      // 2. BLOQUE DE FIRMA (arriba del disclaimer)
      const signatureBlockHeight = 110;  // Ajustado para la firma optimizada
      const signatureStartY = disclaimerY - signatureBlockHeight - 10;

      // Generar QR code (usar shareUrl si está disponible)
      const finalShareUrl = shareUrl || `${process.env.APP_BASE_URL || process.env.API_URL || 'http://localhost:3000'}/public/prescription/${prescription.publicToken}`;

      console.log('   🔗 Generating QR with URL:', finalShareUrl);

      const qrDataUrl = await QRCode.toDataURL(finalShareUrl, {
        width: 100,
        margin: 0,
        color: {
          dark: PRIMARY_COLOR,
          light: '#FFFFFF'
        }
      });

      // QR en la esquina inferior DERECHA absoluta
      const qrSize = 70;
      const qrX = doc.page.width - 50 - qrSize;  // Esquina derecha absoluta (margen 50 + tamaño QR)
      const qrY = signatureStartY;

      doc.image(qrDataUrl, qrX, qrY, {
        width: qrSize,
        height: qrSize
      });

      doc.font('Helvetica')
         .fontSize(7)
         .fillColor(GRAY_MEDIUM)
         .text('Escanea para validar', qrX - 5, qrY + qrSize + 5, {
           width: qrSize + 10,
           align: 'center'
         });

      // FIRMA DIGITAL CENTRADA CON LÍNEA SÓLIDA
      const signatureWidth = 200;
      const signatureHeight = 60;  // Reducido de 80 a 60 para acercar la firma a la línea
      const signatureX = (doc.page.width - signatureWidth) / 2;
      const signatureY = signatureStartY;

      // Si hay firma digital (base64), mostrarla flotando arriba
      if (signature) {
        try {
          const base64Data = signature.includes('base64,')
            ? signature.split('base64,')[1]
            : signature;

          const signatureBuffer = Buffer.from(base64Data, 'base64');

          // Mostrar la firma digital FLOTANDO sobre la línea (más cerca)
          doc.image(signatureBuffer, signatureX, signatureY, {
            fit: [signatureWidth, signatureHeight],
            align: 'center'
          });

          console.log('   ✍️ Digital signature embedded (floating above line)');
        } catch (sigError) {
          console.warn('   ⚠️ Could not embed signature image:', sigError.message);
        }
      }

      // SIEMPRE dibujar línea sólida negra (con o sin firma) - casi tocando la firma
      const lineY = signatureY + signatureHeight + 2;  // Reducido de 5 a 2 píxeles
      doc.moveTo(signatureX, lineY)
         .lineTo(signatureX + signatureWidth, lineY)
         .lineWidth(1.5)
         .strokeColor('#000000')
         .stroke();

      // Nombre y cédula del veterinario debajo de la línea
      const signatureInfoY = lineY + 5;

      doc.font('Helvetica')
         .fontSize(8)
         .fillColor(GRAY_MEDIUM)
         .text('Firma del Veterinario', signatureX, signatureInfoY, {
           width: signatureWidth,
           align: 'center'
         });

      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(GRAY_DARK)
         .text(`MVZ. ${vet.nombre}`, signatureX, signatureInfoY + 12, {
           width: signatureWidth,
           align: 'center'
         });

      if (vet.cedulaProfesional) {
        doc.font('Helvetica')
           .fontSize(8)
           .fillColor(GRAY_MEDIUM)
           .text(`Cédula Prof. ${vet.cedulaProfesional}`, signatureX, signatureInfoY + 26, {
             width: signatureWidth,
             align: 'center'
           });
      }

      // ==========================================
      // FINALIZAR DOCUMENTO
      // ==========================================

      doc.end();

      stream.on('finish', () => {
        console.log('   ✅ Clinical PDF generated successfully');
        resolve(tempFilePath);
      });

      stream.on('error', reject);
    } catch (error) {
      console.error('❌ [PDF] Generation error:', error);
      reject(error);
    }
  });
};

/**
 * Finalizar prescription y generar PDF
 * POST /prescriptions/:id/finalize
 */
const finalizePrescription = async (req, res) => {
  let tempPdfPath = null;

  try {
    const { id } = req.params;
    const { diagnosis, notes, signature } = req.body;
    const vetId = req.user.id;

    console.log('💊 [PRESCRIPTION] Finalizing prescription...');
    console.log('   📋 Prescription ID:', id);
    console.log('   ✍️  Signature provided:', !!signature);

    // Verificar que la prescription existe y es del veterinario
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        },
        pet: {
          select: {
            id: true,
            nombre: true,
            especie: true,
            raza: true,
            user: {
              select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true
              }
            }
          }
        },
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true,
            telefono: true
          }
        },
        appointment: {
          select: {
            id: true,
            clinic: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                address: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.vetId !== vetId) {
      return res.status(403).json({ error: 'Access denied to this prescription' });
    }

    if (prescription.status === 'FINALIZED') {
      return res.status(400).json({ error: 'Prescription is already finalized' });
    }

    if (prescription.items.length === 0) {
      return res.status(400).json({ error: 'Cannot finalize prescription without medications' });
    }

    // Actualizar diagnosis y notes si se proporcionaron
    if (diagnosis !== undefined || notes !== undefined) {
      await prisma.prescription.update({
        where: { id },
        data: {
          diagnosis: diagnosis !== undefined ? diagnosis : prescription.diagnosis,
          notes: notes !== undefined ? notes : prescription.notes
        }
      });

      // Actualizar el objeto local
      prescription.diagnosis = diagnosis !== undefined ? diagnosis : prescription.diagnosis;
      prescription.notes = notes !== undefined ? notes : prescription.notes;
    }

    // Generar public token ANTES del PDF (para el QR)
    const publicToken = nanoid(16);
    const baseUrl = process.env.APP_BASE_URL || process.env.API_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/public/prescription/${publicToken}`;

    console.log('🔗 [PRESCRIPTION] Generated public token:', publicToken);

    // Generar PDF con firma y token válido
    console.log('📄 [PRESCRIPTION] Generating PDF...');
    const clinic = prescription.appointment?.clinic || null;

    // 🔍 DIAGNÓSTICO CLINIC/LOGO
    console.log('🔍 DEBUG LOGO [Controller]:');
    console.log('   Has appointment?:', !!prescription.appointment);
    console.log('   Has clinic?:', !!clinic);
    if (clinic) {
      console.log('   Clinic ID:', clinic.id);
      console.log('   Clinic Name:', clinic.name);
      console.log('   Clinic logoUrl:', clinic.logoUrl);
      console.log('   logoUrl type:', typeof clinic.logoUrl);
      console.log('   logoUrl value:', JSON.stringify(clinic.logoUrl));
    }

    tempPdfPath = await generatePrescriptionPDF(prescription, prescription.pet, prescription.vet, clinic, signature, shareUrl);

    // Subir PDF a S3
    console.log('☁️ [PRESCRIPTION] Uploading PDF to S3...');
    const pdfS3Key = await uploadPrivateFile(
      tempPdfPath,
      `prescriptions/${prescription.petId}/${id}.pdf`
    );

    // Finalizar prescription
    const finalizedPrescription = await prisma.prescription.update({
      where: { id },
      data: {
        status: 'FINALIZED',
        pdfUrl: pdfS3Key,
        publicToken,
        tokenExpiresAt: null, // Sin expiración por defecto
        finalizedAt: new Date()
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // Limpiar archivo temporal
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }

    console.log('   ✅ Prescription finalized');
    console.log('   🔗 Public token:', publicToken);
    console.log('   🔗 Share URL:', shareUrl);

    res.json({
      prescription: finalizedPrescription,
      publicToken,
      shareUrl
    });
  } catch (error) {
    console.error('❌ [PRESCRIPTION] Finalize error:', error);

    // Limpiar archivo temporal en caso de error
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try {
        fs.unlinkSync(tempPdfPath);
      } catch (cleanupError) {
        console.error('Failed to cleanup temp PDF:', cleanupError);
      }
    }

    res.status(500).json({ error: 'Failed to finalize prescription', details: error.message });
  }
};

/**
 * Actualizar una receta finalizada (regenerar PDF sin cambiar token)
 * PUT /prescriptions/:id
 * Permite editar diagnosis, notes y medicamentos, y regenerar el PDF
 * manteniendo el mismo publicToken para que el magic link siga funcionando
 */
const updatePrescription = async (req, res) => {
  let tempPdfPath = null;

  try {
    const { id } = req.params;
    const { diagnosis, notes, signature } = req.body;
    const vetId = req.user.id;

    console.log('💊 [PRESCRIPTION] Updating prescription...');
    console.log('   📋 Prescription ID:', id);
    console.log('   ✍️  Signature provided:', !!signature);

    // Verificar que la prescription existe y es del veterinario
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        },
        pet: {
          select: {
            id: true,
            nombre: true,
            especie: true,
            raza: true,
            user: {
              select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true
              }
            }
          }
        },
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true,
            telefono: true
          }
        },
        appointment: {
          select: {
            id: true,
            clinic: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                address: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.vetId !== vetId) {
      return res.status(403).json({ error: 'Access denied to this prescription' });
    }

    if (prescription.status !== 'FINALIZED') {
      return res.status(400).json({ error: 'Can only update finalized prescriptions' });
    }

    if (!prescription.publicToken) {
      return res.status(400).json({ error: 'Prescription has no public token' });
    }

    if (prescription.items.length === 0) {
      return res.status(400).json({ error: 'Cannot update prescription without medications' });
    }

    // Actualizar diagnosis y notes si se proporcionaron
    if (diagnosis !== undefined || notes !== undefined) {
      await prisma.prescription.update({
        where: { id },
        data: {
          diagnosis: diagnosis !== undefined ? diagnosis : prescription.diagnosis,
          notes: notes !== undefined ? notes : prescription.notes
        }
      });

      // Actualizar el objeto local
      prescription.diagnosis = diagnosis !== undefined ? diagnosis : prescription.diagnosis;
      prescription.notes = notes !== undefined ? notes : prescription.notes;
    }

    // IMPORTANTE: Mantener el mismo publicToken
    const publicToken = prescription.publicToken;
    const baseUrl = process.env.APP_BASE_URL || process.env.API_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/public/prescription/${publicToken}`;

    console.log('🔗 [PRESCRIPTION] Keeping existing public token:', publicToken);

    // Regenerar PDF con firma actualizada
    console.log('📄 [PRESCRIPTION] Regenerating PDF...');
    const clinic = prescription.appointment?.clinic || null;
    tempPdfPath = await generatePrescriptionPDF(prescription, prescription.pet, prescription.vet, clinic, signature, shareUrl);

    // Subir PDF a S3 (sobrescribir el anterior)
    console.log('☁️ [PRESCRIPTION] Uploading updated PDF to S3...');
    const pdfS3Key = await uploadPrivateFile(
      tempPdfPath,
      `prescriptions/${prescription.petId}/${id}.pdf`
    );

    // Actualizar la URL del PDF (aunque sea la misma key, S3 versiona)
    const updatedPrescription = await prisma.prescription.update({
      where: { id },
      data: {
        pdfUrl: pdfS3Key,
        updatedAt: new Date()
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // Limpiar archivo temporal
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }

    console.log('   ✅ Prescription updated successfully');
    console.log('   🔗 Public token (unchanged):', publicToken);
    console.log('   🔗 Share URL:', shareUrl);

    res.json({
      prescription: updatedPrescription,
      publicToken,
      shareUrl,
      message: 'Prescription updated successfully, magic link remains valid'
    });
  } catch (error) {
    console.error('❌ [PRESCRIPTION] Update error:', error);

    // Limpiar archivo temporal en caso de error
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try {
        fs.unlinkSync(tempPdfPath);
      } catch (cleanupError) {
        console.error('Failed to cleanup temp PDF:', cleanupError);
      }
    }

    res.status(500).json({ error: 'Failed to update prescription', details: error.message });
  }
};

module.exports = {
  createOrGetPrescription,
  addMedication,
  addMedicationsBatch,
  updateMedication,
  removeMedication,
  updatePrescriptionDetails,
  getPrescription,
  finalizePrescription,
  updatePrescription
};
