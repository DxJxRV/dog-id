const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe audio con word-level timestamps usando Whisper
 * @param {string} audioFilePath - Ruta al archivo de audio local
 * @returns {Promise<{rawText: string, transcriptionJson: Array}>}
 */
const transcribeAudioWithTimestamps = async (audioFilePath) => {
  try {
    console.log('🎤 [OPENAI] Transcribing audio with word-level timestamps...');

    // Transcribir con timestamps de palabra
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: 'whisper-1',
      language: 'es', // Español
      response_format: 'verbose_json', // Necesario para obtener timestamps
      timestamp_granularities: ['word'] // Word-level timestamps
    });

    console.log('✅ [OPENAI] Transcription completed');
    console.log('📝 [OPENAI] Raw text length:', transcription.text.length);
    console.log('🕐 [OPENAI] Words with timestamps:', transcription.words?.length || 0);

    return {
      rawText: transcription.text,
      transcriptionJson: transcription.words || [], // Array de { word, start, end }
      duration: transcription.duration || 0
    };
  } catch (error) {
    console.error('❌ [OPENAI] Transcription error:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
};

/**
 * Analizar transcripción veterinaria con GPT-4
 * @param {string} rawText - Texto transcrito
 * @param {string} petName - Nombre de la mascota
 * @param {string} petSpecies - Especie
 * @returns {Promise<{summary: string, extractedVitals: Object, tags: Array}>}
 */
const analyzeVeterinaryConsultation = async (rawText, petName, petSpecies) => {
  try {
    console.log('🤖 [OPENAI] Analyzing veterinary consultation with GPT-4...');

    const systemPrompt = `Eres un asistente experto en medicina veterinaria. Tu tarea es analizar grabaciones de consultas veterinarias y extraer información clínica estructurada.

Debes generar una respuesta en formato JSON con la siguiente estructura:
{
  "summary": "Resumen clínico detallado de la consulta en español, incluyendo motivo de consulta, hallazgos, diagnóstico presuntivo y plan terapéutico",
  "extractedVitals": {
    "peso": number o null,
    "temperatura": number o null,
    "frecuenciaCardiaca": number o null,
    "frecuenciaRespiratoria": number o null,
    "pulso": string o null,
    "mucosas": string o null,
    "condicionCorporal": number (1-9) o null
  },
  "tags": ["array", "de", "palabras", "clave"] // Máximo 5 tags relevantes como URGENTE, DOLOR, DESHIDRATACION, VACUNACION, etc.
}

Extrae SOLO los signos vitales que se mencionen explícitamente. Si no se mencionan, usa null.
Para los tags, identifica las palabras clave más importantes para búsqueda y filtrado.`;

    const userPrompt = `Paciente: ${petName} (${petSpecies})

Transcripción de la consulta:
${rawText}

Analiza esta consulta veterinaria y proporciona el resumen clínico, signos vitales y tags en formato JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Baja temperatura para mayor precisión
    });

    const analysisResult = JSON.parse(completion.choices[0].message.content);

    console.log('✅ [OPENAI] Analysis completed');
    console.log('📊 [OPENAI] Summary length:', analysisResult.summary?.length || 0);
    console.log('💊 [OPENAI] Vitals extracted:', Object.keys(analysisResult.extractedVitals || {}).length);
    console.log('🏷️ [OPENAI] Tags:', analysisResult.tags);

    return {
      summary: analysisResult.summary || 'No se pudo generar un resumen.',
      extractedVitals: analysisResult.extractedVitals || {},
      tags: analysisResult.tags || []
    };
  } catch (error) {
    console.error('❌ [OPENAI] Analysis error:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
};

/**
 * Procesar audio completo: Transcribir + Analizar
 * @param {string} audioFilePath - Ruta al archivo de audio
 * @param {string} petName - Nombre de la mascota
 * @param {string} petSpecies - Especie
 * @returns {Promise<Object>} Resultado completo
 */
const processVeterinaryAudio = async (audioFilePath, petName, petSpecies) => {
  try {
    console.log('🚀 [OPENAI] Starting complete audio processing...');

    // Paso 1: Transcribir
    const transcriptionResult = await transcribeAudioWithTimestamps(audioFilePath);

    // Paso 2: Analizar
    const analysisResult = await analyzeVeterinaryConsultation(
      transcriptionResult.rawText,
      petName,
      petSpecies
    );

    console.log('✅ [OPENAI] Complete audio processing finished');

    return {
      ...transcriptionResult,
      ...analysisResult
    };
  } catch (error) {
    console.error('❌ [OPENAI] Processing error:', error);
    throw error;
  }
};

module.exports = {
  transcribeAudioWithTimestamps,
  analyzeVeterinaryConsultation,
  processVeterinaryAudio
};
