const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

// Inicializar clientes
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const INDEX_NAME = 'veterinary-index';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Genera un embedding vectorial para el texto dado
 * @param {string} text - Texto a convertir en vector
 * @returns {Promise<number[]>} - Array de números (embedding)
 */
const generateEmbedding = async (text) => {
  try {
    console.log('🧠 [EMBEDDING] Generating embedding...');
    console.log('   📝 Text length:', text.length, 'chars');

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;
    console.log('   ✅ Embedding generated:', embedding.length, 'dimensions');

    return embedding;
  } catch (error) {
    console.error('❌ [EMBEDDING] Error generating embedding:', error);
    throw error;
  }
};

/**
 * Indexa una consulta en Pinecone para búsqueda semántica
 * @param {string} consultationId - ID único de la consulta
 * @param {string} text - Texto completo de la consulta (transcripción + resumen)
 * @param {string} petId - ID de la mascota (para filtrado)
 * @returns {Promise<void>}
 */
const indexConsultation = async (consultationId, text, petId) => {
  try {
    console.log('📊 [PINECONE] Indexing consultation...');
    console.log('   🆔 Consultation ID:', consultationId);
    console.log('   🐾 Pet ID:', petId);

    // Generar embedding del texto
    const embedding = await generateEmbedding(text);

    // Obtener index de Pinecone
    const index = pinecone.index(INDEX_NAME);

    // Upsert en Pinecone con metadata
    await index.upsert([
      {
        id: consultationId,
        values: embedding,
        metadata: {
          petId: petId, // CRÍTICO: Para filtrado de seguridad
        },
      },
    ]);

    console.log('   ✅ Consultation indexed successfully in Pinecone');
  } catch (error) {
    console.error('❌ [PINECONE] Error indexing consultation:', error);
    // No lanzamos error para no bloquear la creación de la consulta
    // Solo logueamos el error
  }
};

/**
 * Busca consultas similares usando búsqueda semántica
 * @param {string} queryText - Texto de búsqueda del usuario
 * @param {string} petId - ID de la mascota (para filtrado de seguridad)
 * @param {number} topK - Número de resultados a retornar (default: 10)
 * @returns {Promise<Array>} - Array de IDs de consultas con sus scores
 */
const searchConsultations = async (queryText, petId, topK = 10) => {
  try {
    console.log('🔍 [PINECONE] Searching consultations...');
    console.log('   🐾 Pet ID:', petId);
    console.log('   📝 Query:', queryText);
    console.log('   🔢 Top K:', topK);

    // Generar embedding de la query
    const queryEmbedding = await generateEmbedding(queryText);

    // Obtener index de Pinecone
    const index = pinecone.index(INDEX_NAME);

    // Buscar en Pinecone con filtro de petId (SEGURIDAD)
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
      filter: {
        petId: { $eq: petId }, // Solo consultas de ESTA mascota
      },
    });

    const matches = queryResponse.matches || [];
    console.log('   ✅ Found', matches.length, 'matches');

    // Retornar IDs con scores
    return matches.map((match) => ({
      consultationId: match.id,
      score: match.score,
      metadata: match.metadata,
    }));
  } catch (error) {
    console.error('❌ [PINECONE] Error searching consultations:', error);
    throw error;
  }
};

/**
 * Elimina una consulta del índice de Pinecone
 * @param {string} consultationId - ID de la consulta a eliminar
 * @returns {Promise<void>}
 */
const deleteConsultationFromIndex = async (consultationId) => {
  try {
    console.log('🗑️ [PINECONE] Deleting consultation from index...');
    console.log('   🆔 Consultation ID:', consultationId);

    const index = pinecone.index(INDEX_NAME);
    await index.deleteOne(consultationId);

    console.log('   ✅ Consultation deleted from Pinecone index');
  } catch (error) {
    console.error('❌ [PINECONE] Error deleting from index:', error);
    // No lanzamos error para no bloquear la eliminación
  }
};

module.exports = {
  generateEmbedding,
  indexConsultation,
  searchConsultations,
  deleteConsultationFromIndex,
};
