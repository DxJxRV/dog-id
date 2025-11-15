const tesseract = require('node-tesseract-ocr');

const ocrConfig = {
  lang: process.env.TESSERACT_LANG || 'spa',
  oem: 1,
  psm: 3,
};

/**
 * Extrae texto de una imagen usando Tesseract OCR
 * @param {string} imagePath - Ruta de la imagen a procesar
 * @returns {Promise<{text: string, success: boolean}>}
 */
async function extractTextFromImage(imagePath) {
  try {
    const text = await tesseract.recognize(imagePath, ocrConfig);
    return {
      text: text.trim(),
      success: true
    };
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      text: '',
      success: false,
      error: error.message
    };
  }
}

/**
 * Intenta extraer información específica de vacuna del texto OCR
 * @param {string} text - Texto extraído por OCR
 * @returns {Object} - Objeto con lote y caducidad si se encuentran
 */
function parseVaccineInfo(text) {
  const result = {
    lote: null,
    caducidad: null
  };

  // Buscar patrón de lote (ej: "Lote: ABC123", "LOTE ABC123", "Lot: 123456")
  const lotePatterns = [
    /lote[\s:]*([A-Z0-9-]+)/i,
    /lot[\s:]*([A-Z0-9-]+)/i,
    /batch[\s:]*([A-Z0-9-]+)/i,
    /no[\s.]*lote[\s:]*([A-Z0-9-]+)/i
  ];

  for (const pattern of lotePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.lote = match[1].trim();
      break;
    }
  }

  // Buscar patrón de fecha de caducidad
  // Formatos: DD/MM/YYYY, DD-MM-YYYY, MM/YYYY, etc.
  const datePatterns = [
    /(?:exp|caducidad|venc|expiry|expires?)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:exp|caducidad|venc|expiry|expires?)[\s:]*(\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.caducidad = parseDate(match[1]);
      break;
    }
  }

  return result;
}

/**
 * Convierte string de fecha a formato ISO
 * @param {string} dateStr - String de fecha en varios formatos
 * @returns {string|null} - Fecha en formato ISO o null
 */
function parseDate(dateStr) {
  try {
    // Intentar diferentes formatos
    const formats = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, // DD/MM/YYYY o MM/DD/YYYY
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/, // DD/MM/YY o MM/DD/YY
      /(\d{1,2})[\/\-](\d{4})/ // MM/YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (match[3]) {
          // Tiene día, mes y año
          let year = match[3];
          if (year.length === 2) {
            year = '20' + year;
          }
          // Asumimos formato DD/MM/YYYY (común en Latinoamérica)
          const date = new Date(`${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } else {
          // Solo mes y año
          const year = match[2];
          const date = new Date(`${year}-${match[1].padStart(2, '0')}-01`);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
      }
    }
  } catch (error) {
    console.error('Date parsing error:', error);
  }
  return null;
}

module.exports = {
  extractTextFromImage,
  parseVaccineInfo
};
