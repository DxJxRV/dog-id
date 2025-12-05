const prisma = require('../utils/prisma');
const { uploadPrivateFile, deletePrivateImage } = require('../services/s3Service');
const { processVeterinaryAudio } = require('../services/openaiService');
const { indexConsultation, deleteConsultationFromIndex } = require('../services/embeddingService');
const { optimizeAudio, cleanupTempFile } = require('../services/audioProcessingService');
const fs = require('fs');
const path = require('path');

/**
 * Crear una consulta inteligente con transcripción y análisis de IA
 * POST /pets/:petId/smart-consultations
 */
const createSmartConsultation = async (req, res) => {
  let tempFilePath = null;
  let audioOptimization = null;

  try {
    const { petId } = req.params;
    // Si viene appointmentId en body, lo extraemos
    const { appointmentId } = req.body; 
    const vetId = req.user.id;

    // Validar que es un veterinario
    if (req.user.type !== 'vet') {
      return res.status(403).json({ error: 'Only veterinarians can create smart consultations' });
    }

    // Validar que se subió un archivo de audio
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    console.log('🎤 [SMART CONSULTATION] Starting creation process...');
    console.log('📋 [SMART CONSULTATION] Pet ID:', petId);
    console.log('👨‍⚕️ [SMART CONSULTATION] Vet ID:', vetId);
    console.log('🎵 [SMART CONSULTATION] Audio file:', req.file.filename);

    // Verificar que la mascota existe
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: {
        id: true,
        nombre: true,
        especie: true
      }
    });

    if (!pet) {
      // Eliminar archivo temporal
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Pet not found' });
    }

    tempFilePath = req.file.path;

    // Paso 1: Optimizar audio (VAD - Voice Activity Detection)
    console.log('🎵 [SMART CONSULTATION] Optimizing audio (removing silence)...');
    const audioOptimization = await optimizeAudio(tempFilePath);
    console.log('   ✨ Audio optimization complete:');
    console.log('      Original duration:', audioOptimization.originalDuration, 'seconds');
    console.log('      Optimized duration:', audioOptimization.newDuration, 'seconds');
    console.log('      Saved:', audioOptimization.savedSeconds, 'seconds');
    console.log('      Cost savings: ~', Math.round((audioOptimization.savedSeconds / 60) * 0.006 * 100), 'cents');

    // Usar el audio optimizado para el procesamiento
    const audioToProcess = audioOptimization.optimized ? audioOptimization.path : tempFilePath;

    // Paso 2: Procesar el audio con OpenAI (Transcripción + Análisis)
    console.log('🤖 [SMART CONSULTATION] Processing audio with OpenAI...');
    const aiResult = await processVeterinaryAudio(
      audioToProcess,
      pet.nombre,
      pet.especie
    );

    // Paso 2: Subir audio a S3
    console.log('☁️ [SMART CONSULTATION] Uploading audio to S3...');
    const audioS3Key = await uploadPrivateFile(
      tempFilePath,
      `consultations/audio/${petId}/${Date.now()}-${req.file.originalname}`
    );

    // Paso 3: Guardar en base de datos
    console.log('💾 [SMART CONSULTATION] Saving to database...');

    // Verificar si ya existe una consulta para este appointmentId
    let existingConsultation = null;
    if (appointmentId) {
      existingConsultation = await prisma.smartConsultation.findUnique({
        where: { appointmentId }
      });
    }

    let smartConsultation;

    if (existingConsultation) {
      console.log('🔄 [SMART CONSULTATION] Updating existing consultation...');

      // Merge de highlights (agregar nuevos)
      const existingHighlights = existingConsultation.medicalHighlights || [];
      const newHighlights = aiResult.medicalHighlights || [];
      const mergedHighlights = [...existingHighlights, ...newHighlights];

      // Merge de vitals (los nuevos valores sobrescriben)
      const existingVitals = existingConsultation.extractedVitals || {};
      const newVitals = aiResult.extractedVitals || {};
      const mergedVitals = { ...existingVitals, ...newVitals };

      // Concatenar transcripciones
      const mergedRawText = existingConsultation.rawText + '\n\n--- Nueva grabación ---\n\n' + aiResult.rawText;

      smartConsultation = await prisma.smartConsultation.update({
        where: { id: existingConsultation.id },
        data: {
          // Mantener el primer audio URL (o podríamos crear un array)
          // audioUrl: audioS3Key, // No sobreescribir el primer audio
          duration: existingConsultation.duration + Math.round(aiResult.duration || 0),
          rawText: mergedRawText,
          // transcriptionJson: mantener el original
          medicalHighlights: mergedHighlights,
          extractedVitals: mergedVitals,
        },
        include: {
          vet: {
            select: {
              id: true,
              nombre: true,
              cedulaProfesional: true
            }
          }
        }
      });

      console.log('✅ [SMART CONSULTATION] Consultation updated with new recording');
    } else {
      console.log('➕ [SMART CONSULTATION] Creating new consultation...');

      smartConsultation = await prisma.smartConsultation.create({
        data: {
          petId,
          vetId,
          appointmentId: appointmentId || null, // Vincular si existe
          audioUrl: audioS3Key,
          duration: Math.round(aiResult.duration || 0),
          rawText: aiResult.rawText,
          transcriptionJson: aiResult.transcriptionJson,
          medicalHighlights: aiResult.medicalHighlights,
          extractedVitals: aiResult.extractedVitals,
          tags: aiResult.tags, // Legacy
          summary: null // Explicitly set to null (legacy field)
        },
        include: {
          vet: {
            select: {
              id: true,
              nombre: true,
              cedulaProfesional: true
            }
          }
        }
      });

      console.log('✅ [SMART CONSULTATION] New consultation created');
    }

    // Si hay appointmentId, actualizar estado de la cita a IN_PROCESS o COMPLETED
    if (appointmentId) {
      try {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: 'COMPLETED' } // Se asume completada al grabar la consulta
        });
        console.log('✅ [SMART CONSULTATION] Linked appointment marked as COMPLETED');
      } catch (apptError) {
        console.error('⚠️ [SMART CONSULTATION] Failed to update appointment status:', apptError);
      }
    }

    // Paso 4: Crear registros borrador (DRAFT) a partir de las acciones sugeridas
    console.log('📝 [SMART CONSULTATION] Creating draft records from suggested actions...');
    let draftsCreated = 0;
    const createdDraftActions = [];
    if (aiResult.suggestedActions && aiResult.suggestedActions.length > 0) {
      console.log('   📋 Found', aiResult.suggestedActions.length, 'suggested actions');

      for (const action of aiResult.suggestedActions) {
        try {
          if (action.type === 'VACCINE') {
            console.log('   💉 Creating draft vaccine:', action.name);
            const vaccine = await prisma.vaccine.create({
              data: {
                petId,
                vetId,
                nombreVacuna: action.name,
                status: 'DRAFT',
                smartConsultationId: smartConsultation.id,
                ocrStatus: 'pending'
              }
            });
            draftsCreated++;
            createdDraftActions.push({
              type: 'VACCINE',
              id: vaccine.id,
              name: action.name,
              status: 'incomplete'
            });
          } else if (action.type === 'PROCEDURE') {
            console.log('   🏥 Creating draft procedure:', action.name);
            const procedure = await prisma.procedure.create({
              data: {
                petId,
                vetId,
                tipo: action.category || 'otro',
                descripcion: action.description || action.name,
                status: 'DRAFT',
                smartConsultationId: smartConsultation.id,
                fecha: new Date()
              }
            });
            draftsCreated++;
            createdDraftActions.push({
              type: 'PROCEDURE',
              id: procedure.id,
              name: action.description || action.name,
              status: 'incomplete'
            });
          }
        } catch (draftError) {
          console.error('   ⚠️ Failed to create draft record:', draftError);
          // No bloquear la respuesta si falla la creación de un borrador
        }
      }
      console.log('   ✅ Draft records created:', draftsCreated);
    }

    // Paso 4.5: Agregar medicamentos a prescription si hay appointmentId y se detectaron medicamentos
    let prescriptionItems = [];
    if (appointmentId && aiResult.medications && aiResult.medications.length > 0) {
      console.log('💊 [SMART CONSULTATION] Processing medications...');
      console.log('   📋 Found', aiResult.medications.length, 'medications');

      try {
        // Buscar o crear prescription DRAFT para esta cita
        let prescription = await prisma.prescription.findUnique({
          where: { appointmentId },
          include: { items: true }
        });

        if (!prescription) {
          console.log('   ✅ Creating new prescription for appointment');
          prescription = await prisma.prescription.create({
            data: {
              appointmentId,
              petId,
              vetId,
              status: 'DRAFT'
            },
            include: { items: true }
          });
        } else {
          console.log('   ✅ Using existing prescription:', prescription.id);
        }

        // Agregar medicamentos a la prescription
        for (const med of aiResult.medications) {
          try {
            const item = await prisma.prescriptionItem.create({
              data: {
                prescriptionId: prescription.id,
                medication: med.medication,
                dosage: med.dosage,
                frequency: med.frequency,
                duration: med.duration || null,
                instructions: med.instructions || null
              }
            });
            prescriptionItems.push(item);
            console.log('   💊 Added medication:', med.medication);
          } catch (medError) {
            console.error('   ⚠️ Failed to add medication:', medError);
          }
        }

        console.log('   ✅ Medications added:', prescriptionItems.length);
      } catch (prescriptionError) {
        console.error('   ⚠️ Failed to process prescription:', prescriptionError);
        // No bloquear la respuesta si falla la prescription
      }
    }

    // Paso 5: Indexar en Pinecone para búsqueda semántica
    console.log('📊 [SMART CONSULTATION] Indexing in Pinecone...');
    try {
      // Concatenar texto completo: transcripción + highlights para búsqueda semántica
      const textForEmbedding = [
        aiResult.rawText,
        // Agregar tags para mejorar búsqueda
        aiResult.medicalHighlights?.map(h => `${h.tag}: ${h.snippet}`).join('. ') || ''
      ].join('\n\n');

      await indexConsultation(
        smartConsultation.id,
        textForEmbedding,
        petId
      );
    } catch (embeddingError) {
      // No bloquear la respuesta si falla el indexado
      console.error('⚠️ [SMART CONSULTATION] Failed to index in Pinecone:', embeddingError);
    }

    // Limpiar archivo temporal
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // Limpiar archivo de audio optimizado si existe
    if (audioOptimization.optimized && audioOptimization.path !== tempFilePath) {
      cleanupTempFile(audioOptimization.path);
    }

    console.log('✅ [SMART CONSULTATION] Created successfully:', smartConsultation.id);

    res.status(201).json({
      message: 'Smart consultation created successfully',
      consultation: smartConsultation,
      draftsCreated, // Cantidad de borradores creados
      // Datos para LiveConsultationScreen
      vitals: aiResult.extractedVitals || {},
      draftActions: createdDraftActions,
      prescriptionItems: prescriptionItems,
      medicationsDetected: aiResult.medications?.length || 0,
      // Estadísticas de optimización de audio
      optimizationStats: {
        savedSeconds: audioOptimization.savedSeconds,
        originalDuration: audioOptimization.originalDuration,
        finalDuration: audioOptimization.newDuration,
        optimized: audioOptimization.optimized
      }
    });
  } catch (error) {
    console.error('❌ [SMART CONSULTATION] Creation error:', error);

    // Limpiar archivo temporal en caso de error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError);
      }
    }

    // Limpiar archivo de audio optimizado si existe
    if (audioOptimization?.optimized && audioOptimization.path !== tempFilePath) {
      cleanupTempFile(audioOptimization.path);
    }

    res.status(500).json({ error: 'Failed to create smart consultation', details: error.message });
  }
};

/**
 * Obtener todas las consultas inteligentes de una mascota
 * GET /pets/:petId/smart-consultations
 */
const getPetSmartConsultations = async (req, res) => {
  try {
    const { petId } = req.params;

    console.log('📋 [SMART CONSULTATION] Fetching consultations for pet:', petId);
    console.log('👤 [SMART CONSULTATION] User type:', req.user.type);
    console.log('🆔 [SMART CONSULTATION] User ID:', req.user.id);

    // Construir la query de acceso según el tipo de usuario
    let petQuery = {
      id: petId,
    };

    if (req.user.type === 'user') {
      // Si es usuario, verificar que sea owner o co-owner
      petQuery.OR = [
        { userId: req.user.id },
        { coOwners: { some: { userId: req.user.id } } }
      ];
    } else if (req.user.type === 'vet') {
      // Si es vet, verificar que esté vinculado O que haya creado la mascota
      petQuery.OR = [
        { linkedVets: { some: { vetId: req.user.id } } },
        { createdByVetId: req.user.id } // Permitir acceso si el vet creó la mascota
      ];
    }

    console.log('🔍 [SMART CONSULTATION] Pet query:', JSON.stringify(petQuery));

    // Primero verificar si la mascota existe en general
    const petExists = await prisma.pet.findUnique({
      where: { id: petId },
      select: {
        id: true,
        nombre: true,
        userId: true,
        createdByVetId: true,
        linkedVets: {
          select: {
            vetId: true,
            vet: {
              select: { nombre: true }
            }
          }
        }
      }
    });

    console.log('🐕 [SMART CONSULTATION] Pet exists:', !!petExists);
    if (petExists) {
      console.log('📝 [SMART CONSULTATION] Pet info:', {
        id: petExists.id,
        nombre: petExists.nombre,
        ownerId: petExists.userId,
        createdByVetId: petExists.createdByVetId
      });
      console.log('👨‍⚕️ [SMART CONSULTATION] Linked vets:', petExists.linkedVets);
    }

    // Verificar acceso a la mascota
    const pet = await prisma.pet.findFirst({
      where: petQuery
    });

    console.log('✅ [SMART CONSULTATION] Pet access granted:', !!pet);

    if (!pet) {
      console.log('❌ [SMART CONSULTATION] Pet not found or access denied');
      if (petExists) {
        console.log('⚠️ [SMART CONSULTATION] Pet exists but user has no access');
        console.log('💡 [SMART CONSULTATION] Need to link vet to pet first');
      }
      return res.status(404).json({ error: 'Pet not found or access denied' });
    }

    // Obtener consultas
    const consultations = await prisma.smartConsultation.findMany({
      where: { petId },
      include: {
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ [SMART CONSULTATION] Found', consultations.length, 'consultations');

    res.json({ consultations });
  } catch (error) {
    console.error('❌ [SMART CONSULTATION] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch consultations' });
  }
};

/**
 * Obtener una consulta inteligente específica
 * GET /smart-consultations/:id
 */
const getSmartConsultationById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 [SMART CONSULTATION] Fetching consultation:', id);

    const consultation = await prisma.smartConsultation.findUnique({
      where: { id },
      include: {
        pet: {
          select: {
            id: true,
            nombre: true,
            especie: true,
            raza: true,
            fotoUrl: true,
            createdByVetId: true
          }
        },
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true,
            telefono: true
          }
        }
      }
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Verificar acceso
    let hasAccess = false;

    if (req.user.type === 'vet') {
      // Vet tiene acceso si creó la consulta O creó la mascota O está vinculado
      hasAccess = consultation.vetId === req.user.id ||
                  consultation.pet.createdByVetId === req.user.id ||
                  await prisma.vetPetLink.findFirst({
                    where: {
                      vetId: req.user.id,
                      petId: consultation.petId
                    }
                  });
    } else {
      // Usuario tiene acceso si es owner o co-owner
      hasAccess = await prisma.pet.findFirst({
        where: {
          id: consultation.petId,
          OR: [
            { userId: req.user.id },
            { coOwners: { some: { userId: req.user.id } } }
          ]
        }
      });
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('✅ [SMART CONSULTATION] Consultation found');

    res.json({ consultation });
  } catch (error) {
    console.error('❌ [SMART CONSULTATION] Fetch by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch consultation' });
  }
};

/**
 * Eliminar una consulta inteligente
 * DELETE /smart-consultations/:id
 */
const deleteSmartConsultation = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ [SMART CONSULTATION] Deleting consultation:', id);

    // Verificar que existe y que el vet es el dueño
    const consultation = await prisma.smartConsultation.findUnique({
      where: { id }
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    if (req.user.type !== 'vet' || consultation.vetId !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator vet can delete this consultation' });
    }

    // Eliminar el audio de S3 antes de eliminar de la base de datos
    if (consultation.audioUrl) {
      console.log('🗑️ [SMART CONSULTATION] Deleting audio from S3:', consultation.audioUrl);
      try {
        await deletePrivateImage(consultation.audioUrl);
        console.log('✅ [SMART CONSULTATION] Audio deleted from S3');
      } catch (s3Error) {
        console.error('⚠️ [SMART CONSULTATION] Failed to delete audio from S3:', s3Error);
        // Continuar con la eliminación de la base de datos aunque falle S3
      }
    }

    // Eliminar del índice de Pinecone
    console.log('🗑️ [SMART CONSULTATION] Deleting from Pinecone index...');
    try {
      await deleteConsultationFromIndex(id);
    } catch (pineconeError) {
      console.error('⚠️ [SMART CONSULTATION] Failed to delete from Pinecone:', pineconeError);
      // Continuar con la eliminación aunque falle Pinecone
    }

    // Eliminar de la base de datos (esto también elimina tags y highlights por cascade)
    await prisma.smartConsultation.delete({
      where: { id }
    });

    console.log('✅ [SMART CONSULTATION] Deleted successfully (including tags)');

    res.json({ message: 'Consultation deleted successfully' });
  } catch (error) {
    console.error('❌ [SMART CONSULTATION] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete consultation' });
  }
};

/**
 * Búsqueda semántica de consultas
 * GET /pets/:petId/smart-consultations/search
 */
const searchSmartConsultations = async (req, res) => {
  try {
    const { petId } = req.params;
    const { q } = req.query; // Query de búsqueda

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log('🔍 [SMART CONSULTATION] Semantic search...');
    console.log('   🐾 Pet ID:', petId);
    console.log('   📝 Query:', q);
    console.log('   👤 User type:', req.user.type);

    // Verificar acceso a la mascota (igual que en getPetSmartConsultations)
    let petQuery = {
      id: petId,
    };

    if (req.user.type === 'user') {
      petQuery.OR = [
        { userId: req.user.id },
        { coOwners: { some: { userId: req.user.id } } }
      ];
    } else if (req.user.type === 'vet') {
      petQuery.OR = [
        { linkedVets: { some: { vetId: req.user.id } } },
        { createdByVetId: req.user.id }
      ];
    }

    const pet = await prisma.pet.findFirst({
      where: petQuery,
      select: { id: true, nombre: true }
    });

    if (!pet) {
      return res.status(403).json({ error: 'Access denied to this pet' });
    }

    // Búsqueda semántica en Pinecone
    const { searchConsultations } = require('../services/embeddingService');
    const searchResults = await searchConsultations(q, petId, 10);

    console.log('   📊 Pinecone returned', searchResults.length, 'matches');

    if (searchResults.length === 0) {
      return res.json({ consultations: [], query: q });
    }

    // Obtener IDs de las consultas
    const consultationIds = searchResults.map(r => r.consultationId);

    // Buscar consultas completas en MySQL
    const consultations = await prisma.smartConsultation.findMany({
      where: {
        id: { in: consultationIds },
        petId: petId // Seguridad extra
      },
      include: {
        vet: {
          select: {
            id: true,
            nombre: true,
            cedulaProfesional: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Ordenar por score de Pinecone
    const scoreMap = new Map(searchResults.map(r => [r.consultationId, r.score]));
    const sortedConsultations = consultations
      .map(c => ({
        ...c,
        searchScore: scoreMap.get(c.id) || 0
      }))
      .sort((a, b) => b.searchScore - a.searchScore);

    console.log('   ✅ Returning', sortedConsultations.length, 'consultations');

    res.json({
      consultations: sortedConsultations,
      query: q,
      resultsCount: sortedConsultations.length
    });
  } catch (error) {
    console.error('❌ [SMART CONSULTATION] Search error:', error);
    res.status(500).json({ error: 'Failed to search consultations', details: error.message });
  }
};

module.exports = {
  createSmartConsultation,
  getPetSmartConsultations,
  getSmartConsultationById,
  searchSmartConsultations,
  deleteSmartConsultation
};
