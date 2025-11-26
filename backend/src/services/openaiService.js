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

    const systemPrompt = `Eres un asistente experto en medicina veterinaria. Tu tarea es analizar grabaciones de consultas veterinarias y extraer MEDICAL HIGHLIGHTS (hallazgos clínicos clave) y SUGGESTED ACTIONS (acciones que deben registrarse en el historial).

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
  },
  "suggested_actions": [
    {
      "type": "VACCINE | PROCEDURE",
      "name": "Nombre de la vacuna o procedimiento",
      "description": "Por qué se sugiere registrar esta acción",
      "category": "string (opcional, solo para PROCEDURE: desparasitación, limpieza dental, cirugía, chequeo general, radiografía, otro)"
    }
  ]
}

CATEGORÍAS MEDICAL HIGHLIGHTS (usa SOLO estas):
- URGENCIA: Condiciones que requieren atención inmediata (envenenamiento, trauma severo, dificultad respiratoria aguda)
- SINTOMA: Signos clínicos observables (fiebre, vómito, diarrea, tos, cojera, letargo)
- DIAGNOSTICO: Enfermedades identificadas (parvovirus, moquillo, insuficiencia renal, diabetes)
- TRATAMIENTO: Medicamentos o procedimientos aplicados (antibióticos, fluidos IV, cirugía)
- VITAL: Signos vitales medidos (peso, temperatura, frecuencia cardíaca, presión)

SEVERIDAD (usa criterio clínico estricto):
- HIGH: Peligro de vida, dolor agudo, enfermedades graves (ej: Parvovirus, Trauma craneal, Insuficiencia renal aguda)
- MEDIUM: Patología clara que requiere tratamiento (ej: Sarna, Gastroenteritis, Otitis severa, Parásitos abundantes)
- LOW: Observaciones menores, hallazgos leves (ej: Ligera pérdida de peso, Cicatrices antiguas, Uñas largas)

SUGGESTED ACTIONS - CUÁNDO SUGERIR:
- VACCINE: Si se menciona que se aplicó una vacuna (ej: "Le puse la vacuna de rabia", "Se le aplicó la triple felina")
- PROCEDURE: Si se realizó algún procedimiento médico que debe registrarse (ej: "Le hice una desparasitación", "Se realizó limpieza dental", "Tomé una radiografía", "Le corté las uñas")

INSTRUCCIONES CRÍTICAS:
1. La "triggerPhrase" debe ser el texto EXACTO de la transcripción (respeta mayúsculas, tildes, errores de transcripción).
2. Extrae entre 3-8 highlights (los más relevantes clínicamente).
3. Solo sugiere acciones si se mencionan EXPLÍCITAMENTE en la consulta.
4. NO inventes información que no esté en la transcripción.
5. Los signos vitales solo si se mencionan explícitamente.
6. Ordena highlights por SEVERIDAD: primero HIGH, luego MEDIUM, al final LOW.`;

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
    console.log('📋 [OPENAI] Suggested Actions:', analysisResult.suggested_actions?.length || 0);

    return {
      medicalHighlights: analysisResult.medicalHighlights || [],
      extractedVitals: analysisResult.extractedVitals || {},
      suggestedActions: analysisResult.suggested_actions || [],
      // Mantener tags legacy para compatibilidad
      tags: analysisResult.medicalHighlights?.map(h => h.category) || []
    };
  } catch (error) {
    console.error('❌ [OPENAI] Analysis error:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
};

/**
 * Encuentra el timestamp de una frase en la transcripción
 * @param {string} phrase - Frase a buscar
 * @param {string} rawText - Texto completo
 * @param {Array} transcriptionJson - Array de palabras con timestamps
 * @returns {number|null} - Timestamp en segundos o null si no se encuentra
 */
const findPhraseTimestamp = (phrase, rawText, transcriptionJson) => {
  try {
    // Normalizar textos
    const normalizedPhrase = phrase.toLowerCase().trim();
    const normalizedText = rawText.toLowerCase();

    // Encontrar índice de la frase en el texto
    const phraseIndex = normalizedText.indexOf(normalizedPhrase);
    if (phraseIndex === -1) {
      console.warn('⚠️ Phrase not found in text:', phrase);
      return null;
    }

    // Contar caracteres hasta llegar a la posición de la frase
    let charCount = 0;
    for (let i = 0; i < transcriptionJson.length; i++) {
      const word = transcriptionJson[i];

      // Cuando llegamos cerca de la posición, retornar el timestamp
      if (charCount >= phraseIndex) {
        return word.start;
      }

      charCount += word.word.length + 1; // +1 por el espacio
    }

    return null;
  } catch (error) {
    console.error('❌ Error finding phrase timestamp:', error);
    return null;
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

    // Paso 3: Agregar timestamps a los highlights
    console.log('🕐 [OPENAI] Adding timestamps to highlights...');
    const highlightsWithTimestamps = analysisResult.medicalHighlights.map(highlight => {
      const timestamp = findPhraseTimestamp(
        highlight.triggerPhrase,
        transcriptionResult.rawText,
        transcriptionResult.transcriptionJson
      );

      return {
        ...highlight,
        timestamp: timestamp !== null ? timestamp : 0, // Default a 0 si no se encuentra
        snippet: highlight.triggerPhrase // Alias para el frontend
      };
    });

    console.log('✅ [OPENAI] Complete audio processing finished');

    return {
      ...transcriptionResult,
      ...analysisResult,
      medicalHighlights: highlightsWithTimestamps
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
