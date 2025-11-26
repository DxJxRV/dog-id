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
 * Analizar transcripción veterinaria con GPT-4 - Medical Highlights
 * @param {string} rawText - Texto transcrito
 * @param {string} petName - Nombre de la mascota
 * @param {string} petSpecies - Especie
 * @returns {Promise<{medicalHighlights: Array, extractedVitals: Object}>}
 */
const analyzeVeterinaryConsultation = async (rawText, petName, petSpecies) => {
  try {
    console.log('🤖 [OPENAI] Analyzing veterinary consultation with GPT-4...');

    const systemPrompt = `Eres un asistente experto en medicina veterinaria. Tu tarea es analizar grabaciones de consultas veterinarias y extraer MEDICAL HIGHLIGHTS (hallazgos clínicos clave).

Debes generar una respuesta en formato JSON con la siguiente estructura:
{
  "medicalHighlights": [
    {
      "tag": "Título corto del hallazgo (ej: Parvovirus, Temperatura 38°, Cojera pata derecha)",
      "category": "URGENCIA | SINTOMA | DIAGNOSTICO | TRATAMIENTO | VITAL",
      "severity": "HIGH | MEDIUM | LOW",
      "triggerPhrase": "Fragmento literal de texto donde se menciona (5-15 palabras)"
    }
  ],
  "extractedVitals": {
    "peso": number o null,
    "temperatura": number o null,
    "frecuenciaCardiaca": number o null,
    "frecuenciaRespiratoria": number o null,
    "pulso": string o null,
    "mucosas": string o null,
    "condicionCorporal": number (1-9) o null
  }
}

CATEGORÍAS (usa SOLO estas):
- URGENCIA: Condiciones que requieren atención inmediata (envenenamiento, trauma severo, dificultad respiratoria aguda)
- SINTOMA: Signos clínicos observables (fiebre, vómito, diarrea, tos, cojera, letargo)
- DIAGNOSTICO: Enfermedades identificadas (parvovirus, moquillo, insuficiencia renal, diabetes)
- TRATAMIENTO: Medicamentos o procedimientos aplicados (antibióticos, fluidos IV, cirugía)
- VITAL: Signos vitales medidos (peso, temperatura, frecuencia cardíaca, presión)

SEVERIDAD (usa criterio clínico estricto):
- HIGH: Peligro de vida, dolor agudo, enfermedades graves (ej: Parvovirus, Trauma craneal, Insuficiencia renal aguda)
- MEDIUM: Patología clara que requiere tratamiento (ej: Sarna, Gastroenteritis, Otitis severa, Parásitos abundantes)
- LOW: Observaciones menores, hallazgos leves (ej: Ligera pérdida de peso, Cicatrices antiguas, Uñas largas)

INSTRUCCIONES CRÍTICAS:
1. La "triggerPhrase" debe ser el texto EXACTO de la transcripción (respeta mayúsculas, tildes, errores de transcripción).
2. Extrae entre 3-8 highlights (los más relevantes clínicamente).
3. NO inventes información que no esté en la transcripción.
4. Los signos vitales solo si se mencionan explícitamente.
5. Ordena por SEVERIDAD: primero HIGH, luego MEDIUM, al final LOW.`;

    const userPrompt = `Paciente: ${petName} (${petSpecies})

Transcripción de la consulta:
${rawText}

Analiza esta consulta y extrae los Medical Highlights con sus trigger phrases exactas.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Muy baja para precisión en trigger phrases
    });

    const analysisResult = JSON.parse(completion.choices[0].message.content);

    console.log('✅ [OPENAI] Analysis completed');
    console.log('🔍 [OPENAI] Medical Highlights:', analysisResult.medicalHighlights?.length || 0);
    console.log('💊 [OPENAI] Vitals extracted:', Object.keys(analysisResult.extractedVitals || {}).length);

    return {
      medicalHighlights: analysisResult.medicalHighlights || [],
      extractedVitals: analysisResult.extractedVitals || {},
      // Mantener tags legacy para compatibilidad
      tags: analysisResult.medicalHighlights?.map(h => h.category) || []
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
